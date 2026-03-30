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
public class DealApprovalWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean requireApprovalForHighRisk;

    @NotNull
    @DecimalMin(value = "0.00", inclusive = false, message = "Approval threshold must be greater than zero")
    private BigDecimal valueApprovalThreshold;

    @NotNull
    @Min(value = 0, message = "Approval task due days must be 0 or greater")
    @Max(value = 30, message = "Approval task due days must be 30 or less")
    private Integer approvalTaskDueDays;

    @NotNull
    private TaskPriority approvalTaskPriority;
}
