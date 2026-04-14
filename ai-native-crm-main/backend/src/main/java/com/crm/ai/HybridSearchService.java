package com.crm.ai;

import com.crm.config.TenantContext;
import com.crm.entity.Embedding;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Hybrid search service combining vector similarity and full-text search
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HybridSearchService {

    private final EmbeddingService embeddingService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Perform hybrid search combining semantic and keyword search
     */
    public List<Map<String, Object>> hybridSearch(
            String entityType,
            String query,
            int limit,
            double vectorWeight,
            double textWeight
    ) {
        UUID tenantId = TenantContext.getTenantId();
        
        try {
            // Get vector similarity results
            List<Embedding> vectorResults = embeddingService.findSimilar(tenantId, entityType, query, limit * 2);
            
            // Get full-text search results
            List<Map<String, Object>> textResults = performFullTextSearch(tenantId, entityType, query, limit * 2);
            
            // Combine and rank results
            Map<UUID, Double> scores = new HashMap<>();
            
            // Add vector similarity scores
            for (int i = 0; i < vectorResults.size(); i++) {
                UUID entityId = vectorResults.get(i).getEntityId();
                double score = (1.0 - (double) i / vectorResults.size()) * vectorWeight;
                scores.put(entityId, scores.getOrDefault(entityId, 0.0) + score);
            }
            
            // Add text search scores
            for (int i = 0; i < textResults.size(); i++) {
                UUID entityId = UUID.fromString(textResults.get(i).get("id").toString());
                double score = (1.0 - (double) i / textResults.size()) * textWeight;
                scores.put(entityId, scores.getOrDefault(entityId, 0.0) + score);
            }
            
            // Sort by combined score and return top results
            List<Map<String, Object>> rankedResults = scores.entrySet().stream()
                    .sorted(Map.Entry.<UUID, Double>comparingByValue().reversed())
                    .limit(limit)
                    .map(entry -> {
                        Map<String, Object> result = new HashMap<>();
                        result.put("entityId", entry.getKey());
                        result.put("score", entry.getValue());
                        result.put("entityType", entityType);
                        return result;
                    })
                    .collect(Collectors.toList());
            
            log.info("Hybrid search found {} results for query: {} in {}", rankedResults.size(), query, entityType);
            return rankedResults;
            
        } catch (Exception e) {
            log.error("Failed to perform hybrid search: {}", e.getMessage(), e);
            return List.of();
        }
    }

    /**
     * Perform PostgreSQL full-text search
     */
    private List<Map<String, Object>> performFullTextSearch(UUID tenantId, String entityType, String query, int limit) {
        try {
            String tableName = getTableName(entityType);
            String searchFields = getSearchFields(entityType);
            
            String sql = String.format("""
                SELECT id, %s AS content,
                       ts_rank(to_tsvector('english', %s), plainto_tsquery('english', ?)) AS rank
                FROM %s
                WHERE tenant_id = ?::uuid
                  AND archived = false
                  AND to_tsvector('english', %s) @@ plainto_tsquery('english', ?)
                ORDER BY rank DESC
                LIMIT ?
                """, searchFields, searchFields, tableName, searchFields);
            
            return jdbcTemplate.queryForList(sql, query, tenantId.toString(), query, limit);
            
        } catch (Exception e) {
            log.error("Failed to perform full-text search: {}", e.getMessage(), e);
            return List.of();
        }
    }

    private String getTableName(String entityType) {
        return switch (entityType.toLowerCase()) {
            case "lead" -> "leads";
            case "contact" -> "contacts";
            case "company" -> "companies";
            case "deal" -> "deals";
            case "document" -> "documents";
            case "email" -> "emails";
            default -> throw new IllegalArgumentException("Unsupported entity type: " + entityType);
        };
    }

    private String getSearchFields(String entityType) {
        return switch (entityType.toLowerCase()) {
            case "lead" -> "COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(company, '') || ' ' || COALESCE(notes, '')";
            case "contact" -> "COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(notes, '')";
            case "company" -> "COALESCE(name, '') || ' ' || COALESCE(notes, '')";
            case "deal" -> "COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')";
            case "document" -> "COALESCE(name, '')";
            case "email" -> "COALESCE(subject, '') || ' ' || COALESCE(body, '')";
            default -> throw new IllegalArgumentException("Unsupported entity type: " + entityType);
        };
    }
}
