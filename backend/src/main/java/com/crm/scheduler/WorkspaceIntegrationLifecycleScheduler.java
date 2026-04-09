package com.crm.scheduler;

import com.crm.config.TenantContext;
import com.crm.entity.Tenant;
import com.crm.repository.TenantRepository;
import com.crm.service.WorkspaceGoogleWorkspaceSyncService;
import com.crm.service.WorkspaceMicrosoft365SyncService;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkspaceIntegrationLifecycleScheduler {

    private final TenantRepository tenantRepository;
    private final WorkspaceMicrosoft365SyncService workspaceMicrosoft365SyncService;
    private final WorkspaceGoogleWorkspaceSyncService workspaceGoogleWorkspaceSyncService;
    private final MeterRegistry meterRegistry;

    @Value("${integrations.automation.enabled:true}")
    private boolean automationEnabled;

    @Scheduled(
            fixedDelayString = "${integrations.automation.interval-ms:900000}",
            initialDelayString = "${integrations.automation.initial-delay-ms:180000}"
    )
    public void runWorkspaceIntegrationMaintenanceSweep() {
        if (!automationEnabled) {
            return;
        }

        meterRegistry.counter("crm.integrations.maintenance.sweeps.total", "result", "started").increment();

        tenantRepository.findAll().stream()
                .filter(tenant -> Boolean.TRUE.equals(tenant.getIsActive()) && Boolean.FALSE.equals(tenant.getArchived()))
                .forEach(this::runForTenantSafely);
    }

    private void runForTenantSafely(Tenant tenant) {
        try {
            TenantContext.setTenantId(tenant.getId());
            workspaceMicrosoft365SyncService.runScheduledMaintenance();
            workspaceGoogleWorkspaceSyncService.runScheduledMaintenance();
            meterRegistry.counter("crm.integrations.maintenance.tenants.total", "result", "success").increment();
        } catch (Exception exception) {
            log.warn("Workspace integration maintenance failed for tenant {}", tenant.getId(), exception);
            meterRegistry.counter("crm.integrations.maintenance.tenants.total", "result", "failure").increment();
        } finally {
            TenantContext.clear();
        }
    }
}
