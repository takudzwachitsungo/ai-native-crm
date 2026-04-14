package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettingsCapabilityOverviewResponseDTO {

    private Boolean profileEditingEnabled;
    private Boolean notificationSyncEnabled;
    private Boolean billingPortalEnabled;
    private Boolean passwordSelfServiceEnabled;
    private Boolean twoFactorEnabled;
    private Boolean sessionManagementEnabled;
    private Boolean jwtAuthenticationEnabled;
    private Boolean permissionBasedAccessEnabled;
    private Boolean dedicatedDatabaseSupported;
    private Boolean smtpConfigured;
    private List<IntegrationStatusResponseDTO> integrations;
}
