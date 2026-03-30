package com.crm.entity;

import com.crm.entity.enums.DealRiskLevel;
import com.crm.entity.enums.DealApprovalStatus;
import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.DealType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Deal extends AbstractEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", insertable = false, updatable = false)
    private Company company;

    @Column(name = "contact_id")
    private UUID contactId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id", insertable = false, updatable = false)
    private Contact contact;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DealStage stage = DealStage.PROSPECTING;

    @Column(columnDefinition = "INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100)")
    private Integer probability = 0;

    @Column(name = "expected_close_date")
    private LocalDate expectedCloseDate;

    @Column(name = "actual_close_date")
    private LocalDate actualCloseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "deal_type", length = 50)
    private DealType dealType;

    @Column(name = "lead_source", length = 50)
    private String leadSource;

    @Column(length = 120)
    private String territory;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "competitor_name", length = 255)
    private String competitorName;

    @Column(name = "next_step", length = 255)
    private String nextStep;

    @Column(name = "next_step_due_date")
    private LocalDate nextStepDueDate;

    @Column(name = "buying_committee_summary", columnDefinition = "TEXT")
    private String buyingCommitteeSummary;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 20)
    private DealRiskLevel riskLevel;

    @Column(name = "win_reason", columnDefinition = "TEXT")
    private String winReason;

    @Column(name = "loss_reason", columnDefinition = "TEXT")
    private String lossReason;

    @Column(name = "close_notes", columnDefinition = "TEXT")
    private String closeNotes;

    @Column(name = "stage_changed_at")
    private LocalDateTime stageChangedAt;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private DealApprovalStatus approvalStatus = DealApprovalStatus.NONE;

    @Column(name = "approval_requested_at")
    private LocalDateTime approvalRequestedAt;

    @Column(name = "approval_requested_by")
    private UUID approvalRequestedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approval_requested_by", insertable = false, updatable = false)
    private User approvalRequester;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by", insertable = false, updatable = false)
    private User approver;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejected_by")
    private UUID rejectedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejected_by", insertable = false, updatable = false)
    private User rejector;

    @Column(name = "approval_notes", columnDefinition = "TEXT")
    private String approvalNotes;

    @Transient
    public String getCompanyName() {
        return company != null ? company.getName() : null;
    }

    @Transient
    public String getContactName() {
        return contact != null ? contact.getFullName() : null;
    }

    @Transient
    public BigDecimal getWeightedValue() {
        if (value == null || probability == null) {
            return BigDecimal.ZERO;
        }
        return value.multiply(BigDecimal.valueOf(probability)).divide(BigDecimal.valueOf(100));
    }
}
