package com.crm.dto.request;

import com.crm.entity.enums.EventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class EventRequestDTO {
    
    @NotBlank(message = "Event title is required")
    @Size(max = 200, message = "Title must be less than 200 characters")
    private String title;
    
    private String description;
    
    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;
    
    @NotNull(message = "End time is required")
    private LocalDateTime endTime;
    
    @NotNull(message = "Event type is required")
    private EventType eventType;
    
    @Size(max = 200, message = "Location must be less than 200 characters")
    private String location;
    
    private String meetingLink;
    
    private UUID organizerId;
    
    private String relatedEntityType;
    
    private UUID relatedEntityId;
    
    private Boolean isAllDay;
}
