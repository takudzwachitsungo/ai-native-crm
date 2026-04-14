package com.crm.dto.response;

import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.AutomationExecutionMode;
import com.crm.entity.enums.AutomationModule;
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
public class AutomationRuleResponseDTO {

    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private AutomationModule module;
    private AutomationEventType eventType;
    private AutomationExecutionMode executionMode;
    private String conditionsJson;
    private String actionsJson;
    private Integer priorityOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
