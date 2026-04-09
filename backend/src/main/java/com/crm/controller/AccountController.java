package com.crm.controller;

import com.crm.dto.request.AccountProfileUpdateRequestDTO;
import com.crm.dto.request.NotificationPreferenceUpdateRequestDTO;
import com.crm.dto.request.PasswordChangeRequestDTO;
import com.crm.dto.request.TwoFactorDisableRequestDTO;
import com.crm.dto.request.TwoFactorVerificationRequestDTO;
import com.crm.dto.response.AccountProfileResponseDTO;
import com.crm.dto.response.BillingPortalResponseDTO;
import com.crm.dto.response.NotificationPreferenceResponseDTO;
import com.crm.dto.response.TwoFactorSetupResponseDTO;
import com.crm.dto.response.TwoFactorStatusResponseDTO;
import com.crm.dto.response.UserSessionResponseDTO;
import com.crm.service.AccountSelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/account")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Account", description = "Self-service account and security endpoints")
public class AccountController {

    private final AccountSelfService accountSelfService;

    @GetMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current account profile")
    public ResponseEntity<AccountProfileResponseDTO> getProfile() {
        return ResponseEntity.ok(accountSelfService.getProfile());
    }

    @PutMapping("/profile")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update current account profile")
    public ResponseEntity<AccountProfileResponseDTO> updateProfile(@Valid @RequestBody AccountProfileUpdateRequestDTO request) {
        return ResponseEntity.ok(accountSelfService.updateProfile(request));
    }

    @GetMapping("/notifications")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current account notification preferences")
    public ResponseEntity<NotificationPreferenceResponseDTO> getNotificationPreferences() {
        return ResponseEntity.ok(accountSelfService.getNotificationPreferences());
    }

    @PutMapping("/notifications")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update current account notification preferences")
    public ResponseEntity<NotificationPreferenceResponseDTO> updateNotificationPreferences(
            @RequestBody NotificationPreferenceUpdateRequestDTO request
    ) {
        return ResponseEntity.ok(accountSelfService.updateNotificationPreferences(request));
    }

    @PostMapping("/password/change")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Change current account password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequestDTO request) {
        accountSelfService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List current account sessions")
    public ResponseEntity<List<UserSessionResponseDTO>> getSessions() {
        return ResponseEntity.ok(accountSelfService.getSessions());
    }

    @DeleteMapping("/sessions/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke a specific session")
    public ResponseEntity<Void> revokeSession(@PathVariable UUID sessionId) {
        accountSelfService.revokeSession(sessionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/revoke-others")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke all other sessions")
    public ResponseEntity<Void> revokeOtherSessions() {
        accountSelfService.revokeOtherSessions();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/billing")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get workspace billing portal summary")
    public ResponseEntity<BillingPortalResponseDTO> getBillingPortal() {
        return ResponseEntity.ok(accountSelfService.getBillingPortal());
    }

    @GetMapping("/2fa")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get two-factor authentication status")
    public ResponseEntity<TwoFactorStatusResponseDTO> getTwoFactorStatus() {
        return ResponseEntity.ok(accountSelfService.getTwoFactorStatus());
    }

    @PostMapping("/2fa/setup")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Begin two-factor authentication setup")
    public ResponseEntity<TwoFactorSetupResponseDTO> beginTwoFactorSetup() {
        return ResponseEntity.ok(accountSelfService.beginTwoFactorSetup());
    }

    @PostMapping("/2fa/enable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Enable two-factor authentication")
    public ResponseEntity<TwoFactorStatusResponseDTO> enableTwoFactor(
            @Valid @RequestBody TwoFactorVerificationRequestDTO request
    ) {
        return ResponseEntity.ok(accountSelfService.enableTwoFactor(request));
    }

    @PostMapping("/2fa/disable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Disable two-factor authentication")
    public ResponseEntity<TwoFactorStatusResponseDTO> disableTwoFactor(
            @Valid @RequestBody TwoFactorDisableRequestDTO request
    ) {
        return ResponseEntity.ok(accountSelfService.disableTwoFactor(request));
    }
}
