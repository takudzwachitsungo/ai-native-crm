package com.crm.dto.response;

import com.crm.entity.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String firstName;
    private String lastName;
    private String email;
    private UserRole role;
    private Boolean isActive;
    private String avatar;
    private UUID managerId;
    private String territory;
    private BigDecimal quarterlyQuota;
    private BigDecimal annualQuota;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
