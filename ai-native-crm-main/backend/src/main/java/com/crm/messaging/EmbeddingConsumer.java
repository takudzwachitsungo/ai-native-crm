package com.crm.messaging;

import com.crm.ai.EmbeddingService;
import com.crm.config.RabbitMQConfig;
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
            String entityType = (String) message.get("entityType");
            UUID entityId = UUID.fromString((String) message.get("entityId"));
            String content = (String) message.get("content");
            @SuppressWarnings("unchecked")
            Map<String, Object> metadata = (Map<String, Object>) message.getOrDefault("metadata", Map.of());
            
            log.info("Processing embedding request for {} with id: {}", entityType, entityId);
            
            embeddingService.createEmbedding(entityType, entityId, content, metadata);
            
            log.info("Successfully processed embedding for {} with id: {}", entityType, entityId);
            
        } catch (Exception e) {
            log.error("Failed to process embedding request: {}", e.getMessage(), e);
            throw new RuntimeException("Embedding processing failed", e);
        }
    }
}
