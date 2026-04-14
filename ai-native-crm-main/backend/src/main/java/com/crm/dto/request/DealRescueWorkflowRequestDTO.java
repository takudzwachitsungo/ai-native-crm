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
public class DealRescueWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean reviewStalledDeals;

    @NotNull
    private Boolean reviewHighRiskDeals;

    @NotNull
    private Boolean reviewOverdueNextSteps;

    @NotNull
    private Boolean reviewTerritoryMismatch;

    @NotNull
    @Min(value = 1, message = "Stalled deal threshold must be at least 1 day")
    @Max(value = 90, message = "Stalled deal threshold must be 90 days or less")
    private Integer stalledDealDays;

    @NotNull
    @Min(value = 0, message = "Rescue task due days must be 0 or greater")
    @Max(value = 30, message = "Rescue task due days must be 30 or less")
    private Integer rescueTaskDueDays;

    @NotNull
    private TaskPriority rescueTaskPriority;
}
