package com.crm.dto.request;

import com.crm.entity.enums.CampaignJourneyStage;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NurtureJourneyRequestDTO {

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotNull
    private CampaignJourneyStage journeyStage;

    @NotNull
    private Boolean autoEnrollNewLeads;

    @Min(1)
    @Max(30)
    private Integer defaultCadenceDays;

    @Min(1)
    @Max(20)
    private Integer defaultTouchCount;

    @Size(max = 255)
    private String defaultCallToAction;

    @Size(max = 255)
    private String successMetric;

    @NotNull
    private Boolean isActive;

    @Size(max = 2000)
    private String notes;
}
