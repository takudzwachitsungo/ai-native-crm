package com.crm.messaging;

import com.crm.ai.EmbeddingService;
import com.crm.config.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

@ExtendWith(MockitoExtension.class)
class EmbeddingConsumerTest {

    @Mock
    private EmbeddingService embeddingService;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void processEmbeddingRequestRequiresAndAppliesTenantContext() {
        UUID tenantId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        AtomicReference<UUID> observedTenant = new AtomicReference<>();

        doAnswer(invocation -> {
            observedTenant.set(TenantContext.getTenantId());
            return null;
        }).when(embeddingService).createEmbedding(eq("deal"), eq(entityId), eq("Deal notes"), any());

        new EmbeddingConsumer(embeddingService).processEmbeddingRequest(Map.of(
                "tenantId", tenantId.toString(),
                "entityType", "deal",
                "entityId", entityId.toString(),
                "content", "Deal notes"
        ));

        assertEquals(tenantId, observedTenant.get());
        assertNull(TenantContext.getTenantId());
    }

    @Test
    void processEmbeddingRequestRejectsMessagesWithoutTenantId() {
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                new EmbeddingConsumer(embeddingService).processEmbeddingRequest(Map.of(
                        "entityType", "deal",
                        "entityId", UUID.randomUUID().toString(),
                        "content", "Deal notes"
                ))
        );

        assertEquals("Embedding processing failed", exception.getMessage());
        assertNull(TenantContext.getTenantId());
    }
}
