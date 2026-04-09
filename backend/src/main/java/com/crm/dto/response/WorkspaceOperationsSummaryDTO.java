package com.crm.dto.response;

import com.crm.entity.enums.TenantTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceOperationsSummaryDTO {

    private UUID tenantId;
    private String tenantName;
    private String tenantSlug;
    private TenantTier tenantTier;
    private String routingMode;
    private Boolean dedicatedDatabaseReady;
    private Boolean lastValidationSucceeded;
    private LocalDateTime lastValidatedAt;
    private Long uptimeSeconds;
    private LocalDateTime observedAt;
    private Long activeUsers;
    private Long activeWorkflowRules;
    private Long activeAutomationRules;
    private Long activeSupportCases;
    private Long automationRunsLast24Hours;
    private Long failedAutomationRunsLast24Hours;
    private Long configuredIntegrations;
    private Long connectedIntegrations;
    private Long syncEnabledIntegrations;
    private Long integrationsWithRecentFailures;
    private Long integrationsNeedingReconnect;
    private List<AutomationRunResponseDTO> recentAutomationRuns;
}
