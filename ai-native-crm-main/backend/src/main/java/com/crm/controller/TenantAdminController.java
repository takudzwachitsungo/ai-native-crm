package com.crm.controller;

import com.crm.dto.request.TenantDatabaseSettingsUpdateRequestDTO;
import com.crm.dto.response.TenantDatabaseSettingsResponseDTO;
import com.crm.dto.response.WorkspaceOperationsSummaryDTO;
import com.crm.service.TenantAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspace")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Workspace Admin", description = "Workspace administration endpoints")
@PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
public class TenantAdminController {

    private final TenantAdminService tenantAdminService;

    @GetMapping("/database")
    @Operation(summary = "Get workspace database settings", description = "Get dedicated database routing settings for the authenticated workspace")
    public ResponseEntity<TenantDatabaseSettingsResponseDTO> getDatabaseSettings() {
        return ResponseEntity.ok(tenantAdminService.getCurrentTenantDatabaseSettings());
    }

    @GetMapping("/operations")
    @Operation(summary = "Get workspace operations summary", description = "Get current tenant operational readiness, automation activity, and support load summary")
    public ResponseEntity<WorkspaceOperationsSummaryDTO> getOperationsSummary() {
        return ResponseEntity.ok(tenantAdminService.getWorkspaceOperationsSummary());
    }

    @PutMapping("/database")
    @Operation(summary = "Update workspace database settings", description = "Update dedicated database routing settings for the authenticated workspace")
    public ResponseEntity<TenantDatabaseSettingsResponseDTO> updateDatabaseSettings(
            @Valid @RequestBody TenantDatabaseSettingsUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(tenantAdminService.updateCurrentTenantDatabaseSettings(request));
    }

    @PostMapping("/database/validate")
    @Operation(summary = "Validate workspace database settings", description = "Validate the saved dedicated database connection for the authenticated workspace")
    public ResponseEntity<TenantDatabaseSettingsResponseDTO> validateDatabaseSettings() {
        return ResponseEntity.ok(tenantAdminService.validateCurrentTenantDatabaseSettings());
    }

    @PostMapping("/database/migrate")
    @Operation(summary = "Migrate workspace to a dedicated database", description = "Provision a dedicated database and copy the current workspace data into it")
    public ResponseEntity<TenantDatabaseSettingsResponseDTO> migrateDatabaseSettings() {
        return ResponseEntity.ok(tenantAdminService.migrateCurrentTenantToDedicatedDatabase());
    }
}
