package com.crm.service;

import com.crm.dto.response.AutomationRunResponseDTO;

import java.util.List;
import java.util.UUID;

public interface AutomationRunService {

    void recordRun(
            UUID tenantId,
            String automationKey,
            String automationName,
            String triggerSource,
            String runStatus,
            Integer reviewedCount,
            Integer actionCount,
            Integer alreadyCoveredCount,
            String summary
    );

    List<AutomationRunResponseDTO> getRecentRuns(UUID tenantId, int limit);
}
