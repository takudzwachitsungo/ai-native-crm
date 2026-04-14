package com.crm.entity;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.TaskPriority;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "nurture_journey_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NurtureJourneyStep extends AbstractEntity {

    @Column(name = "journey_id", nullable = false)
    private UUID journeyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id", insertable = false, updatable = false)
    private NurtureJourney journey;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    @Column(name = "wait_days", nullable = false)
    private Integer waitDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CampaignChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_priority", nullable = false, length = 50)
    private TaskPriority taskPriority;

    @Column(length = 255)
    private String objective;

    @Column(name = "task_title_template", length = 255)
    private String taskTitleTemplate;

    @Column(name = "task_description_template", columnDefinition = "TEXT")
    private String taskDescriptionTemplate;

    @Column(name = "call_to_action", length = 255)
    private String callToAction;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
