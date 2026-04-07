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
public class CaseSlaWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean autoResponseTargetsEnabled;

    @NotNull
    private Boolean autoResolutionTargetsEnabled;

    @NotNull
    @Min(1)
    @Max(72)
    private Integer urgentResponseHours;

    @NotNull
    @Min(1)
    @Max(120)
    private Integer highResponseHours;

    @NotNull
    @Min(1)
    @Max(168)
    private Integer mediumResponseHours;

    @NotNull
    @Min(1)
    @Max(240)
    private Integer lowResponseHours;

    @NotNull
    @Min(1)
    @Max(168)
    private Integer urgentResolutionHours;

    @NotNull
    @Min(1)
    @Max(240)
    private Integer highResolutionHours;

    @NotNull
    @Min(1)
    @Max(336)
    private Integer mediumResolutionHours;

    @NotNull
    @Min(1)
    @Max(720)
    private Integer lowResolutionHours;

    @NotNull
    @Min(25)
    @Max(100)
    private Integer premiumResponseMultiplierPercent;

    @NotNull
    @Min(25)
    @Max(100)
    private Integer strategicResponseMultiplierPercent;

    @NotNull
    @Min(25)
    @Max(100)
    private Integer premiumResolutionMultiplierPercent;

    @NotNull
    @Min(25)
    @Max(100)
    private Integer strategicResolutionMultiplierPercent;

    @NotNull
    private Boolean createBreachTasks;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer responseBreachTaskDueDays;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer resolutionBreachTaskDueDays;

    @NotNull
    private TaskPriority responseBreachTaskPriority;

    @NotNull
    private TaskPriority resolutionBreachTaskPriority;

    @NotNull
    private Boolean autoEscalateBreachedCases;

    @NotNull
    private Boolean escalateOnResponseBreach;

    @NotNull
    private Boolean escalateOnResolutionBreach;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer escalationTaskDueDays;

    @NotNull
    private TaskPriority escalationTaskPriority;
}
