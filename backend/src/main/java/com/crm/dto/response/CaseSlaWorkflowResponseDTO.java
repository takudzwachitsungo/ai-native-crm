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
public class CaseSlaWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean autoResponseTargetsEnabled;
    private Boolean autoResolutionTargetsEnabled;
    private Integer urgentResponseHours;
    private Integer highResponseHours;
    private Integer mediumResponseHours;
    private Integer lowResponseHours;
    private Integer urgentResolutionHours;
    private Integer highResolutionHours;
    private Integer mediumResolutionHours;
    private Integer lowResolutionHours;
    private Integer premiumResponseMultiplierPercent;
    private Integer strategicResponseMultiplierPercent;
    private Integer premiumResolutionMultiplierPercent;
    private Integer strategicResolutionMultiplierPercent;
    private Boolean createBreachTasks;
    private Integer responseBreachTaskDueDays;
    private Integer resolutionBreachTaskDueDays;
    private TaskPriority responseBreachTaskPriority;
    private TaskPriority resolutionBreachTaskPriority;
    private Boolean autoEscalateBreachedCases;
    private Boolean escalateOnResponseBreach;
    private Boolean escalateOnResolutionBreach;
    private Integer escalationTaskDueDays;
    private TaskPriority escalationTaskPriority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
