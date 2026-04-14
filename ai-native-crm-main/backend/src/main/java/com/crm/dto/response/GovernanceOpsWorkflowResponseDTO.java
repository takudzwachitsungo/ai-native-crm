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
public class GovernanceOpsWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Integer digestCadenceDays;
    private Integer digestTaskDueDays;
    private TaskPriority digestTaskPriority;
    private Boolean elevateDigestForSlaBreaches;
    private Integer watchReviewDays;
    private Integer highReviewDays;
    private Integer criticalReviewDays;
    private TaskPriority overdueReviewTaskPriority;
    private Integer overdueEscalationTaskDueDays;
    private TaskPriority overdueEscalationTaskPriority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
