package com.crm.dto.response;

import com.crm.entity.enums.CompanyStatus;
import com.crm.entity.enums.Industry;
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
public class CompanyResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String name;
    private Industry industry;
    private String website;
    private String phone;
    private String email;
    private BigDecimal revenue;
    private Integer employeeCount;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private CompanyStatus status;
    private String notes;
    private UUID ownerId;
    private String ownerName;
    private Long contactCount;
    private Long dealCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
