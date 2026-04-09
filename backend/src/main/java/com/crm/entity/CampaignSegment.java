package com.crm.entity;

import com.crm.entity.enums.CampaignSegmentType;
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
@Table(name = "campaign_segments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignSegment extends AbstractEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment_type", nullable = false, length = 50)
    private CampaignSegmentType segmentType;

    @Column(name = "target_audience", length = 255)
    private String targetAudience;

    @Column(name = "primary_persona", length = 120)
    private String primaryPersona;

    @Column(name = "territory_focus", length = 120)
    private String territoryFocus;

    @Column(name = "min_lead_score")
    private Integer minLeadScore;

    @Column(name = "min_estimated_value", precision = 19, scale = 2)
    private BigDecimal minEstimatedValue;

    @Column(name = "max_estimated_value", precision = 19, scale = 2)
    private BigDecimal maxEstimatedValue;

    @Column(name = "title_keyword", length = 120)
    private String titleKeyword;

    @Column(name = "company_keyword", length = 120)
    private String companyKeyword;

    @Column(name = "source_filters", columnDefinition = "TEXT[]")
    private String[] sourceFilters;

    @Column(name = "status_filters", columnDefinition = "TEXT[]")
    private String[] statusFilters;

    @Column(name = "include_campaign_attributed_only", nullable = false)
    private Boolean includeCampaignAttributedOnly = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
