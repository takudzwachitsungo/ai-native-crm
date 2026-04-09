package com.crm.dto.request;

import com.crm.entity.enums.TaskPriority;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class CampaignNurtureWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean requireActiveCampaign;

    @NotNull
    @Min(value = 0, message = "Campaign score boost must be between 0 and 100")
    @Max(value = 100, message = "Campaign score boost must be between 0 and 100")
    private Integer campaignScoreBoost;

    @NotNull
    @Min(value = 0, message = "Campaign follow-up days must be 0 or greater")
    @Max(value = 30, message = "Campaign follow-up days must be 30 or less")
    private Integer campaignFollowUpDays;

    @NotNull
    private TaskPriority campaignTaskPriority;
}
