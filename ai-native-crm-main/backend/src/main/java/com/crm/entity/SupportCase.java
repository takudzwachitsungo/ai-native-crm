package com.crm.entity;

import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseCustomerTier;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseSlaStatus;
import com.crm.entity.enums.SupportCaseSource;
import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCaseType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "support_cases", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"tenant_id", "case_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportCase extends AbstractEntity {

    @Column(name = "case_number", nullable = false, length = 50)
    private String caseNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SupportCaseStatus status = SupportCaseStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SupportCasePriority priority = SupportCasePriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SupportCaseSource source = SupportCaseSource.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_tier", nullable = false, length = 20)
    private SupportCaseCustomerTier customerTier = SupportCaseCustomerTier.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(name = "case_type", nullable = false, length = 30)
    private SupportCaseType caseType = SupportCaseType.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(name = "support_queue", nullable = false, length = 30)
    private SupportCaseQueue supportQueue = SupportCaseQueue.TIER_1;

    @Column(name = "company_id")
    private UUID companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;

    @Column(name = "contact_id")
    private UUID contactId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", insertable = false, updatable = false)
    private Contact contact;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Column(name = "response_due_at")
    private LocalDateTime responseDueAt;

    @Column(name = "first_responded_at")
    private LocalDateTime firstRespondedAt;

    @Column(name = "resolution_due_at")
    private LocalDateTime resolutionDueAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "customer_impact", length = 255)
    private String customerImpact;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "resolution_summary", columnDefinition = "TEXT")
    private String resolutionSummary;

    @Transient
    public Boolean getOverdueResponse() {
        return responseDueAt != null
                && firstRespondedAt == null
                && LocalDateTime.now().isAfter(responseDueAt)
                && status != SupportCaseStatus.RESOLVED
                && status != SupportCaseStatus.CLOSED;
    }

    @Transient
    public Boolean getOverdueResolution() {
        return resolutionDueAt != null
                && LocalDateTime.now().isAfter(resolutionDueAt)
                && status != SupportCaseStatus.RESOLVED
                && status != SupportCaseStatus.CLOSED;
    }

    @Transient
    public SupportCaseSlaStatus getResponseSlaStatus() {
        return evaluateSlaStatus(responseDueAt, firstRespondedAt, 4);
    }

    @Transient
    public SupportCaseSlaStatus getResolutionSlaStatus() {
        return evaluateSlaStatus(resolutionDueAt, resolvedAt, 24);
    }

    private SupportCaseSlaStatus evaluateSlaStatus(LocalDateTime dueAt, LocalDateTime fulfilledAt, long watchHours) {
        if (fulfilledAt != null) {
            return SupportCaseSlaStatus.MET;
        }
        if (dueAt == null) {
            return SupportCaseSlaStatus.ON_TRACK;
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(dueAt)) {
            return SupportCaseSlaStatus.BREACHED;
        }

        long minutesUntilDue = Math.max(0L, Duration.between(now, dueAt).toMinutes());
        long watchWindowMinutes = Math.min(
                watchHours * 60L,
                Math.max(60L, minutesUntilDue / 2L)
        );

        if (now.plusMinutes(watchWindowMinutes).isAfter(dueAt)) {
            return SupportCaseSlaStatus.WATCH;
        }

        return SupportCaseSlaStatus.ON_TRACK;
    }
}
