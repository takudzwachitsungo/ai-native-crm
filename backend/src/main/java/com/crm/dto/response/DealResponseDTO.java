package com.crm.dto.response;

import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.DealType;
import com.crm.entity.enums.LeadSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String name;
    private UUID companyId;
    private String companyName;
    private UUID contactId;
    private String contactName;
    private BigDecimal value;
    private DealStage stage;
    private Integer probability;
    private BigDecimal weightedValue;
    private LocalDate expectedCloseDate;
    private LocalDate actualCloseDate;
    private DealType dealType;
    private LeadSource leadSource;
    private String description;
    private String notes;
    private UUID ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
