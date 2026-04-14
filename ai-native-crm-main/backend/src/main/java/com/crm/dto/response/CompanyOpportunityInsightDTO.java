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
public class CompanyOpportunityInsightDTO {

    private UUID dealId;
    private String dealName;
    private String stage;
    private BigDecimal value;
    private Integer probability;
    private BigDecimal weightedValue;
    private String riskLevel;
    private String ownerName;
    private String nextStep;
    private LocalDate nextStepDueDate;
    private boolean stalled;
    private boolean overdueNextStep;
}
