package com.crm.controller;

import com.crm.dto.request.EmailFilterDTO;
import com.crm.dto.request.EmailRequestDTO;
import com.crm.dto.response.EmailResponseDTO;
import com.crm.dto.response.IntegrationSyncResultDTO;
import com.crm.service.EmailService;
import com.crm.service.WorkspaceGoogleWorkspaceSyncService;
import com.crm.service.WorkspaceMicrosoft365SyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Emails", description = "Email management endpoints")
public class EmailController {

    private final EmailService emailService;
    private final WorkspaceMicrosoft365SyncService workspaceMicrosoft365SyncService;
    private final WorkspaceGoogleWorkspaceSyncService workspaceGoogleWorkspaceSyncService;

    @GetMapping
    @Operation(summary = "Get all emails", description = "Get paginated list of emails with optional filtering")
    public ResponseEntity<Page<EmailResponseDTO>> getAllEmails(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @ModelAttribute EmailFilterDTO filter
    ) {
        return ResponseEntity.ok(emailService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get email by ID", description = "Get detailed information about a specific email")
    public ResponseEntity<EmailResponseDTO> getEmailById(@PathVariable UUID id) {
        return ResponseEntity.ok(emailService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new email", description = "Create a new email or draft")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<EmailResponseDTO> createEmail(@Valid @RequestBody EmailRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(emailService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update email", description = "Update an existing email (only drafts)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<EmailResponseDTO> updateEmail(
            @PathVariable UUID id,
            @Valid @RequestBody EmailRequestDTO request
    ) {
        return ResponseEntity.ok(emailService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete email", description = "Delete an email (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteEmail(@PathVariable UUID id) {
        emailService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete emails", description = "Delete multiple emails at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteEmails(@RequestBody List<UUID> ids) {
        emailService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/send")
    @Operation(summary = "Send email", description = "Send an email or draft")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<EmailResponseDTO> sendEmail(@PathVariable UUID id) {
        return ResponseEntity.ok(emailService.sendEmail(id));
    }

    @PatchMapping("/{id}/mark-read")
    @Operation(summary = "Mark email as read", description = "Mark an email as read")
    public ResponseEntity<EmailResponseDTO> markEmailAsRead(@PathVariable UUID id) {
        return ResponseEntity.ok(emailService.markAsRead(id));
    }

    @PatchMapping("/{id}/mark-unread")
    @Operation(summary = "Mark email as unread", description = "Mark an email as unread")
    public ResponseEntity<EmailResponseDTO> markEmailAsUnread(@PathVariable UUID id) {
        return ResponseEntity.ok(emailService.markAsUnread(id));
    }

    @PatchMapping("/{id}/move")
    @Operation(summary = "Move email to folder", description = "Move an email to a different folder")
    public ResponseEntity<EmailResponseDTO> moveEmailToFolder(
            @PathVariable UUID id,
            @RequestParam String folder
    ) {
        return ResponseEntity.ok(emailService.moveToFolder(id, folder));
    }

    @PostMapping("/sync/microsoft-365")
    @Operation(summary = "Sync Microsoft 365 emails", description = "Imports inbox and sent email metadata from the connected Microsoft 365 workspace integration")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    public ResponseEntity<IntegrationSyncResultDTO> syncMicrosoft365Emails() {
        return ResponseEntity.ok(workspaceMicrosoft365SyncService.syncEmails());
    }

    @PostMapping("/sync/google-workspace")
    @Operation(summary = "Sync Google Workspace emails", description = "Imports inbox and sent Gmail metadata from the connected Google Workspace integration")
    @PreAuthorize("hasAuthority('WORKSPACE_DATABASE_MANAGE')")
    public ResponseEntity<IntegrationSyncResultDTO> syncGoogleWorkspaceEmails() {
        return ResponseEntity.ok(workspaceGoogleWorkspaceSyncService.syncEmails());
    }
}
