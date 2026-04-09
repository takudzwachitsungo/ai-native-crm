package com.crm.entity;

import com.crm.entity.enums.CampaignJourneyStage;
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

@Entity
@Table(name = "nurture_journeys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NurtureJourney extends AbstractEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "journey_stage", nullable = false, length = 50)
    private CampaignJourneyStage journeyStage;

    @Column(name = "auto_enroll_new_leads", nullable = false)
    private Boolean autoEnrollNewLeads = true;

    @Column(name = "default_cadence_days")
    private Integer defaultCadenceDays;

    @Column(name = "default_touch_count")
    private Integer defaultTouchCount;

    @Column(name = "default_call_to_action", length = 255)
    private String defaultCallToAction;

    @Column(name = "success_metric", length = 255)
    private String successMetric;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
