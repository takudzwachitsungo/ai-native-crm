package com.crm.dto.response;

import com.crm.entity.enums.TaskPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryEscalationWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean includeWatchEscalations;
    private Integer criticalHighSeverityThreshold;
    private Integer criticalRepeatedMismatchThreshold;
    private Integer criticalDealExceptionThreshold;
    private BigDecimal criticalPipelineExposureThreshold;
    private Integer highTotalExceptionThreshold;
    private Integer highHighSeverityThreshold;
    private Integer highRepeatedMismatchThreshold;
    private BigDecimal highPipelineExposureThreshold;
    private Integer watchEscalationSlaDays;
    private Integer highEscalationSlaDays;
    private Integer criticalEscalationSlaDays;
    private Integer watchEscalationTaskDueDays;
    private Integer highEscalationTaskDueDays;
    private Integer criticalEscalationTaskDueDays;
    private TaskPriority watchEscalationTaskPriority;
    private TaskPriority highEscalationTaskPriority;
    private TaskPriority criticalEscalationTaskPriority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
