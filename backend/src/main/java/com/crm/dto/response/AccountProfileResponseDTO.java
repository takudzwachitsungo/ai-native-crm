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
public class AccountProfileResponseDTO {

    private UUID userId;
    private UUID tenantId;
    private String firstName;
    private String lastName;
    private String email;
    private String avatar;
    private String role;
    private String tenantName;
    private String tenantSlug;
    private String tenantTier;
    private LocalDateTime lastLoginAt;
}
