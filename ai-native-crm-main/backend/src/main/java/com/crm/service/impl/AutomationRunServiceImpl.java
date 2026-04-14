package com.crm.service.impl;

import com.crm.dto.response.AutomationRunResponseDTO;
import com.crm.entity.AutomationRun;
import com.crm.repository.AutomationRunRepository;
import com.crm.service.AutomationRunService;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AutomationRunServiceImpl implements AutomationRunService {

    private final AutomationRunRepository automationRunRepository;
    private final MeterRegistry meterRegistry;

    @Override
    @Transactional
    public void recordRun(
            UUID tenantId,
            String automationKey,
            String automationName,
            String triggerSource,
            String runStatus,
            Integer reviewedCount,
            Integer actionCount,
            Integer alreadyCoveredCount,
            String summary
    ) {
        if (tenantId == null) {
            return;
        }

        AutomationRun automationRun = AutomationRun.builder()
                .automationKey(automationKey)
                .automationName(automationName)
                .triggerSource(triggerSource)
                .runStatus(runStatus)
                .reviewedCount(reviewedCount)
                .actionCount(actionCount)
                .alreadyCoveredCount(alreadyCoveredCount)
                .summary(summary)
                .build();
        automationRun.setTenantId(tenantId);
        automationRunRepository.save(automationRun);
        meterRegistry.counter(
                "crm.automation.runs.total",
                "automationKey", safeTagValue(automationKey),
                "status", safeTagValue(runStatus),
                "triggerSource", safeTagValue(triggerSource)
        ).increment();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AutomationRunResponseDTO> getRecentRuns(UUID tenantId, int limit) {
        if (tenantId == null) {
            return List.of();
        }

        int boundedLimit = Math.max(1, Math.min(limit, 25));
        return automationRunRepository
                .findByTenantIdAndArchivedFalseOrderByCreatedAtDesc(tenantId, PageRequest.of(0, boundedLimit))
                .stream()
                .map(run -> AutomationRunResponseDTO.builder()
                        .id(run.getId())
                        .automationKey(run.getAutomationKey())
                        .automationName(run.getAutomationName())
                        .triggerSource(run.getTriggerSource())
                        .runStatus(run.getRunStatus())
                        .reviewedCount(run.getReviewedCount())
                        .actionCount(run.getActionCount())
                        .alreadyCoveredCount(run.getAlreadyCoveredCount())
                        .summary(run.getSummary())
                        .createdAt(run.getCreatedAt())
                        .build())
                .toList();
    }

    private String safeTagValue(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }
}
