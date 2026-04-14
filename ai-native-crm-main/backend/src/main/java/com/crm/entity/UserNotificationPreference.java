package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(
        name = "user_notification_preferences",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"tenant_id", "user_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotificationPreference extends AbstractEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "email_notifications_enabled", nullable = false)
    @Builder.Default
    private Boolean emailNotificationsEnabled = true;

    @Column(name = "push_notifications_enabled", nullable = false)
    @Builder.Default
    private Boolean pushNotificationsEnabled = true;

    @Column(name = "lead_assignment_enabled", nullable = false)
    @Builder.Default
    private Boolean leadAssignmentEnabled = true;

    @Column(name = "deal_stage_changes_enabled", nullable = false)
    @Builder.Default
    private Boolean dealStageChangesEnabled = true;

    @Column(name = "task_reminders_enabled", nullable = false)
    @Builder.Default
    private Boolean taskRemindersEnabled = true;

    @Column(name = "team_mentions_enabled", nullable = false)
    @Builder.Default
    private Boolean teamMentionsEnabled = true;

    @Column(name = "weekly_reports_enabled", nullable = false)
    @Builder.Default
    private Boolean weeklyReportsEnabled = true;
}
