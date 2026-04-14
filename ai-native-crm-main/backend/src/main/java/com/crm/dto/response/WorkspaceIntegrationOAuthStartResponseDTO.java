package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceIntegrationOAuthStartResponseDTO {

    private String providerKey;
    private String authorizationUrl;
    private String state;
    private LocalDateTime expiresAt;
}
