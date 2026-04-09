package com.crm.service.impl;

import com.crm.dto.response.IntegrationStatusResponseDTO;
import com.crm.dto.response.SettingsCapabilityOverviewResponseDTO;
import com.crm.service.SettingsOverviewService;
import com.crm.service.WorkspaceIntegrationService;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SettingsOverviewServiceImpl implements SettingsOverviewService {

    private final Environment environment;
    private final WorkspaceIntegrationService workspaceIntegrationService;

    public SettingsOverviewServiceImpl(Environment environment, WorkspaceIntegrationService workspaceIntegrationService) {
        this.environment = environment;
        this.workspaceIntegrationService = workspaceIntegrationService;
    }

    @Override
    public SettingsCapabilityOverviewResponseDTO getCapabilities() {
        boolean smtpConfigured = isSmtpConfigured();
        boolean billingPortalEnabled = StringUtils.hasText(environment.getProperty("billing.portal-base-url", ""));

        return SettingsCapabilityOverviewResponseDTO.builder()
                .profileEditingEnabled(true)
                .notificationSyncEnabled(true)
                .billingPortalEnabled(billingPortalEnabled)
                .passwordSelfServiceEnabled(true)
                .twoFactorEnabled(true)
                .sessionManagementEnabled(true)
                .jwtAuthenticationEnabled(true)
                .permissionBasedAccessEnabled(true)
                .dedicatedDatabaseSupported(true)
                .smtpConfigured(smtpConfigured)
                .integrations(workspaceIntegrationService.getCurrentTenantIntegrations().stream()
                        .map(item -> IntegrationStatusResponseDTO.builder()
                                .key(item.getKey())
                                .name(item.getName())
                                .category(item.getCategory())
                                .providerType(item.getProviderType())
                                .status(item.getStatus())
                                .description(item.getDescription())
                                .detail(item.getDetail())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    private boolean isSmtpConfigured() {
        String host = environment.getProperty("spring.mail.host", "");
        String username = environment.getProperty("spring.mail.username", "");
        String smtpAuth = environment.getProperty("spring.mail.properties.mail.smtp.auth", "true");

        if (!StringUtils.hasText(host) || "smtp.example.com".equalsIgnoreCase(host.trim())) {
            return false;
        }

        return StringUtils.hasText(username) || "false".equalsIgnoreCase(smtpAuth);
    }
}
