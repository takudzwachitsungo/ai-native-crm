package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignInsightsResponseDTO {

    private UUID campaignId;
    private String campaignName;
    private UUID segmentId;
    private String segmentName;
    private String segmentType;
    private UUID journeyId;
    private String journeyName;
    private Long journeyStepCount;
    private String firstJourneyStepName;
    private String journeyStage;
    private Boolean autoEnrollNewLeads;
    private Integer nurtureCadenceDays;
    private Integer nurtureTouchCount;
    private Long attributedLeadCount;
    private Long openAttributedLeadCount;
    private Integer fastTrackedLeadCount;
    private BigDecimal attributedPipelineValue;
    private Double averageLeadScore;
    private Double attributedConversionRate;
    private Double attributedOpportunityRate;
    private BigDecimal revenuePerAttributedLead;
    private Long segmentMatchedLeadCount;
    private Map<String, Long> leadsByStatus;
    private Map<String, Long> leadsBySource;
    private Map<String, Long> leadsByTerritory;
    private Map<String, Long> conversionFunnel;
    private List<String> recommendedActions;
}
