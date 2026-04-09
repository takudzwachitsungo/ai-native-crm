package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "workspace_integrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceIntegration extends AbstractEntity {

    @Column(name = "provider_key", nullable = false, length = 100)
    private String providerKey;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "category", nullable = false, length = 80)
    private String category;

    @Column(name = "provider_type", nullable = false, length = 40)
    private String providerType;

    @Column(name = "auth_type", length = 40)
    private String authType;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(name = "client_id", length = 255)
    private String clientId;

    @Column(name = "client_secret", length = 1000)
    private String clientSecret;

    @Column(name = "account_identifier", length = 255)
    private String accountIdentifier;

    @Column(name = "redirect_uri", length = 500)
    private String redirectUri;

    @Column(name = "scopes", length = 1000)
    private String scopes;

    @Column(name = "oauth_state", length = 500)
    private String oauthState;

    @Column(name = "oauth_state_expires_at")
    private LocalDateTime oauthStateExpiresAt;

    @Column(name = "access_token", length = 4000)
    private String accessToken;

    @Column(name = "refresh_token", length = 4000)
    private String refreshToken;

    @Column(name = "token_type", length = 100)
    private String tokenType;

    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @Column(name = "last_sync_started_at")
    private LocalDateTime lastSyncStartedAt;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "last_sync_succeeded")
    private Boolean lastSyncSucceeded;

    @Column(name = "last_sync_message", length = 1000)
    private String lastSyncMessage;

    @Column(name = "sync_enabled", nullable = false)
    @Builder.Default
    private Boolean syncEnabled = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;

    @Column(name = "last_validated_at")
    private LocalDateTime lastValidatedAt;

    @Column(name = "last_validation_succeeded")
    private Boolean lastValidationSucceeded;

    @Column(name = "last_validation_message", length = 500)
    private String lastValidationMessage;
}
