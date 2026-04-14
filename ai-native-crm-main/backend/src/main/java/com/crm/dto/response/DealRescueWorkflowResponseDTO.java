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
public class DealRescueWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean reviewStalledDeals;
    private Boolean reviewHighRiskDeals;
    private Boolean reviewOverdueNextSteps;
    private Boolean reviewTerritoryMismatch;
    private Integer stalledDealDays;
    private Integer rescueTaskDueDays;
    private TaskPriority rescueTaskPriority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
