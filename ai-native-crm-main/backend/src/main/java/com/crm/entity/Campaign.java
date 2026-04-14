package com.crm.entity;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.CampaignJourneyStage;
import com.crm.entity.enums.CampaignSegmentType;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.CampaignType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campaign extends AbstractEntity {

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CampaignType type = CampaignType.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CampaignStatus status = CampaignStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CampaignChannel channel = CampaignChannel.MULTI_CHANNEL;

    @Column(name = "target_audience", length = 255)
    private String targetAudience;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment_type", length = 50)
    private CampaignSegmentType segmentType;

    @Column(name = "segment_name", length = 120)
    private String segmentName;

    @Column(name = "segment_id")
    private UUID segmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "segment_id", insertable = false, updatable = false)
    private CampaignSegment segment;

    @Column(name = "primary_persona", length = 120)
    private String primaryPersona;

    @Column(name = "territory_focus", length = 120)
    private String territoryFocus;

    @Enumerated(EnumType.STRING)
    @Column(name = "journey_stage", length = 50)
    private CampaignJourneyStage journeyStage;

    @Column(name = "journey_id")
    private UUID journeyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id", insertable = false, updatable = false)
    private NurtureJourney journey;

    @Column(name = "auto_enroll_new_leads", nullable = false)
    private Boolean autoEnrollNewLeads = true;

    @Column(name = "nurture_cadence_days")
    private Integer nurtureCadenceDays;

    @Column(name = "nurture_touch_count")
    private Integer nurtureTouchCount;

    @Column(name = "primary_call_to_action", length = 255)
    private String primaryCallToAction;

    @Column(name = "audience_size")
    private Integer audienceSize;

    @Column(precision = 19, scale = 2)
    private BigDecimal budget;

    @Column(name = "expected_revenue", precision = 19, scale = 2)
    private BigDecimal expectedRevenue;

    @Column(name = "actual_revenue", precision = 19, scale = 2)
    private BigDecimal actualRevenue;

    @Column(name = "leads_generated")
    private Integer leadsGenerated;

    @Column(name = "opportunities_created")
    private Integer opportunitiesCreated;

    @Column(name = "conversions")
    private Integer conversions;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "owner_id")
    private UUID ownerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Transient
    public BigDecimal getRoiPercent() {
        if (budget == null || actualRevenue == null || budget.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return actualRevenue.subtract(budget)
                .divide(budget, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
}
