package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryExceptionItemDTO {

    private String entityType;
    private UUID entityId;
    private String title;
    private String territory;
    private String ownerName;
    private String ownerTerritory;
    private UUID suggestedOwnerId;
    private String suggestedOwnerName;
    private String suggestedOwnerTerritory;
    private String severity;
    private BigDecimal impactValue;
    private String stage;
    private LocalDate dueDate;
    private Long ageDays;
    private Boolean openTaskExists;
}
