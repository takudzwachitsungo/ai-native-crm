package com.crm.dto.request;

import com.crm.entity.enums.TaskPriority;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryEscalationWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean includeWatchEscalations;

    @NotNull
    @Min(1)
    @Max(20)
    private Integer criticalHighSeverityThreshold;

    @NotNull
    @Min(1)
    @Max(20)
    private Integer criticalRepeatedMismatchThreshold;

    @NotNull
    @Min(1)
    @Max(20)
    private Integer criticalDealExceptionThreshold;

    @NotNull
    @DecimalMin(value = "0.00", inclusive = false)
    private BigDecimal criticalPipelineExposureThreshold;

    @NotNull
    @Min(1)
    @Max(20)
    private Integer highTotalExceptionThreshold;

    @NotNull
    @Min(0)
    @Max(20)
    private Integer highHighSeverityThreshold;

    @NotNull
    @Min(0)
    @Max(20)
    private Integer highRepeatedMismatchThreshold;

    @NotNull
    @DecimalMin(value = "0.00", inclusive = false)
    private BigDecimal highPipelineExposureThreshold;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer watchEscalationSlaDays;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer highEscalationSlaDays;

    @NotNull
    @Min(1)
    @Max(30)
    private Integer criticalEscalationSlaDays;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer watchEscalationTaskDueDays;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer highEscalationTaskDueDays;

    @NotNull
    @Min(0)
    @Max(30)
    private Integer criticalEscalationTaskDueDays;

    @NotNull
    private TaskPriority watchEscalationTaskPriority;

    @NotNull
    private TaskPriority highEscalationTaskPriority;

    @NotNull
    private TaskPriority criticalEscalationTaskPriority;
}
