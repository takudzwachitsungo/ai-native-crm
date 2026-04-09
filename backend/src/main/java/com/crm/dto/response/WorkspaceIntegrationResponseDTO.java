package com.crm.dto.response;

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
public class WorkspaceIntegrationResponseDTO {

    private UUID id;
    private String key;
    private String name;
    private String category;
    private String providerType;
    private String status;
    private String description;
    private String detail;
    private Boolean editable;
    private String authType;
    private String baseUrl;
    private String clientId;
    private Boolean clientIdConfigured;
    private Boolean clientSecretConfigured;
    private String accountIdentifier;
    private String redirectUri;
    private String scopes;
    private Boolean syncEnabled;
    private Boolean active;
    private LocalDateTime lastValidatedAt;
    private Boolean lastValidationSucceeded;
    private String lastValidationMessage;
    private Boolean connected;
    private LocalDateTime connectedAt;
    private LocalDateTime tokenExpiresAt;
    private Boolean oauthReady;
    private LocalDateTime lastSyncStartedAt;
    private LocalDateTime lastSyncedAt;
    private Boolean lastSyncSucceeded;
    private String lastSyncMessage;
}
