from typing import List, Dict, Any, Optional
import logging
import json
import uuid
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class VectorConversationStore:
    """Store and retrieve conversation history using embeddings in pgvector"""
    
    def __init__(self, embedding_service, fallback_path: str = "./data/conversations.jsonl"):
        self.embedding_service = embedding_service
        self.fallback_path = Path(fallback_path)

    def _fallback_scope_matches(
        self,
        item: Dict[str, Any],
        *,
        user_id: str,
        conversation_id: str,
        tenant_id: Optional[str] = None
    ) -> bool:
        return (
            item.get("user_id") == user_id
            and item.get("conversation_id") == conversation_id
            and (not tenant_id or item.get("tenant_id") == tenant_id)
        )

    def _save_fallback_message(
        self,
        *,
        user_id: str,
        conversation_id: str,
        tenant_id: Optional[str],
        message: Dict[str, Any],
        timestamp: str
    ) -> bool:
        try:
            self.fallback_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "tenant_id": tenant_id or "",
                "conversation_id": conversation_id,
                "role": message.get("role"),
                "content": message.get("content", ""),
                "tool_calls": message.get("tool_calls") or [],
                "sources": message.get("sources") or [],
                "timestamp": timestamp,
            }
            with self.fallback_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
            return True
        except Exception as exc:
            logger.error("Failed to save fallback conversation message: %s", exc)
            return False

    def _load_fallback_conversation(
        self,
        *,
        user_id: str,
        conversation_id: str,
        tenant_id: Optional[str] = None,
        limit: Optional[int] = 50
    ) -> List[Dict[str, Any]]:
        if not self.fallback_path.exists():
            return []

        messages: List[Dict[str, Any]] = []
        try:
            with self.fallback_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    if not line.strip():
                        continue
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if not self._fallback_scope_matches(
                        item,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        tenant_id=tenant_id
                    ):
                        continue
                    messages.append({
                        "role": item.get("role"),
                        "content": item.get("content"),
                        "tool_calls": item.get("tool_calls") or [],
                        "sources": item.get("sources") or [],
                        "timestamp": item.get("timestamp"),
                    })
        except Exception as exc:
            logger.error("Failed to load fallback conversation history: %s", exc)
            return []

        messages.sort(key=lambda x: x.get("timestamp", ""))
        return messages[-limit:] if limit else messages
    
    async def save_message(
        self,
        user_id: str,
        message: Dict[str, Any],
        conversation_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> bool:
        """Save a message with embeddings to vector database"""
        conv_id = conversation_id or "default"
        timestamp = datetime.utcnow().isoformat()
        fallback_saved = self._save_fallback_message(
            user_id=user_id,
            tenant_id=tenant_id,
            conversation_id=conv_id,
            message=message,
            timestamp=timestamp
        )
        try:
            # Create metadata for the conversation message
            metadata = {
                "user_id": user_id,
                "tenant_id": tenant_id or "",
                "conversation_id": conv_id,
                "role": message.get("role"),
                "timestamp": timestamp,
                "tool_calls": json.dumps(message.get("tool_calls", [])),
                "sources": json.dumps(message.get("sources", []))
            }
            
            # Generate embedding for the message content (sync call)
            embedding = self.embedding_service.generate_embedding(message["content"])
            
            # Store in pgvector with entity_type = 'conversation'
            # Use a proper UUID for entity_id
            entity_id = str(uuid.uuid4())
            
            await self.embedding_service.store_embedding(
                entity_id=entity_id,
                entity_type="conversation",
                content=message["content"],
                embedding=embedding,
                metadata=metadata,
                tenant_id=tenant_id
            )
            
            logger.info(f"Saved conversation message for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save vector conversation message: {str(e)}")
            return fallback_saved
    
    async def get_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        limit: Optional[int] = 50,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get conversation history using vector database query"""
        try:
            conv_id = conversation_id or "default"
            fallback_messages = self._load_fallback_conversation(
                user_id=user_id,
                conversation_id=conv_id,
                tenant_id=tenant_id,
                limit=limit
            )
            
            # Get embeddings for this conversation
            # Note: This requires adding metadata filter support to semantic_search
            # For now, we'll do a broad search and filter
            results = await self.embedding_service.get_embeddings_by_metadata(
                entity_type="conversation",
                metadata_filters={"user_id": user_id, "conversation_id": conv_id},
                limit=limit,
                tenant_id=tenant_id
            )
            
            # Convert results to message format
            messages = []
            for result in results:
                metadata = result.get("metadata", {})
                messages.append({
                    "role": metadata.get("role"),
                    "content": result.get("content"),
                    "tool_calls": json.loads(metadata.get("tool_calls", "[]")),
                    "sources": json.loads(metadata.get("sources", "[]")),
                    "timestamp": metadata.get("timestamp")
                })
            
            # Sort by timestamp
            messages.sort(key=lambda x: x.get("timestamp", ""))

            # The JSONL fallback is the canonical chat-history source because
            # vector writes can fail independently of normal conversation UX.
            if fallback_messages:
                return fallback_messages
            return messages[-limit:] if limit else messages
            
        except Exception as e:
            logger.error(f"Failed to get conversation: {str(e)}")
            return []
    
    async def search_similar_conversations(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 5,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Semantic search across past conversations"""
        try:
            # Search for similar conversation messages
            results = await self.embedding_service.semantic_search(
                query=query,
                entity_type="conversation",
                limit=limit,
                tenant_id=tenant_id
            )
            
            # Filter by user_id if provided
            if user_id:
                results = [r for r in results if r.get("metadata", {}).get("user_id") == user_id]
            if tenant_id:
                results = [r for r in results if r.get("metadata", {}).get("tenant_id") == tenant_id]
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search conversations: {str(e)}")
            return []
    
    async def clear_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> bool:
        """Clear conversation history for a user and conversation."""
        try:
            conv_id = conversation_id or "default"
            deleted_count = await self.embedding_service.delete_embeddings_by_metadata(
                entity_type="conversation",
                metadata_filters={"user_id": user_id, "conversation_id": conv_id},
                tenant_id=tenant_id
            )
            self._remove_fallback_conversation(
                user_id=user_id,
                conversation_id=conv_id,
                tenant_id=tenant_id
            )
            logger.info(
                "Cleared %s conversation messages for user %s, conversation %s",
                deleted_count,
                user_id,
                conv_id
            )
            return True
        except Exception as e:
            logger.error(f"Failed to clear conversation: {str(e)}")
            return False

    def _remove_fallback_conversation(
        self,
        *,
        user_id: str,
        conversation_id: str,
        tenant_id: Optional[str] = None
    ) -> None:
        if not self.fallback_path.exists():
            return

        try:
            retained: List[str] = []
            with self.fallback_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        retained.append(line)
                        continue
                    if not self._fallback_scope_matches(
                        item,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        tenant_id=tenant_id
                    ):
                        retained.append(line)
            with self.fallback_path.open("w", encoding="utf-8") as handle:
                handle.writelines(retained)
        except Exception as exc:
            logger.error("Failed to clear fallback conversation history: %s", exc)

    async def list_conversations(
        self,
        user_id: str,
        tenant_id: Optional[str] = None
    ) -> List[str]:
        """List conversation ids that belong to the authenticated user."""
        try:
            vector_conversations = await self.embedding_service.list_metadata_values(
                entity_type="conversation",
                value_key="conversation_id",
                metadata_filters={"user_id": user_id},
                tenant_id=tenant_id
            )
            fallback_conversations = self._list_fallback_conversations(user_id=user_id, tenant_id=tenant_id)
            return sorted(set(vector_conversations) | set(fallback_conversations))
        except Exception as e:
            logger.error(f"Failed to list conversations: {str(e)}")
            return self._list_fallback_conversations(user_id=user_id, tenant_id=tenant_id)

    def _list_fallback_conversations(
        self,
        *,
        user_id: str,
        tenant_id: Optional[str] = None
    ) -> List[str]:
        if not self.fallback_path.exists():
            return []

        conversation_ids = set()
        try:
            with self.fallback_path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    try:
                        item = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if item.get("user_id") != user_id:
                        continue
                    if tenant_id and item.get("tenant_id") != tenant_id:
                        continue
                    conversation_id = item.get("conversation_id")
                    if conversation_id:
                        conversation_ids.add(conversation_id)
        except Exception as exc:
            logger.error("Failed to list fallback conversations: %s", exc)
        return sorted(conversation_ids)
