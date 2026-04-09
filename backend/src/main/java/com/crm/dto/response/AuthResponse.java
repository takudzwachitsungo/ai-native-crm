package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long expiresIn;
    
    private UUID userId;
    private UUID tenantId;
    private String tenantName;
    private String tenantSlug;
    private String tenantTier;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private List<String> permissions;
    private List<String> dataScopes;
}
