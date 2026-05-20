package com.crm.messaging;

import com.crm.ai.EmbeddingService;
import com.crm.config.TenantContext;
import com.crm.config.RabbitMQConfig;
import com.crm.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Consumer for embedding generation messages
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddingConsumer {

    private final EmbeddingService embeddingService;

    @RabbitListener(queues = RabbitMQConfig.EMBEDDING_QUEUE)
    public void processEmbeddingRequest(Map<String, Object> message) {
        try {
            UUID tenantId = parseTenantId(message.get("tenantId"));
            String entityType = (String) message.get("entityType");
            UUID entityId = UUID.fromString((String) message.get("entityId"));
            String content = (String) message.get("content");
            @SuppressWarnings("unchecked")
            Map<String, Object> metadata = (Map<String, Object>) message.getOrDefault("metadata", Map.of());
            
            TenantContext.setTenantId(tenantId);
            log.info("Processing embedding request for {} with id: {} for tenant {}", entityType, entityId, tenantId);
            
            embeddingService.createEmbedding(entityType, entityId, content, metadata);
            
            log.info("Successfully processed embedding for {} with id: {} for tenant {}", entityType, entityId, tenantId);
            
        } catch (Exception e) {
            if (e instanceof BadRequestException) {
                log.warn("Rejected embedding request: {}", e.getMessage());
            } else {
                log.error("Failed to process embedding request: {}", e.getMessage(), e);
            }
            throw new RuntimeException("Embedding processing failed", e);
        } finally {
            TenantContext.clear();
        }
    }

    private UUID parseTenantId(Object rawTenantId) {
        if (rawTenantId == null || rawTenantId.toString().isBlank()) {
            throw new BadRequestException("Embedding messages must include tenantId");
        }
        return UUID.fromString(rawTenantId.toString());
    }
}
