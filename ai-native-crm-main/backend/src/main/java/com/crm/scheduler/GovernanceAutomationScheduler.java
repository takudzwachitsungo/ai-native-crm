package com.crm.scheduler;

import com.crm.config.TenantContext;
import com.crm.entity.Tenant;
import com.crm.repository.TenantRepository;
import com.crm.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GovernanceAutomationScheduler {

    private final TenantRepository tenantRepository;
    private final DashboardService dashboardService;

    @Value("${governance.automation.enabled:true}")
    private boolean automationEnabled;

    @Scheduled(
            fixedDelayString = "${governance.automation.interval-ms:3600000}",
            initialDelayString = "${governance.automation.initial-delay-ms:300000}"
    )
    public void runGovernanceAutomationSweep() {
        if (!automationEnabled) {
            return;
        }

        tenantRepository.findAll().stream()
                .filter(tenant -> Boolean.TRUE.equals(tenant.getIsActive()) && Boolean.FALSE.equals(tenant.getArchived()))
                .forEach(this::runForTenantSafely);
    }

    private void runForTenantSafely(Tenant tenant) {
        try {
            TenantContext.setTenantId(tenant.getId());
            dashboardService.runGovernanceAutomationScheduled();
        } catch (Exception exception) {
            log.warn("Governance automation failed for tenant {}", tenant.getId(), exception);
        } finally {
            TenantContext.clear();
        }
    }
}
