package com.crm.dto.response;

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
public class AutomationRunResponseDTO {

    private UUID id;
    private String automationKey;
    private String automationName;
    private String triggerSource;
    private String runStatus;
    private Integer reviewedCount;
    private Integer actionCount;
    private Integer alreadyCoveredCount;
    private String summary;
    private LocalDateTime createdAt;
}
