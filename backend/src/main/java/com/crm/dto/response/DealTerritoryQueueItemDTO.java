package com.crm.dto.response;

import com.crm.entity.enums.DealRiskLevel;
import com.crm.entity.enums.DealStage;
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
public class DealTerritoryQueueItemDTO {

    private UUID dealId;
    private String dealName;
    private UUID companyId;
    private String companyName;
    private String territory;
    private DealStage stage;
    private DealRiskLevel riskLevel;
    private BigDecimal value;
    private String currentOwnerName;
    private String currentOwnerTerritory;
    private UUID suggestedOwnerId;
    private String suggestedOwnerName;
    private String suggestedOwnerTerritory;
    private String nextStep;
    private LocalDate nextStepDueDate;
    private Boolean stalled;
    private Boolean overdueNextStep;
    private Integer priorityRank;
}
