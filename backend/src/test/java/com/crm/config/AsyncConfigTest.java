package com.crm.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskDecorator;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AsyncConfigTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void taskDecoratorPropagatesTenantAndSecurityContextThenRestoresPreviousThreadState() {
        UUID parentTenantId = UUID.randomUUID();
        TenantContext.setTenantId(parentTenantId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("alice@example.com", null, List.of())
        );

        TaskDecorator decorator = new AsyncConfig().tenantAwareTaskDecorator();
        AtomicReference<UUID> observedTenant = new AtomicReference<>();
        AtomicReference<Object> observedPrincipal = new AtomicReference<>();

        Runnable decorated = decorator.decorate(() -> {
            observedTenant.set(TenantContext.getTenantId());
            observedPrincipal.set(SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        });

        TenantContext.clear();
        SecurityContextHolder.clearContext();
        decorated.run();

        assertEquals(parentTenantId, observedTenant.get());
        assertEquals("alice@example.com", observedPrincipal.get());
        assertNull(TenantContext.getTenantId());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
