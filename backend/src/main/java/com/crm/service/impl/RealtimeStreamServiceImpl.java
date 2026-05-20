package com.crm.service.impl;

import com.crm.dto.response.RealtimeEventResponseDTO;
import com.crm.entity.User;
import com.crm.security.RecordAccessService;
import com.crm.service.RealtimeStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class RealtimeStreamServiceImpl implements RealtimeStreamService {

    private static final long SSE_TIMEOUT_MS = 0L;
    private static final String STREAM_EVENT_NAME = "realtime";

    private final RecordAccessService recordAccessService;

    private final Map<UUID, Map<UUID, CopyOnWriteArrayList<SseEmitter>>> tenantEmitters = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribeCurrentUser() {
        User currentUser = recordAccessService.requireCurrentUser();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        tenantEmitters
                .computeIfAbsent(currentUser.getTenantId(), ignored -> new ConcurrentHashMap<>())
                .computeIfAbsent(currentUser.getId(), ignored -> new CopyOnWriteArrayList<>())
                .add(emitter);

        registerLifecycle(currentUser.getTenantId(), currentUser.getId(), emitter);
        sendSafely(
                currentUser.getTenantId(),
                currentUser.getId(),
                emitter,
                RealtimeEventResponseDTO.builder()
                        .eventType("stream.connected")
                        .entityType("stream")
                        .entityId(null)
                        .scope("user")
                        .payload(Map.of(
                                "userId", currentUser.getId(),
                                "tenantId", currentUser.getTenantId()
                        ))
                        .occurredAt(LocalDateTime.now())
                        .build()
        );

        return emitter;
    }

    @Override
    public void publishTenantEvent(UUID tenantId, RealtimeEventResponseDTO event) {
        if (tenantId == null || event == null) {
            return;
        }
        Map<UUID, CopyOnWriteArrayList<SseEmitter>> emittersByUser = tenantEmitters.get(tenantId);
        if (emittersByUser == null || emittersByUser.isEmpty()) {
            return;
        }
        emittersByUser.forEach((userId, emitters) -> emitters.forEach(emitter -> sendSafely(tenantId, userId, emitter, event)));
    }

    @Override
    public void publishUserEvent(UUID tenantId, UUID userId, RealtimeEventResponseDTO event) {
        if (tenantId == null || userId == null || event == null) {
            return;
        }
        List<SseEmitter> emitters = tenantEmitters
                .getOrDefault(tenantId, Map.of())
                .get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        emitters.forEach(emitter -> sendSafely(tenantId, userId, emitter, event));
    }

    @Override
    public long getTenantActiveSubscriberCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return tenantEmitters.getOrDefault(tenantId, Map.of()).size();
    }

    @Override
    public long getTenantActiveConnectionCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return tenantEmitters.getOrDefault(tenantId, Map.of())
                .values()
                .stream()
                .mapToLong(List::size)
                .sum();
    }

    @Scheduled(fixedDelay = 25000L)
    public void sendHeartbeat() {
        tenantEmitters.forEach((tenantId, emittersByUser) ->
                emittersByUser.forEach((userId, emitters) ->
                        emitters.forEach(emitter -> sendSafely(
                                tenantId,
                                userId,
                                emitter,
                                RealtimeEventResponseDTO.builder()
                                        .eventType("stream.heartbeat")
                                        .entityType("stream")
                                        .scope("user")
                                        .payload(Map.of("heartbeat", true))
                                        .occurredAt(LocalDateTime.now())
                                        .build()
                        ))
                )
        );
    }

    private void registerLifecycle(UUID tenantId, UUID userId, SseEmitter emitter) {
        emitter.onCompletion(() -> removeEmitter(tenantId, userId, emitter));
        emitter.onTimeout(() -> removeEmitter(tenantId, userId, emitter));
        emitter.onError(ex -> removeEmitter(tenantId, userId, emitter));
    }

    private void sendSafely(UUID tenantId, UUID userId, SseEmitter emitter, RealtimeEventResponseDTO event) {
        try {
            emitter.send(
                    SseEmitter.event()
                            .name(STREAM_EVENT_NAME)
                            .data(event)
            );
        } catch (IOException | IllegalStateException ex) {
            log.debug("Dropping realtime emitter for tenant {} user {} after send failure", tenantId, userId, ex);
            removeEmitter(tenantId, userId, emitter);
        }
    }

    private void removeEmitter(UUID tenantId, UUID userId, SseEmitter emitter) {
        Map<UUID, CopyOnWriteArrayList<SseEmitter>> emittersByUser = tenantEmitters.get(tenantId);
        if (emittersByUser == null) {
            return;
        }
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByUser.remove(userId);
        }
        if (emittersByUser.isEmpty()) {
            tenantEmitters.remove(tenantId);
        }
    }
}
