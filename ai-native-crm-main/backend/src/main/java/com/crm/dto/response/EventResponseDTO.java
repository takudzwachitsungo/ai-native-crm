package com.crm.dto.response;

import com.crm.entity.enums.EventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private EventType eventType;
    private String location;
    private String meetingLink;
    private UUID organizerId;
    private String organizerName;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private Boolean isAllDay;
    private Long durationMinutes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
