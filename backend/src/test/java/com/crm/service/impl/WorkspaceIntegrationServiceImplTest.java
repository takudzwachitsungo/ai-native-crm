package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.response.WorkspaceIntegrationResponseDTO;
import com.crm.entity.WorkspaceIntegration;
import com.crm.repository.WorkspaceIntegrationRepository;
import com.crm.service.TenantCredentialCipher;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkspaceIntegrationServiceImplTest {

    @Mock private WorkspaceIntegrationRepository workspaceIntegrationRepository;
    @Mock private TenantCredentialCipher tenantCredentialCipher;
    @Mock private Environment environment;

    private WorkspaceIntegrationServiceImpl service;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        TenantContext.setTenantId(tenantId);
        service = new WorkspaceIntegrationServiceImpl(
                workspaceIntegrationRepository,
                tenantCredentialCipher,
                environment,
                new ObjectMapper(),
                new SimpleMeterRegistry()
        );

        when(workspaceIntegrationRepository.save(any(WorkspaceIntegration.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void validateCurrentTenantIntegrationMarksIncompleteConfiguration() {
        WorkspaceIntegration integration = WorkspaceIntegration.builder()
                .providerKey("google-workspace")
                .name("Google Workspace")
                .authType("OAUTH2")
                .isActive(true)
                .build();
        integration.setTenantId(tenantId);

        when(workspaceIntegrationRepository.findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, "google-workspace"))
                .thenReturn(Optional.of(integration));

        WorkspaceIntegrationResponseDTO response = service.validateCurrentTenantIntegration("google-workspace");

        assertFalse(Boolean.TRUE.equals(response.getLastValidationSucceeded()));
        assertTrue(response.getLastValidationMessage().contains("credentials are incomplete"));
    }

    @Test
    void validateCurrentTenantIntegrationReportsMissingOAuthCompletion() {
        WorkspaceIntegration integration = WorkspaceIntegration.builder()
                .providerKey("microsoft-365")
                .name("Microsoft 365")
                .authType("OAUTH2")
                .clientId("client-id")
                .clientSecret("encrypted-secret")
                .isActive(true)
                .build();
        integration.setTenantId(tenantId);

        when(workspaceIntegrationRepository.findByTenantIdAndProviderKeyAndArchivedFalse(tenantId, "microsoft-365"))
                .thenReturn(Optional.of(integration));

        WorkspaceIntegrationResponseDTO response = service.validateCurrentTenantIntegration("microsoft-365");

        assertFalse(Boolean.TRUE.equals(response.getLastValidationSucceeded()));
        assertTrue(response.getLastValidationMessage().contains("OAuth is not complete yet"));
    }
}
