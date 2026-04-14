from sentence_transformers import SentenceTransformer
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
from typing import List, Dict, Any
import logging
import json

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
        entity_id: str
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
                metadata={"entity": entity}
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
    
    def _store_embedding(
        self,
        entity_type: str,
        entity_id: str,
        embedding: np.ndarray,
        content: str,
        metadata: Dict[str, Any]
    ):
        """Store embedding in database"""
        
        conn = self._get_db_connection()
        try:
            with conn.cursor() as cur:
                # Convert embedding to list for pgvector
                embedding_list = embedding.tolist()
                
                # Upsert embedding
                cur.execute("""
                    INSERT INTO embeddings (entity_type, entity_id, content, embedding, metadata, tenant_id)
                    VALUES (%s, %s, %s, %s, %s, (SELECT tenant_id FROM leads LIMIT 1))
                    ON CONFLICT (entity_type, entity_id, tenant_id)
                    DO UPDATE SET
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata = EXCLUDED.metadata,
                        updated_at = CURRENT_TIMESTAMP
                """, (entity_type, entity_id, content, embedding_list, json.dumps(metadata)))
                
            conn.commit()
            
        finally:
            conn.close()
    
    async def semantic_search(
        self,
        query: str,
        entity_type: str,
        limit: int = 5
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
                    cur.execute("""
                        SELECT 
                            entity_id,
                            entity_type,
                            content,
                            metadata,
                            1 - (embedding <=> %s::vector) AS similarity
                        FROM embeddings
                        WHERE entity_type = %s
                          AND 1 - (embedding <=> %s::vector) > %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                    """, (
                        query_embedding.tolist(),
                        entity_type,
                        query_embedding.tolist(),
                        settings.SIMILARITY_THRESHOLD,
                        query_embedding.tolist(),
                        limit
                    ))
                    
                    results = []
                    for row in cur.fetchall():
                        results.append({
                            "entity_id": row[0],
                            "entity_type": row[1],
                            "content": row[2],
                            "metadata": row[3],
                            "similarity": row[4]
                        })
                    
                    logger.info(f"Found {len(results)} similar {entity_type}s")
                    return results
                    
            finally:
                conn.close()
                
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            return []
    
    async def store_embedding(
        self,
        entity_id: str,
        entity_type: str,
        content: str,
        embedding: np.ndarray,
        metadata: Dict[str, Any]
    ):
        """Store embedding in database with metadata"""
        self._store_embedding(entity_type, entity_id, embedding, content, metadata)
    
    async def get_embeddings_by_metadata(
        self,
        entity_type: str,
        metadata_filters: Dict[str, Any],
        limit: int = 50
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
                    
                    for key, value in metadata_filters.items():
                        filter_conditions.append(f"metadata->>%s = %s")
                        params.extend([key, str(value)])
                    
                    where_clause = " AND ".join(filter_conditions) if filter_conditions else "TRUE"
                    
                    query = f"""
                        SELECT entity_id, entity_type, content, metadata, created_at
                        FROM embeddings
                        WHERE entity_type = %s
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
                            "metadata": eval(row[3]) if isinstance(row[3], str) else row[3],
                            "timestamp": row[4].isoformat() if row[4] else None
                        })
                    
                    return results
                    
            finally:
                conn.close()
                
        except Exception as e:
            logger.error(f"Error getting embeddings by metadata: {str(e)}")
            return []
