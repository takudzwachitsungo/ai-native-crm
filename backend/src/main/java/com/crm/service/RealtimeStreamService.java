package com.crm.service;

import com.crm.dto.response.RealtimeEventResponseDTO;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

public interface RealtimeStreamService {

    SseEmitter subscribeCurrentUser();

    void publishTenantEvent(UUID tenantId, RealtimeEventResponseDTO event);

    void publishUserEvent(UUID tenantId, UUID userId, RealtimeEventResponseDTO event);

    long getTenantActiveSubscriberCount(UUID tenantId);

    long getTenantActiveConnectionCount(UUID tenantId);

    default void publishEntityChanged(
            UUID tenantId,
            String eventType,
            String entityType,
            UUID entityId,
            String action,
            Map<String, Object> payload
    ) {
        publishTenantEvent(
                tenantId,
                RealtimeEventResponseDTO.builder()
                        .eventType(eventType)
                        .entityType(entityType)
                        .entityId(entityId != null ? entityId.toString() : null)
                        .scope("tenant")
                        .payload(payload == null ? Map.of("action", action) : payload)
                        .occurredAt(java.time.LocalDateTime.now())
                        .build()
        );
    }
}
