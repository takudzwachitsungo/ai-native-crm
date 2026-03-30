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
public class DealApprovalWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean requireApprovalForHighRisk;
    private BigDecimal valueApprovalThreshold;
    private Integer approvalTaskDueDays;
    private TaskPriority approvalTaskPriority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
