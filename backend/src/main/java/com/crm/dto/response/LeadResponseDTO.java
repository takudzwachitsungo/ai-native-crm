package com.crm.dto.response;

import com.crm.entity.enums.LeadSource;
import com.crm.entity.enums.LeadStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String company;
    private String title;
    private String territory;
    private LeadSource source;
    private LeadStatus status;
    private Integer score;
    private BigDecimal estimatedValue;
    private String notes;
    private List<String> tags;
    private LocalDate lastContactDate;
    private UUID ownerId;
    private String ownerName;
    private String ownerTerritory;
    private Boolean territoryMismatch;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
