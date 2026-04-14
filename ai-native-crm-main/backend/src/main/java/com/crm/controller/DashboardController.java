package com.crm.controller;

import com.crm.dto.response.AutomationRunResponseDTO;
import com.crm.dto.response.DashboardStatsDTO;
import com.crm.dto.response.GovernanceAutomationResultDTO;
import com.crm.dto.response.GovernanceDigestAutomationResultDTO;
import com.crm.dto.response.GovernanceInboxSummaryDTO;
import com.crm.dto.response.GovernanceTaskAcknowledgementResultDTO;
import com.crm.dto.response.QuotaRiskAlertSummaryDTO;
import com.crm.dto.response.QuotaRiskAutomationResultDTO;
import com.crm.dto.response.RevenueOpsSummaryDTO;
import com.crm.dto.response.TerritoryAutoRemediationResultDTO;
import com.crm.dto.response.TerritoryEscalationAutomationResultDTO;
import com.crm.dto.response.TerritoryEscalationSummaryDTO;
import com.crm.dto.response.TerritoryExceptionAutomationResultDTO;
import com.crm.dto.response.TerritoryExceptionSummaryDTO;
import com.crm.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard statistics API")
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('DASHBOARD_VIEW')")
    @Operation(summary = "Get dashboard statistics", description = "Retrieve overall statistics for the dashboard")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        log.info("Fetching dashboard statistics");
        DashboardStatsDTO stats = dashboardService.getStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/revenue-ops")
    @PreAuthorize("hasAuthority('DASHBOARD_VIEW')")
    @Operation(summary = "Get revenue operations summary", description = "Retrieve quota, territory, and team pipeline coverage")
    public ResponseEntity<RevenueOpsSummaryDTO> getRevenueOpsSummary() {
        log.info("Fetching revenue operations summary");
        RevenueOpsSummaryDTO summary = dashboardService.getRevenueOpsSummary();
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/quota-risk-alerts")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Get quota risk alerts", description = "Retrieve the current manager alert queue for reps who are watch or at risk against quota")
    public ResponseEntity<QuotaRiskAlertSummaryDTO> getQuotaRiskAlerts() {
        log.info("Fetching quota risk alerts");
        return ResponseEntity.ok(dashboardService.getQuotaRiskAlerts());
    }

    @org.springframework.web.bind.annotation.PostMapping("/quota-risk-alerts/automation")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Create quota risk follow-up tasks", description = "Create manager follow-up tasks for reps who are off pace against quota")
    public ResponseEntity<QuotaRiskAutomationResultDTO> runQuotaRiskAlertAutomation() {
        log.info("Running quota risk alert automation");
        return ResponseEntity.ok(dashboardService.runQuotaRiskAlertAutomation());
    }

    @GetMapping("/territory-exceptions")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Get territory exceptions", description = "Retrieve lead, account, and deal territory mismatches that need manager review")
    public ResponseEntity<TerritoryExceptionSummaryDTO> getTerritoryExceptions() {
        log.info("Fetching territory exception summary");
        return ResponseEntity.ok(dashboardService.getTerritoryExceptions());
    }

    @org.springframework.web.bind.annotation.PostMapping("/territory-exceptions/automation")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Create territory exception review tasks", description = "Create manager review tasks for unresolved territory mismatches")
    public ResponseEntity<TerritoryExceptionAutomationResultDTO> runTerritoryExceptionAutomation() {
        log.info("Running territory exception automation");
        return ResponseEntity.ok(dashboardService.runTerritoryExceptionAutomation());
    }

    @GetMapping("/territory-escalations")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Get territory escalation alerts", description = "Retrieve grouped territory drift alerts before they impact coverage and forecast accuracy")
    public ResponseEntity<TerritoryEscalationSummaryDTO> getTerritoryEscalations() {
        log.info("Fetching territory escalation summary");
        return ResponseEntity.ok(dashboardService.getTerritoryEscalations());
    }

    @org.springframework.web.bind.annotation.PostMapping("/territory-escalations/automation")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Create territory escalation alerts", description = "Create manager alert tasks for grouped territory drift that needs escalation")
    public ResponseEntity<TerritoryEscalationAutomationResultDTO> runTerritoryEscalationAutomation() {
        log.info("Running territory escalation automation");
        return ResponseEntity.ok(dashboardService.runTerritoryEscalationAutomation());
    }

    @org.springframework.web.bind.annotation.PostMapping("/territory-exceptions/auto-remediate")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Auto-remediate territory exceptions", description = "Bulk reassign leads, accounts, and deals where the governed territory owner is already known")
    public ResponseEntity<TerritoryAutoRemediationResultDTO> runTerritoryAutoRemediation() {
        log.info("Running territory auto-remediation");
        return ResponseEntity.ok(dashboardService.runTerritoryAutoRemediation());
    }

    @GetMapping("/governance-inbox")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Get governance inbox", description = "Retrieve the manager inbox for escalations, quota risk, and SLA-breached territory drift")
    public ResponseEntity<GovernanceInboxSummaryDTO> getGovernanceInbox() {
        log.info("Fetching governance inbox");
        return ResponseEntity.ok(dashboardService.getGovernanceInbox());
    }

    @org.springframework.web.bind.annotation.PostMapping("/governance-digest/automation")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Create governance digest", description = "Create a manager digest task summarizing current governance risks and SLA breaches")
    public ResponseEntity<GovernanceDigestAutomationResultDTO> runGovernanceDigestAutomation() {
        log.info("Running governance digest automation");
        return ResponseEntity.ok(dashboardService.runGovernanceDigestAutomation());
    }

    @org.springframework.web.bind.annotation.PostMapping("/governance-ops/automation")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Run governance automation", description = "Run digest generation and overdue review escalation for the current tenant")
    public ResponseEntity<GovernanceAutomationResultDTO> runGovernanceAutomation() {
        log.info("Running governance automation sweep");
        return ResponseEntity.ok(dashboardService.runGovernanceAutomation());
    }

    @org.springframework.web.bind.annotation.PostMapping("/governance-tasks/{taskId}/acknowledge")
    @PreAuthorize("hasAuthority('GOVERNANCE_MANAGE')")
    @Operation(summary = "Acknowledge governance task", description = "Mark a governance digest, territory escalation alert, or quota risk task as reviewed")
    public ResponseEntity<GovernanceTaskAcknowledgementResultDTO> acknowledgeGovernanceTask(@PathVariable java.util.UUID taskId) {
        log.info("Acknowledging governance task {}", taskId);
        return ResponseEntity.ok(dashboardService.acknowledgeGovernanceTask(taskId));
    }

    @GetMapping("/automation-runs")
    @PreAuthorize("hasAuthority('AUTOMATION_VIEW')")
    @Operation(summary = "Get recent automation runs", description = "Retrieve recent tenant automation executions across rescue, governance, quota, and territory workflows")
    public ResponseEntity<List<AutomationRunResponseDTO>> getAutomationRuns(
            @RequestParam(defaultValue = "10") int size
    ) {
        log.info("Fetching recent automation runs");
        return ResponseEntity.ok(dashboardService.getAutomationRuns(size));
    }
}
