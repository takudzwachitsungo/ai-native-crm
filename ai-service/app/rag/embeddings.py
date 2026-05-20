from sentence_transformers import SentenceTransformer
import psycopg2
import numpy as np
from typing import List, Dict, Any, Optional
import logging
import json
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing embeddings for RAG"""
    
    def __init__(self, crm_client):
        self.crm_client = crm_client
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.db_url = settings.DATABASE_URL
        
        logger.info(f"Initialized embedding service with model: {settings.EMBEDDING_MODEL}")
    
    def _get_db_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_url)
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding
    
    async def generate_entity_embedding(
        self,
        entity_type: str,
        entity_id: str,
        tenant_id: Optional[str] = None
    ):
        """
        Generate and store embedding for a CRM entity
        
        Args:
            entity_type: Type of entity (lead, deal, contact)
            entity_id: UUID of the entity
        """
        logger.info(f"Generating embedding for {entity_type} {entity_id}")
        
        try:
            # Fetch entity data
            if entity_type == "lead":
                entity = await self.crm_client.get_lead(entity_id)
            elif entity_type == "deal":
                entity = await self.crm_client.get_deal(entity_id)
            elif entity_type == "contact":
                entity = await self.crm_client.get_contact(entity_id)
            else:
                raise ValueError(f"Unknown entity type: {entity_type}")
            
            # Build text representation
            text = self._build_entity_text(entity_type, entity)
            
            # Generate embedding
            embedding = self.generate_embedding(text)
            
            # Store in database
            self._store_embedding(
                entity_type=entity_type,
                entity_id=entity_id,
                embedding=embedding,
                content=text,
                metadata={"entity": entity},
                tenant_id=tenant_id
            )
            
            logger.info(f"Successfully generated embedding for {entity_type} {entity_id}")
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    def _build_entity_text(self, entity_type: str, entity: Dict[str, Any]) -> str:
        """Build searchable text representation of entity"""
        
        if entity_type == "lead":
            parts = [
                f"Lead: {entity.get('firstName', '')} {entity.get('lastName', '')}",
                f"Email: {entity.get('email', '')}",
                f"Company: {entity.get('company', '')}",
                f"Title: {entity.get('title', '')}",
                f"Status: {entity.get('status', '')}",
                f"Source: {entity.get('source', '')}",
                f"Notes: {entity.get('notes', '')}"
            ]
        
        elif entity_type == "deal":
            parts = [
                f"Deal: {entity.get('name', '')}",
                f"Stage: {entity.get('stage', '')}",
                f"Value: ${entity.get('value', 0)}",
                f"Probability: {entity.get('probability', 0)}%",
                f"Description: {entity.get('description', '')}"
            ]
        
        elif entity_type == "contact":
            parts = [
                f"Contact: {entity.get('firstName', '')} {entity.get('lastName', '')}",
                f"Email: {entity.get('email', '')}",
                f"Phone: {entity.get('phone', '')}",
                f"Company: {entity.get('company', '')}",
                f"Title: {entity.get('title', '')}"
            ]
        
        else:
            parts = [str(entity)]
        
        return " | ".join(parts)
    
    def _delete_entity_embeddings(self, entity_type: str, entity_id: str, tenant_id: str) -> None:
        conn = self._get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM embeddings
                    WHERE entity_type = %s
                      AND entity_id = %s::uuid
                      AND tenant_id = %s::uuid
                    """,
                    (entity_type, entity_id, tenant_id),
                )
            conn.commit()
        finally:
            conn.close()

    def _store_embedding(
        self,
        entity_type: str,
        entity_id: str,
        embedding: np.ndarray,
        content: str,
        metadata: Dict[str, Any],
        tenant_id: Optional[str] = None,
        replace_existing: bool = True,
    ):
        """Store embedding in database"""
        
        conn = self._get_db_connection()
        try:
            with conn.cursor() as cur:
                # Convert embedding to list for pgvector
                embedding_list = embedding.tolist()

                resolved_tenant_id = tenant_id
                if not resolved_tenant_id:
                    raise ValueError("tenant_id is required to store embeddings")
                
                if replace_existing:
                    # Keep indexing idempotent even when the database only has a non-unique index.
                    cur.execute(
                        """
                        DELETE FROM embeddings
                        WHERE entity_type = %s
                          AND entity_id = %s::uuid
                          AND tenant_id = %s::uuid
                        """,
                        (entity_type, entity_id, resolved_tenant_id),
                    )
                cur.execute(
                    """
                    INSERT INTO embeddings (entity_type, entity_id, content, embedding, metadata, tenant_id)
                    VALUES (%s, %s::uuid, %s, %s, %s, %s::uuid)
                    """,
                    (entity_type, entity_id, content, embedding_list, json.dumps(metadata), resolved_tenant_id),
                )
                
            conn.commit()
            
        finally:
            conn.close()
    
    async def semantic_search(
        self,
        query: str,
        entity_type: str,
        limit: int = 5,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search using embeddings
        
        Args:
            query: Search query
            entity_type: Type of entity to search (lead, deal, contact)
            limit: Maximum results
        """
        logger.info(f"Semantic search: {query} in {entity_type}")
        
        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query)
            
            # Search database
            conn = self._get_db_connection()
            try:
                with conn.cursor() as cur:
                    tenant_clause = "AND tenant_id = %s::uuid" if tenant_id else ""
                    type_clause = "" if entity_type in {"all", "*"} else "AND entity_type = %s"
                    params = [
                        query_embedding.tolist(),
                        query_embedding.tolist(),
                        settings.SIMILARITY_THRESHOLD,
                    ]
                    if entity_type not in {"all", "*"}:
                        params.append(entity_type)
                    if tenant_id:
                        params.append(tenant_id)
                    params.extend([query_embedding.tolist(), limit])

                    cur.execute(f"""
                        SELECT 
                            entity_id,
                            entity_type,
                            content,
                            metadata,
                            1 - (embedding <=> %s::vector) AS similarity
                        FROM embeddings
                        WHERE 1 - (embedding <=> %s::vector) > %s
                          {type_clause}
                          {tenant_clause}
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """, params)
                    
                    results = []
                    for row in cur.fetchall():
                        metadata = row[3] or {}
                        similarity = float(row[4])
                        results.append({
                            "entity_id": row[0],
                            "entity_type": row[1],
                            "content": row[2],
                            "metadata": metadata,
                            "similarity": similarity,
                            "score": round(similarity + self._ranking_boost(metadata), 6),
                        })
                    
                    results.sort(key=lambda item: item.get("score", item.get("similarity", 0)), reverse=True)
                    logger.info(f"Found {len(results)} similar {entity_type}s")
                    return results[:limit]
                    
            finally:
                conn.close()
                
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            return []

    async def index_knowledge_domains(
        self,
        domains: List[str],
        *,
        tenant_id: str,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Index richer CRM knowledge domains for semantic retrieval."""
        supported_fetchers = {
            "documents": self.crm_client.search_documents,
            "emails": self.crm_client.search_emails,
            "cases": self.crm_client.search_cases,
            "tasks": self.crm_client.search_tasks,
            "leads": self.crm_client.search_leads,
            "deals": self.crm_client.search_deals,
            "contacts": self.crm_client.search_contacts,
        }
        requested_domains = domains or ["documents", "emails", "cases", "tasks"]
        indexed: Dict[str, int] = {}
        skipped: Dict[str, int] = {}
        errors: Dict[str, str] = {}

        for domain in requested_domains:
            fetcher = supported_fetchers.get(domain)
            if not fetcher:
                errors[domain] = "Unsupported RAG indexing domain"
                continue
            try:
                records = await fetcher(size=limit)
                indexed[domain] = 0
                skipped[domain] = 0
                for record in records:
                    entity_id = record.get("id")
                    if not entity_id:
                        skipped[domain] += 1
                        continue
                    entity_type = self._domain_to_entity_type(domain)
                    content = self._build_knowledge_text(domain, record)
                    if not content.strip():
                        skipped[domain] += 1
                        continue
                    chunks = self._chunk_text(content)
                    self._delete_entity_embeddings(entity_type, str(entity_id), tenant_id)
                    for chunk_index, chunk in enumerate(chunks):
                        embedding = self.generate_embedding(chunk)
                        self._store_embedding(
                            entity_type=entity_type,
                            entity_id=str(entity_id),
                            embedding=embedding,
                            content=chunk,
                            metadata={
                                "source": "rag_auto_index",
                                "domain": domain,
                                "entity": record,
                                "chunk_index": chunk_index,
                                "chunk_count": len(chunks),
                                "chunking": {
                                    "max_chars": settings.RAG_CHUNK_MAX_CHARS,
                                    "overlap_chars": settings.RAG_CHUNK_OVERLAP_CHARS,
                                },
                                "ranking": {
                                    "recency_weight": settings.RAG_RECENCY_WEIGHT,
                                },
                            },
                            tenant_id=tenant_id,
                            replace_existing=False,
                        )
                    indexed[domain] += 1
            except Exception as exc:
                logger.error("Error indexing RAG domain %s: %s", domain, exc)
                errors[domain] = str(exc)

        return {
            "indexed": indexed,
            "skipped": skipped,
            "errors": errors,
            "total_indexed": sum(indexed.values()),
            "domains": requested_domains,
        }

    @staticmethod
    def _domain_to_entity_type(domain: str) -> str:
        return {
            "documents": "document",
            "emails": "email",
            "cases": "case",
            "tasks": "task",
            "leads": "lead",
            "deals": "deal",
            "contacts": "contact",
        }.get(domain, domain.rstrip("s"))

    def _build_knowledge_text(self, domain: str, record: Dict[str, Any]) -> str:
        if domain == "documents":
            parts = [
                f"Document: {self._value(record, 'title', 'name', 'fileName', 'originalFilename')}",
                f"Type: {self._value(record, 'type', 'documentType', 'contentType')}",
                f"Description: {self._value(record, 'description', 'summary')}",
                f"Tags: {self._value(record, 'tags')}",
            ]
        elif domain == "emails":
            parts = [
                f"Email subject: {self._value(record, 'subject')}",
                f"From: {self._value(record, 'fromEmail', 'from')}",
                f"To: {self._value(record, 'toEmail', 'to')}",
                f"Body: {self._value(record, 'body', 'preview', 'snippet')}",
            ]
        elif domain == "cases":
            parts = [
                f"Support case: {self._value(record, 'subject', 'title', 'caseNumber')}",
                f"Status: {self._value(record, 'status')}",
                f"Priority: {self._value(record, 'priority')}",
                f"Description: {self._value(record, 'description')}",
                f"Resolution: {self._value(record, 'resolution')}",
            ]
        elif domain == "tasks":
            parts = [
                f"Task: {self._value(record, 'title', 'subject')}",
                f"Status: {self._value(record, 'status')}",
                f"Priority: {self._value(record, 'priority')}",
                f"Description: {self._value(record, 'description')}",
                f"Due: {self._value(record, 'dueDate', 'due_date')}",
            ]
        else:
            return self._build_entity_text(self._domain_to_entity_type(domain), record)

        return " | ".join(part for part in parts if part and not part.endswith(": "))

    def _chunk_text(self, text: str) -> List[str]:
        clean = " ".join(str(text or "").split())
        if not clean:
            return []
        max_chars = max(settings.RAG_CHUNK_MAX_CHARS, 500)
        overlap = min(max(settings.RAG_CHUNK_OVERLAP_CHARS, 0), max_chars // 2)
        if len(clean) <= max_chars:
            return [clean]
        chunks: List[str] = []
        start = 0
        while start < len(clean):
            end = min(len(clean), start + max_chars)
            if end < len(clean):
                boundary = clean.rfind(" ", start + max_chars // 2, end)
                if boundary > start:
                    end = boundary
            chunks.append(clean[start:end].strip())
            if end >= len(clean):
                break
            start = max(0, end - overlap)
        return [chunk for chunk in chunks if chunk]

    def _ranking_boost(self, metadata: Dict[str, Any]) -> float:
        entity = metadata.get("entity") if isinstance(metadata, dict) else {}
        if not isinstance(entity, dict):
            return 0.0
        candidate = self._value(entity, "updatedAt", "createdAt", "sentAt", "dueDate", "expectedCloseDate")
        if not candidate:
            return 0.0
        try:
            parsed = datetime.fromisoformat(str(candidate).replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            age_days = max((datetime.utcnow() - parsed).days, 0)
            return max(settings.RAG_RECENCY_WEIGHT, 0.0) / (1 + age_days / 30)
        except Exception:
            return 0.0

    @staticmethod
    def _value(record: Dict[str, Any], *keys: str) -> str:
        for key in keys:
            value = record.get(key)
            if value is None:
                continue
            if isinstance(value, (dict, list)):
                return json.dumps(value, default=str)
            return str(value)
        return ""

    async def count_embeddings_by_type(self, tenant_id: Optional[str] = None) -> Dict[str, int]:
        try:
            conn = self._get_db_connection()
            try:
                with conn.cursor() as cur:
                    tenant_clause = "WHERE tenant_id = %s::uuid" if tenant_id else ""
                    params = [tenant_id] if tenant_id else []
                    cur.execute(
                        f"""
                        SELECT entity_type, COUNT(*)
                        FROM embeddings
                        {tenant_clause}
                        GROUP BY entity_type
                        ORDER BY entity_type
                        """,
                        params,
                    )
                    return {row[0]: int(row[1]) for row in cur.fetchall()}
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error counting embeddings by type: {str(e)}")
            return {}
    
    async def store_embedding(
        self,
        entity_id: str,
        entity_type: str,
        content: str,
        embedding: np.ndarray,
        metadata: Dict[str, Any],
        tenant_id: Optional[str] = None
    ):
        """Store embedding in database with metadata"""
        self._store_embedding(entity_type, entity_id, embedding, content, metadata, tenant_id)
    
    async def get_embeddings_by_metadata(
        self,
        entity_type: str,
        metadata_filters: Dict[str, Any],
        limit: int = 50,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get embeddings filtered by metadata (for conversation retrieval)"""
        try:
            conn = self._get_db_connection()
            try:
                with conn.cursor() as cur:
                    # Build metadata filter query
                    # For simplicity, we'll match exact JSON fields
                    filter_conditions = []
                    params = [entity_type]
                    tenant_clause = ""
                    if tenant_id:
                        tenant_clause = "AND tenant_id = %s::uuid"
                        params.append(tenant_id)
                    
                    for key, value in metadata_filters.items():
                        filter_conditions.append(f"metadata->>%s = %s")
                        params.extend([key, str(value)])
                    
                    where_clause = " AND ".join(filter_conditions) if filter_conditions else "TRUE"
                    
                    query = f"""
                        SELECT entity_id, entity_type, content, metadata, created_at
                        FROM embeddings
                        WHERE entity_type = %s
                          {tenant_clause}
                          AND {where_clause}
                        ORDER BY created_at DESC
                        LIMIT %s
                    """
                    params.append(limit)
                    
                    cur.execute(query, params)
                    
                    results = []
                    for row in cur.fetchall():
                        results.append({
                            "entity_id": row[0],
                            "entity_type": row[1],
                            "content": row[2],
                            "metadata": json.loads(row[3]) if isinstance(row[3], str) else row[3],
                            "timestamp": row[4].isoformat() if row[4] else None
                        })
                    
                    return results
                    
            finally:
                conn.close()
                
        except Exception as e:
            logger.error(f"Error getting embeddings by metadata: {str(e)}")
            return []

    async def delete_embeddings_by_metadata(
        self,
        entity_type: str,
        metadata_filters: Dict[str, Any],
        tenant_id: Optional[str] = None
    ) -> int:
        """Delete embeddings that match metadata filters and optional tenant scope."""
        try:
            conn = self._get_db_connection()
            try:
                with conn.cursor() as cur:
                    filter_conditions = []
                    params = [entity_type]
                    tenant_clause = ""
                    if tenant_id:
                        tenant_clause = "AND tenant_id = %s::uuid"
                        params.append(tenant_id)

                    for key, value in metadata_filters.items():
                        filter_conditions.append("metadata->>%s = %s")
                        params.extend([key, str(value)])

                    where_clause = " AND ".join(filter_conditions) if filter_conditions else "TRUE"
                    query = f"""
                        DELETE FROM embeddings
                        WHERE entity_type = %s
                          {tenant_clause}
                          AND {where_clause}
                    """
                    cur.execute(query, params)
                    deleted_count = cur.rowcount
                conn.commit()
                return deleted_count
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error deleting embeddings by metadata: {str(e)}")
            return 0

    async def list_metadata_values(
        self,
        entity_type: str,
        value_key: str,
        metadata_filters: Dict[str, Any],
        tenant_id: Optional[str] = None
    ) -> List[str]:
        """List distinct metadata values for an entity type within a scope."""
        try:
            conn = self._get_db_connection()
            try:
                with conn.cursor() as cur:
                    filter_conditions = []
                    params = [value_key, entity_type]
                    tenant_clause = ""
                    if tenant_id:
                        tenant_clause = "AND tenant_id = %s::uuid"
                        params.append(tenant_id)

                    for key, value in metadata_filters.items():
                        filter_conditions.append("metadata->>%s = %s")
                        params.extend([key, str(value)])

                    params.append(value_key)
                    where_clause = " AND ".join(filter_conditions) if filter_conditions else "TRUE"
                    query = f"""
                        SELECT DISTINCT metadata->>%s AS value
                        FROM embeddings
                        WHERE entity_type = %s
                          {tenant_clause}
                          AND {where_clause}
                          AND metadata->>%s IS NOT NULL
                        ORDER BY value
                    """
                    cur.execute(query, params)
                    return [row[0] for row in cur.fetchall() if row[0]]
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Error listing metadata values: {str(e)}")
            return []
