package com.crm.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TenantContextTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void requireTenantIdReturnsCurrentTenant() {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setTenantId(tenantId);

        assertEquals(tenantId, TenantContext.requireTenantId());
    }

    @Test
    void requireTenantIdFailsClosedWhenContextIsMissing() {
        TenantContext.clear();

        assertThrows(IllegalStateException.class, TenantContext::requireTenantId);
    }
}
