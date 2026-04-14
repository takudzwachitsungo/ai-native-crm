package com.crm.entity;

import com.crm.entity.enums.EventType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event extends AbstractEntity {

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "start_date_time", nullable = false)
    private LocalDateTime startDateTime;

    @Column(name = "end_date_time", nullable = false)
    private LocalDateTime endDateTime;

    @Column(length = 50)
    private String duration;

    @Column(length = 500)
    private String location;

    @Column(columnDefinition = "TEXT[]")
    private String[] attendees;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Column(name = "external_provider", length = 100)
    private String externalProvider;

    @Column(name = "external_event_id", length = 255)
    private String externalEventId;

    @Column(name = "provider_synced_at")
    private LocalDateTime providerSyncedAt;
}
