package com.crm.dto.response;

import com.crm.entity.enums.CampaignJourneyStage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NurtureJourneyResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private CampaignJourneyStage journeyStage;
    private Boolean autoEnrollNewLeads;
    private Integer defaultCadenceDays;
    private Integer defaultTouchCount;
    private String defaultCallToAction;
    private String successMetric;
    private Boolean isActive;
    private String notes;
    private Long campaignsUsingJourney;
    private Long stepCount;
    private String firstActiveStepName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
