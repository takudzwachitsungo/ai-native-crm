package com.crm.dto.response;

import com.crm.entity.enums.TaskPriority;
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
public class CaseAssignmentWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean autoAssignUnassignedCases;
    private Boolean autoReassignEscalatedCases;
    private Boolean preferAccountOwner;
    private Boolean preferSeniorCoverageForHighTouch;
    private Boolean preferFrontlineForTierOne;
    private Boolean preferSpecialistCoverage;
    private Boolean createAssignmentTasks;
    private Integer defaultAssignmentTaskDueDays;
    private Integer urgentAssignmentTaskDueDays;
    private TaskPriority defaultAssignmentTaskPriority;
    private TaskPriority urgentAssignmentTaskPriority;
    private Integer frontlineQueueCapacity;
    private Integer specialistQueueCapacity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
