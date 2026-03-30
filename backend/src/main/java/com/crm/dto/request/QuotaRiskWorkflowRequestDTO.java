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
public class QuotaRiskWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean includeWatchReps;

    @NotNull
    private Boolean includeAtRiskReps;

    @NotNull
    @Min(value = 0, message = "Watch task due days must be 0 or greater")
    @Max(value = 30, message = "Watch task due days must be 30 or less")
    private Integer watchTaskDueDays;

    @NotNull
    @Min(value = 0, message = "At-risk task due days must be 0 or greater")
    @Max(value = 30, message = "At-risk task due days must be 30 or less")
    private Integer atRiskTaskDueDays;

    @NotNull
    private TaskPriority watchTaskPriority;

    @NotNull
    private TaskPriority atRiskTaskPriority;
}
