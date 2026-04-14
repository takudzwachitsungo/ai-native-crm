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
public class GovernanceOpsWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    @Min(value = 1, message = "Digest cadence must be at least 1 day")
    @Max(value = 30, message = "Digest cadence must be 30 days or less")
    private Integer digestCadenceDays;

    @NotNull
    @Min(value = 0, message = "Digest task due days must be 0 or greater")
    @Max(value = 30, message = "Digest task due days must be 30 or less")
    private Integer digestTaskDueDays;

    @NotNull
    private TaskPriority digestTaskPriority;

    @NotNull
    private Boolean elevateDigestForSlaBreaches;

    @NotNull
    @Min(value = 1, message = "Watch review days must be at least 1 day")
    @Max(value = 30, message = "Watch review days must be 30 days or less")
    private Integer watchReviewDays;

    @NotNull
    @Min(value = 2, message = "High review days must be at least 2 days")
    @Max(value = 30, message = "High review days must be 30 days or less")
    private Integer highReviewDays;

    @NotNull
    @Min(value = 3, message = "Critical review days must be at least 3 days")
    @Max(value = 30, message = "Critical review days must be 30 days or less")
    private Integer criticalReviewDays;

    @NotNull
    private TaskPriority overdueReviewTaskPriority;

    @NotNull
    @Min(value = 0, message = "Overdue escalation due days must be 0 or greater")
    @Max(value = 30, message = "Overdue escalation due days must be 30 days or less")
    private Integer overdueEscalationTaskDueDays;

    @NotNull
    private TaskPriority overdueEscalationTaskPriority;
}
