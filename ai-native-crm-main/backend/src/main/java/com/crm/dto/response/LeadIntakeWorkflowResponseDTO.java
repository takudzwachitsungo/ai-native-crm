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
public class LeadIntakeWorkflowResponseDTO {

    private UUID id;
    private String ruleType;
    private String name;
    private String description;
    private Boolean isActive;
    private Boolean autoAssignmentEnabled;
    private Boolean preferTerritoryMatch;
    private Boolean fallbackToLoadBalance;
    private Boolean autoFollowUpEnabled;
    private Integer defaultFollowUpDays;
    private Integer referralFollowUpDays;
    private Integer fastTrackFollowUpDays;
    private Integer fastTrackScoreThreshold;
    private BigDecimal fastTrackValueThreshold;
    private TaskPriority defaultTaskPriority;
    private TaskPriority fastTrackTaskPriority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
