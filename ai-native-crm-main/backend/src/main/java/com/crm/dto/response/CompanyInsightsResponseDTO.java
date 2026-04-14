package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyInsightsResponseDTO {

    private UUID companyId;
    private String companyName;
    private String parentCompanyName;
    private String territory;
    private String ownerTerritory;
    private boolean territoryMismatch;
    private long territoryMismatchDeals;
    private long childCompanyCount;
    private long totalContacts;
    private long primaryStakeholders;
    private long decisionMakers;
    private long highInfluenceContacts;
    private long activeDeals;
    private long highRiskDeals;
    private long stalledDeals;
    private long overdueNextSteps;
    private long openTasks;
    private long overdueTasks;
    private BigDecimal pipelineValue;
    private BigDecimal weightedPipelineValue;
    private int stakeholderCoveragePercent;
    private int healthScore;
    private String healthStatus;
    private List<String> missingStakeholderRoles;
    private List<String> recommendedActions;
    private List<CompanyOpportunityInsightDTO> opportunities;
}
