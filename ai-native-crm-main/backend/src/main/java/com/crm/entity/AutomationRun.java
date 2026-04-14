package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "automation_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationRun extends AbstractEntity {

    @Column(name = "automation_key", nullable = false, length = 80)
    private String automationKey;

    @Column(name = "automation_name", nullable = false, length = 160)
    private String automationName;

    @Column(name = "trigger_source", nullable = false, length = 30)
    private String triggerSource;

    @Column(name = "run_status", nullable = false, length = 30)
    private String runStatus;

    @Column(name = "reviewed_count")
    private Integer reviewedCount;

    @Column(name = "action_count")
    private Integer actionCount;

    @Column(name = "already_covered_count")
    private Integer alreadyCoveredCount;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;
}
