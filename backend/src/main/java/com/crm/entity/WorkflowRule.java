package com.crm.entity;

import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.WorkflowRuleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "workflow_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowRule extends AbstractEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 50)
    private WorkflowRuleType ruleType;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "auto_assignment_enabled", nullable = false)
    private Boolean autoAssignmentEnabled = true;

    @Column(name = "prefer_territory_match", nullable = false)
    private Boolean preferTerritoryMatch = true;

    @Column(name = "fallback_to_load_balance", nullable = false)
    private Boolean fallbackToLoadBalance = true;

    @Column(name = "auto_follow_up_enabled", nullable = false)
    private Boolean autoFollowUpEnabled = true;

    @Column(name = "default_follow_up_days", nullable = false)
    private Integer defaultFollowUpDays = 3;

    @Column(name = "referral_follow_up_days", nullable = false)
    private Integer referralFollowUpDays = 2;

    @Column(name = "fast_track_follow_up_days", nullable = false)
    private Integer fastTrackFollowUpDays = 1;

    @Column(name = "fast_track_score_threshold", nullable = false)
    private Integer fastTrackScoreThreshold = 80;

    @Column(name = "fast_track_value_threshold", nullable = false, precision = 19, scale = 2)
    private BigDecimal fastTrackValueThreshold = BigDecimal.valueOf(50000);

    @Enumerated(EnumType.STRING)
    @Column(name = "default_task_priority", nullable = false, length = 20)
    private TaskPriority defaultTaskPriority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "fast_track_task_priority", nullable = false, length = 20)
    private TaskPriority fastTrackTaskPriority = TaskPriority.HIGH;

    @Column(name = "review_stalled_deals", nullable = false)
    private Boolean reviewStalledDeals = true;

    @Column(name = "review_high_risk_deals", nullable = false)
    private Boolean reviewHighRiskDeals = true;

    @Column(name = "review_overdue_next_steps", nullable = false)
    private Boolean reviewOverdueNextSteps = true;

    @Column(name = "review_territory_mismatch", nullable = false)
    private Boolean reviewTerritoryMismatch = true;

    @Column(name = "stalled_deal_days", nullable = false)
    private Integer stalledDealDays = 14;

    @Column(name = "rescue_task_due_days", nullable = false)
    private Integer rescueTaskDueDays = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "rescue_task_priority", nullable = false, length = 20)
    private TaskPriority rescueTaskPriority = TaskPriority.HIGH;

    @Column(name = "include_watch_reps", nullable = false)
    private Boolean includeWatchReps = true;

    @Column(name = "include_at_risk_reps", nullable = false)
    private Boolean includeAtRiskReps = true;

    @Column(name = "watch_task_due_days", nullable = false)
    private Integer watchTaskDueDays = 1;

    @Column(name = "at_risk_task_due_days", nullable = false)
    private Integer atRiskTaskDueDays = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "watch_task_priority", nullable = false, length = 20)
    private TaskPriority watchTaskPriority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "at_risk_task_priority", nullable = false, length = 20)
    private TaskPriority atRiskTaskPriority = TaskPriority.HIGH;

    @Column(name = "require_approval_for_high_risk", nullable = false)
    private Boolean requireApprovalForHighRisk = true;

    @Column(name = "value_approval_threshold", nullable = false, precision = 19, scale = 2)
    private BigDecimal valueApprovalThreshold = BigDecimal.valueOf(100000);

    @Column(name = "approval_task_due_days", nullable = false)
    private Integer approvalTaskDueDays = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_task_priority", nullable = false, length = 20)
    private TaskPriority approvalTaskPriority = TaskPriority.HIGH;

    @Column(name = "digest_cadence_days", nullable = false)
    private Integer digestCadenceDays = 1;

    @Column(name = "digest_task_due_days", nullable = false)
    private Integer digestTaskDueDays = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "digest_task_priority", nullable = false, length = 20)
    private TaskPriority digestTaskPriority = TaskPriority.MEDIUM;

    @Column(name = "elevate_digest_for_sla_breaches", nullable = false)
    private Boolean elevateDigestForSlaBreaches = true;

    @Column(name = "watch_review_days", nullable = false)
    private Integer watchReviewDays = 1;

    @Column(name = "high_review_days", nullable = false)
    private Integer highReviewDays = 3;

    @Column(name = "critical_review_days", nullable = false)
    private Integer criticalReviewDays = 5;

    @Enumerated(EnumType.STRING)
    @Column(name = "overdue_review_task_priority", nullable = false, length = 20)
    private TaskPriority overdueReviewTaskPriority = TaskPriority.HIGH;

    @Column(name = "overdue_escalation_task_due_days", nullable = false)
    private Integer overdueEscalationTaskDueDays = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "overdue_escalation_task_priority", nullable = false, length = 20)
    private TaskPriority overdueEscalationTaskPriority = TaskPriority.HIGH;

    @Column(name = "include_watch_escalations", nullable = false)
    private Boolean includeWatchEscalations = true;

    @Column(name = "critical_high_severity_threshold", nullable = false)
    private Integer criticalHighSeverityThreshold = 2;

    @Column(name = "critical_repeated_mismatch_threshold", nullable = false)
    private Integer criticalRepeatedMismatchThreshold = 2;

    @Column(name = "critical_deal_exception_threshold", nullable = false)
    private Integer criticalDealExceptionThreshold = 2;

    @Column(name = "critical_pipeline_exposure_threshold", nullable = false, precision = 19, scale = 2)
    private BigDecimal criticalPipelineExposureThreshold = BigDecimal.valueOf(100000);

    @Column(name = "high_total_exception_threshold", nullable = false)
    private Integer highTotalExceptionThreshold = 2;

    @Column(name = "high_high_severity_threshold", nullable = false)
    private Integer highHighSeverityThreshold = 1;

    @Column(name = "high_repeated_mismatch_threshold", nullable = false)
    private Integer highRepeatedMismatchThreshold = 1;

    @Column(name = "high_pipeline_exposure_threshold", nullable = false, precision = 19, scale = 2)
    private BigDecimal highPipelineExposureThreshold = BigDecimal.valueOf(25000);

    @Column(name = "watch_escalation_sla_days", nullable = false)
    private Integer watchEscalationSlaDays = 7;

    @Column(name = "high_escalation_sla_days", nullable = false)
    private Integer highEscalationSlaDays = 5;

    @Column(name = "critical_escalation_sla_days", nullable = false)
    private Integer criticalEscalationSlaDays = 2;

    @Column(name = "watch_escalation_task_due_days", nullable = false)
    private Integer watchEscalationTaskDueDays = 1;

    @Column(name = "high_escalation_task_due_days", nullable = false)
    private Integer highEscalationTaskDueDays = 1;

    @Column(name = "critical_escalation_task_due_days", nullable = false)
    private Integer criticalEscalationTaskDueDays = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "watch_escalation_task_priority", nullable = false, length = 20)
    private TaskPriority watchEscalationTaskPriority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "high_escalation_task_priority", nullable = false, length = 20)
    private TaskPriority highEscalationTaskPriority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "critical_escalation_task_priority", nullable = false, length = 20)
    private TaskPriority criticalEscalationTaskPriority = TaskPriority.HIGH;
}
