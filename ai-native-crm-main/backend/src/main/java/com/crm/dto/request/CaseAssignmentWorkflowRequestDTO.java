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
public class CaseAssignmentWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean autoAssignUnassignedCases;

    @NotNull
    private Boolean autoReassignEscalatedCases;

    @NotNull
    private Boolean preferAccountOwner;

    @NotNull
    private Boolean preferSeniorCoverageForHighTouch;

    @NotNull
    private Boolean preferFrontlineForTierOne;

    @NotNull
    private Boolean preferSpecialistCoverage;

    @NotNull
    private Boolean createAssignmentTasks;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer defaultAssignmentTaskDueDays;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer urgentAssignmentTaskDueDays;

    @NotNull
    private TaskPriority defaultAssignmentTaskPriority;

    @NotNull
    private TaskPriority urgentAssignmentTaskPriority;

    @NotNull
    @Min(1)
    @Max(50)
    private Integer frontlineQueueCapacity;

    @NotNull
    @Min(1)
    @Max(50)
    private Integer specialistQueueCapacity;
}
