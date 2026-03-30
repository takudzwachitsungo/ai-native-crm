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
public class LeadIntakeWorkflowRequestDTO {

    @Size(max = 120, message = "Workflow name must be less than 120 characters")
    private String name;

    @Size(max = 1000, message = "Workflow description must be less than 1000 characters")
    private String description;

    @NotNull
    private Boolean isActive;

    @NotNull
    private Boolean autoAssignmentEnabled;

    @NotNull
    private Boolean preferTerritoryMatch;

    @NotNull
    private Boolean fallbackToLoadBalance;

    @NotNull
    private Boolean autoFollowUpEnabled;

    @NotNull
    @Min(value = 0, message = "Default follow-up days must be 0 or greater")
    @Max(value = 30, message = "Default follow-up days must be 30 or less")
    private Integer defaultFollowUpDays;

    @NotNull
    @Min(value = 0, message = "Referral follow-up days must be 0 or greater")
    @Max(value = 30, message = "Referral follow-up days must be 30 or less")
    private Integer referralFollowUpDays;

    @NotNull
    @Min(value = 0, message = "Fast-track follow-up days must be 0 or greater")
    @Max(value = 30, message = "Fast-track follow-up days must be 30 or less")
    private Integer fastTrackFollowUpDays;

    @NotNull
    @Min(value = 0, message = "Fast-track score threshold must be between 0 and 100")
    @Max(value = 100, message = "Fast-track score threshold must be between 0 and 100")
    private Integer fastTrackScoreThreshold;

    @NotNull
    @DecimalMin(value = "0.0", message = "Fast-track value threshold must be positive")
    private BigDecimal fastTrackValueThreshold;

    @NotNull
    private TaskPriority defaultTaskPriority;

    @NotNull
    private TaskPriority fastTrackTaskPriority;
}
