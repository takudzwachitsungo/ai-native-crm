package com.crm.ai;

import com.crm.config.TenantContext;
import com.crm.entity.Embedding;
import com.crm.repository.EmbeddingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for creating and managing embeddings
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final OpenAIService openAIService;
    private final EmbeddingRepository embeddingRepository;

    /**
     * Create embedding for entity content
     */
    @Async
    @Transactional
    public void createEmbedding(String entityType, UUID entityId, String content, Map<String, Object> metadata) {
        UUID tenantId = TenantContext.getTenantId();
        
        try {
            // Generate embedding using OpenAI
            float[] embeddingVector = openAIService.generateEmbedding(content);
            
            // Delete existing embedding if any
            embeddingRepository.deleteByTenantIdAndEntityTypeAndEntityId(tenantId, entityType, entityId);
            
            // Create new embedding
            Embedding embedding = new Embedding();
            embedding.setTenantId(tenantId);
            embedding.setEntityType(entityType);
            embedding.setEntityId(entityId);
            embedding.setContent(content);
            // metadata is stored as JSON string
            embedding.setMetadata(metadata != null ? metadata.toString() : null);
            // Convert float[] to PGvector
            embedding.setEmbedding(new com.pgvector.PGvector(embeddingVector));
            
            embeddingRepository.save(embedding);
            
            log.info("Created embedding for {} with id: {} for tenant: {}", entityType, entityId, tenantId);
            
        } catch (Exception e) {
            log.error("Failed to create embedding for {} with id: {}: {}", entityType, entityId, e.getMessage(), e);
        }
    }

    /**
     * Find similar entities using vector similarity search
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "embeddings", key = "#tenantId + '-' + #entityType + '-' + #queryText")
    public List<Embedding> findSimilar(UUID tenantId, String entityType, String queryText, int limit) {
        try {
            // Generate embedding for query
            float[] queryEmbedding = openAIService.generateEmbedding(queryText);
            
            // Find similar embeddings using cosine similarity
            com.pgvector.PGvector queryVector = new com.pgvector.PGvector(queryEmbedding);
            List<Embedding> similar = embeddingRepository.findSimilar(
                tenantId, 
                entityType, 
                queryVector.toString(), 
                limit
            );
            
            log.debug("Found {} similar {} for query: {}", similar.size(), entityType, queryText);
            return similar;
            
        } catch (Exception e) {
            log.error("Failed to find similar entities: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * Delete embeddings for an entity
     */
    @Transactional
    public void deleteEmbeddings(UUID tenantId, String entityType, UUID entityId) {
        embeddingRepository.deleteByTenantIdAndEntityTypeAndEntityId(tenantId, entityType, entityId);
        log.info("Deleted embeddings for {} with id: {} for tenant: {}", entityType, entityId, tenantId);
    }
}
