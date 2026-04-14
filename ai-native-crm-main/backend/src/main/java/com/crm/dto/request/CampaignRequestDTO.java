package com.crm.dto.request;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.CampaignJourneyStage;
import com.crm.entity.enums.CampaignSegmentType;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.CampaignType;
import jakarta.validation.constraints.*;
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
public class CampaignRequestDTO {

    @NotBlank(message = "Campaign name is required")
    @Size(max = 255, message = "Campaign name must be less than 255 characters")
    private String name;

    @NotNull(message = "Campaign type is required")
    private CampaignType type;

    @NotNull(message = "Campaign status is required")
    private CampaignStatus status;

    @NotNull(message = "Campaign channel is required")
    private CampaignChannel channel;

    @Size(max = 255, message = "Target audience must be less than 255 characters")
    private String targetAudience;

    private CampaignSegmentType segmentType;

    @Size(max = 120, message = "Segment name must be less than 120 characters")
    private String segmentName;

    private UUID segmentId;

    @Size(max = 120, message = "Primary persona must be less than 120 characters")
    private String primaryPersona;

    @Size(max = 120, message = "Territory focus must be less than 120 characters")
    private String territoryFocus;

    private CampaignJourneyStage journeyStage;

    private UUID journeyId;

    private Boolean autoEnrollNewLeads;

    @Min(value = 1, message = "Nurture cadence must be at least 1 day")
    @Max(value = 30, message = "Nurture cadence must be 30 days or less")
    private Integer nurtureCadenceDays;

    @Min(value = 1, message = "Nurture touch count must be at least 1")
    @Max(value = 20, message = "Nurture touch count must be 20 or less")
    private Integer nurtureTouchCount;

    @Size(max = 255, message = "Primary call to action must be less than 255 characters")
    private String primaryCallToAction;

    @Min(value = 0, message = "Audience size must be non-negative")
    private Integer audienceSize;

    @DecimalMin(value = "0.0", message = "Budget must be non-negative")
    private BigDecimal budget;

    @DecimalMin(value = "0.0", message = "Expected revenue must be non-negative")
    private BigDecimal expectedRevenue;

    @DecimalMin(value = "0.0", message = "Actual revenue must be non-negative")
    private BigDecimal actualRevenue;

    @Min(value = 0, message = "Leads generated must be non-negative")
    private Integer leadsGenerated;

    @Min(value = 0, message = "Opportunities created must be non-negative")
    private Integer opportunitiesCreated;

    @Min(value = 0, message = "Conversions must be non-negative")
    private Integer conversions;

    private LocalDate startDate;

    private LocalDate endDate;

    private UUID ownerId;

    private String description;

    private String notes;
}
