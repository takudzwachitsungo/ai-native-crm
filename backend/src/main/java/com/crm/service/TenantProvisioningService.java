package com.crm.service;

import com.crm.entity.Tenant;
import com.crm.entity.User;

public interface TenantProvisioningService {

    void provisionTenantDatabase(Tenant tenant, User adminUser);

    void migrateTenantToDedicatedDatabase(java.util.UUID tenantId);
}
