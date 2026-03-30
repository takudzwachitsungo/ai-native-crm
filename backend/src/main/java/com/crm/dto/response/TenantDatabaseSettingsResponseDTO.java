package com.crm.dto.response;

import com.crm.entity.enums.TenantTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDatabaseSettingsResponseDTO {

    private UUID tenantId;
    private String tenantName;
    private String tenantSlug;
    private TenantTier tenantTier;
    private Boolean dedicatedDatabaseEnabled;
    private String databaseUrl;
    private String databaseUsername;
    private String databaseDriverClassName;
    private Boolean passwordConfigured;
    private Boolean databaseConfigured;
    private Boolean databaseReady;
    private String routingMode;
    private LocalDateTime lastValidatedAt;
    private Boolean lastValidationSucceeded;
    private String lastValidationMessage;
}
