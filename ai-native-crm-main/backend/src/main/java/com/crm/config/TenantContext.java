package com.crm.config;

import lombok.extern.slf4j.Slf4j;

import java.util.UUID;

/**
 * Thread-local storage for tenant context
 * Stores current tenant ID for the request thread
 */
@Slf4j
public class TenantContext {

    private static final ThreadLocal<UUID> currentTenant = new ThreadLocal<>();

    public static void setTenantId(UUID tenantId) {
        log.debug("Setting tenant ID: {}", tenantId);
        currentTenant.set(tenantId);
    }

    public static UUID getTenantId() {
        return currentTenant.get();
    }

    public static void clear() {
        log.debug("Clearing tenant context");
        currentTenant.remove();
    }
}
