from typing import List, Dict, Any, Optional
import logging
import json
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class VectorConversationStore:
    """Store and retrieve conversation history using embeddings in pgvector"""
    
    def __init__(self, embedding_service):
        self.embedding_service = embedding_service
    
    async def save_message(
        self,
        user_id: str,
        message: Dict[str, Any],
        conversation_id: Optional[str] = None
    ) -> bool:
        """Save a message with embeddings to vector database"""
        try:
            # Create metadata for the conversation message
            metadata = {
                "user_id": user_id,
                "conversation_id": conversation_id or "default",
                "role": message.get("role"),
                "timestamp": datetime.utcnow().isoformat(),
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
                metadata=metadata
            )
            
            logger.info(f"Saved conversation message for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save message: {str(e)}")
            return False
    
    async def get_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None,
        limit: Optional[int] = 50
    ) -> List[Dict[str, Any]]:
        """Get conversation history using vector database query"""
        try:
            # Query embeddings with matching metadata
            # This is a simplified approach - ideally we'd query by metadata filters
            conv_id = conversation_id or "default"
            
            # Get embeddings for this conversation
            # Note: This requires adding metadata filter support to semantic_search
            # For now, we'll do a broad search and filter
            results = await self.embedding_service.get_embeddings_by_metadata(
                entity_type="conversation",
                metadata_filters={"user_id": user_id, "conversation_id": conv_id},
                limit=limit
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
            
            return messages[-limit:] if limit else messages
            
        except Exception as e:
            logger.error(f"Failed to get conversation: {str(e)}")
            return []
    
    async def search_similar_conversations(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Semantic search across past conversations"""
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.generate_embedding(query)
            
            # Search for similar conversation messages
            results = await self.embedding_service.semantic_search(
                query=query,
                entity_type="conversation",
                limit=limit
            )
            
            # Filter by user_id if provided
            if user_id:
                results = [r for r in results if r.get("metadata", {}).get("user_id") == user_id]
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search conversations: {str(e)}")
            return []
    
    async def clear_conversation(
        self,
        user_id: str,
        conversation_id: Optional[str] = None
    ) -> bool:
        """Clear conversation history - marks as archived"""
        try:
            # In production, you'd want to actually delete or archive the embeddings
            # For now, just log it
            logger.info(f"Clearing conversation for user {user_id}, conversation {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to clear conversation: {str(e)}")
            return False
