package com.crm.service;

import com.crm.entity.enums.AutomationEventType;

import java.util.UUID;

public interface AutomationExecutionService {

    AutomationExecutionOutcome executeRealTimeRules(
            UUID tenantId,
            AutomationEventType eventType,
            AutomationExecutionTargets targets
    );
}
