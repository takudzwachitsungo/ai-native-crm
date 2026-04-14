package com.crm.dto.response;

import com.crm.entity.enums.CampaignStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignStatsDTO {

    private Long totalCampaigns;
    private Long activeCampaigns;
    private Map<CampaignStatus, Long> campaignsByStatus;
    private BigDecimal totalBudget;
    private BigDecimal totalExpectedRevenue;
    private BigDecimal totalActualRevenue;
    private Long totalLeadsGenerated;
    private Long totalOpportunitiesCreated;
    private Long totalConversions;
    private Long totalAttributedLeads;
    private BigDecimal totalAttributedPipelineValue;
    private Long totalSegments;
    private Long totalJourneys;
    private Long campaignsUsingSegments;
    private Long campaignsUsingJourneys;
    private BigDecimal averageRoiPercent;
    private Double averageAttributedConversionRate;
}
