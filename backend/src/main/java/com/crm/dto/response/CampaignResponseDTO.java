package com.crm.dto.response;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.CampaignJourneyStage;
import com.crm.entity.enums.CampaignSegmentType;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.CampaignType;
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
public class CampaignResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String name;
    private CampaignType type;
    private CampaignStatus status;
    private CampaignChannel channel;
    private String targetAudience;
    private CampaignSegmentType segmentType;
    private String segmentName;
    private UUID segmentId;
    private String linkedSegmentName;
    private String primaryPersona;
    private String territoryFocus;
    private CampaignJourneyStage journeyStage;
    private UUID journeyId;
    private String journeyName;
    private Long journeyStepCount;
    private String firstJourneyStepName;
    private Boolean autoEnrollNewLeads;
    private Integer nurtureCadenceDays;
    private Integer nurtureTouchCount;
    private String primaryCallToAction;
    private Integer audienceSize;
    private BigDecimal budget;
    private BigDecimal expectedRevenue;
    private BigDecimal actualRevenue;
    private Integer leadsGenerated;
    private Integer opportunitiesCreated;
    private Integer conversions;
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID ownerId;
    private String ownerName;
    private BigDecimal roiPercent;
    private Long attributedLeadCount;
    private BigDecimal attributedPipelineValue;
    private String description;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
