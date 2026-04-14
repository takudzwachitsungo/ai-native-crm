package com.crm.service;

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
import com.crm.dto.response.TerritoryExceptionSummaryDTO;
import com.crm.dto.response.TerritoryExceptionAutomationResultDTO;

import java.util.List;

public interface DashboardService {
    
    /**
     * Get dashboard statistics
     */
    DashboardStatsDTO getStats();

    RevenueOpsSummaryDTO getRevenueOpsSummary();

    QuotaRiskAlertSummaryDTO getQuotaRiskAlerts();

    QuotaRiskAutomationResultDTO runQuotaRiskAlertAutomation();

    TerritoryExceptionSummaryDTO getTerritoryExceptions();

    TerritoryExceptionAutomationResultDTO runTerritoryExceptionAutomation();

    TerritoryEscalationSummaryDTO getTerritoryEscalations();

    TerritoryEscalationAutomationResultDTO runTerritoryEscalationAutomation();

    TerritoryAutoRemediationResultDTO runTerritoryAutoRemediation();

    GovernanceInboxSummaryDTO getGovernanceInbox();

    GovernanceDigestAutomationResultDTO runGovernanceDigestAutomation();

    GovernanceAutomationResultDTO runGovernanceAutomation();

    GovernanceAutomationResultDTO runGovernanceAutomationScheduled();

    GovernanceTaskAcknowledgementResultDTO acknowledgeGovernanceTask(java.util.UUID taskId);

    List<AutomationRunResponseDTO> getAutomationRuns(int limit);
}
