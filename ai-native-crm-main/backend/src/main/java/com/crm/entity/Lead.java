package com.crm.entity;

import com.crm.entity.enums.CustomerPrivacyStatus;
import com.crm.entity.enums.DataEnrichmentStatus;
import com.crm.entity.enums.LeadSource;
import com.crm.entity.enums.LeadStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "leads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead extends AbstractEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    private String email;

    @Column(length = 50)
    private String phone;

    private String company;

    private String title;

    @Column(length = 120)
    private String territory;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private LeadSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private LeadStatus status = LeadStatus.NEW;

    @Column(columnDefinition = "INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100)")
    private Integer score = 0;

    @Column(name = "estimated_value", precision = 19, scale = 2)
    private BigDecimal estimatedValue;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Column(name = "last_contact_date")
    private LocalDateTime lastContactDate;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Column(name = "campaign_id")
    private UUID campaignId;

    @Column(name = "marketing_consent", nullable = false)
    private Boolean marketingConsent = Boolean.FALSE;

    @Column(name = "consent_captured_at")
    private LocalDateTime consentCapturedAt;

    @Column(name = "consent_source", length = 120)
    private String consentSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy_status", nullable = false, length = 30)
    private CustomerPrivacyStatus privacyStatus = CustomerPrivacyStatus.ACTIVE;

    @Column(name = "data_quality_score", nullable = false)
    private Integer dataQualityScore = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "enrichment_status", nullable = false, length = 30)
    private DataEnrichmentStatus enrichmentStatus = DataEnrichmentStatus.NOT_ENRICHED;

    @Column(name = "enrichment_last_checked_at")
    private LocalDateTime enrichmentLastCheckedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", insertable = false, updatable = false)
    private Campaign campaign;

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
