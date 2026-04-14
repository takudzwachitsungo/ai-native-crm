package com.crm.dto.response;

import com.crm.entity.enums.CampaignChannel;
import com.crm.entity.enums.TaskPriority;
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
public class NurtureJourneyStepResponseDTO {

    private UUID id;
    private UUID tenantId;
    private UUID journeyId;
    private String name;
    private Integer sequenceOrder;
    private Integer waitDays;
    private CampaignChannel channel;
    private TaskPriority taskPriority;
    private String objective;
    private String taskTitleTemplate;
    private String taskDescriptionTemplate;
    private String callToAction;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
