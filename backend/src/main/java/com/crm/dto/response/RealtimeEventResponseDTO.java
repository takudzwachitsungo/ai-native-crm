package com.crm.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RealtimeEventResponseDTO {

    private String eventType;
    private String entityType;
    private String entityId;
    private String scope;
    private Map<String, Object> payload;
    private LocalDateTime occurredAt;
}
