package com.crm.dto.request;

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
public class EventFilterDTO {
    
    private String search;
    private EventType eventType;
    private UUID organizerId;
    private LocalDateTime startTimeFrom;
    private LocalDateTime startTimeTo;
    private String relatedEntityType;
    private UUID relatedEntityId;
}
