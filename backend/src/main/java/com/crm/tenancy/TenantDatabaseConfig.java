package com.crm.tenancy;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class TenantDatabaseConfig {
    UUID tenantId;
    boolean dedicatedDatabaseEnabled;
    String databaseUrl;
    String databaseUsername;
    String databasePassword;
    String databaseDriverClassName;
    boolean lastValidationSucceeded;
}
