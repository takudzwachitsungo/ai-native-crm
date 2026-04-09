package com.crm.controller;

import com.crm.dto.request.WorkspaceIntegrationUpdateRequestDTO;
import com.crm.dto.request.WorkspaceIntegrationOAuthExchangeRequestDTO;
import com.crm.dto.response.SettingsCapabilityOverviewResponseDTO;
import com.crm.dto.response.WorkspaceIntegrationOAuthStartResponseDTO;
import com.crm.dto.response.WorkspaceIntegrationResponseDTO;
import com.crm.service.SettingsOverviewService;
import com.crm.service.WorkspaceIntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Settings", description = "Workspace and product capability overview endpoints")
public class SettingsController {

    private final SettingsOverviewService settingsOverviewService;
    private final WorkspaceIntegrationService workspaceIntegrationService;

    @GetMapping("/capabilities")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get settings capability overview", description = "Returns the live product capability status for profile, security, billing, notifications, and integrations")
    public ResponseEntity<SettingsCapabilityOverviewResponseDTO> getCapabilities() {
        return ResponseEntity.ok(settingsOverviewService.getCapabilities());
    }

    @GetMapping("/integrations")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get workspace integrations", description = "Returns tenant-scoped integration setup status and saved connector configuration metadata")
    public ResponseEntity<List<WorkspaceIntegrationResponseDTO>> getIntegrations() {
        return ResponseEntity.ok(workspaceIntegrationService.getCurrentTenantIntegrations());
    }

    @PutMapping("/integrations/{providerKey}")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    @Operation(summary = "Update workspace integration", description = "Saves tenant-scoped connector configuration for a supported integration provider")
    public ResponseEntity<WorkspaceIntegrationResponseDTO> updateIntegration(
            @PathVariable String providerKey,
            @Valid @RequestBody WorkspaceIntegrationUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(workspaceIntegrationService.updateCurrentTenantIntegration(providerKey, request));
    }

    @PostMapping("/integrations/{providerKey}/oauth/start")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    @Operation(summary = "Start workspace integration OAuth", description = "Generates a provider authorization URL and stores a short-lived state token for the selected workspace integration")
    public ResponseEntity<WorkspaceIntegrationOAuthStartResponseDTO> startIntegrationOAuth(@PathVariable String providerKey) {
        return ResponseEntity.ok(workspaceIntegrationService.startOAuth(providerKey));
    }

    @PostMapping("/integrations/{providerKey}/oauth/exchange")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    @Operation(summary = "Exchange OAuth code for workspace integration", description = "Exchanges a provider authorization code and state token for stored access credentials")
    public ResponseEntity<WorkspaceIntegrationResponseDTO> exchangeIntegrationOAuthCode(
            @PathVariable String providerKey,
            @Valid @RequestBody WorkspaceIntegrationOAuthExchangeRequestDTO request
    ) {
        return ResponseEntity.ok(workspaceIntegrationService.exchangeOAuthCode(providerKey, request));
    }

    @PostMapping("/integrations/{providerKey}/oauth/refresh")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    @Operation(summary = "Refresh workspace integration OAuth token", description = "Uses the stored refresh token to renew provider access for the selected workspace integration")
    public ResponseEntity<WorkspaceIntegrationResponseDTO> refreshIntegrationOAuthToken(@PathVariable String providerKey) {
        return ResponseEntity.ok(workspaceIntegrationService.refreshOAuthToken(providerKey));
    }
}
