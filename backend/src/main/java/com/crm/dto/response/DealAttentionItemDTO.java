package com.crm.dto.response;

import com.crm.entity.enums.DealRiskLevel;
import com.crm.entity.enums.DealStage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DealAttentionItemDTO {

    private UUID dealId;
    private String dealName;
    private String companyName;
    private String territory;
    private String ownerName;
    private String ownerTerritory;
    private DealStage stage;
    private DealRiskLevel riskLevel;
    private String nextStep;
    private LocalDate nextStepDueDate;
    private LocalDateTime stageChangedAt;
    private Integer daysInStage;
    private Integer daysUntilNextStepDue;
    private boolean stalled;
    private boolean overdueNextStep;
    private boolean hasOpenTask;
    private boolean rescueTaskOpen;
    private boolean territoryMismatch;
    private boolean needsAttention;
}
