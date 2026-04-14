package com.crm.service;

import com.crm.dto.request.CampaignNurtureWorkflowRequestDTO;
import com.crm.dto.request.CaseAssignmentWorkflowRequestDTO;
import com.crm.dto.request.CaseSlaWorkflowRequestDTO;
import com.crm.dto.request.LeadIntakeWorkflowRequestDTO;
import com.crm.dto.request.DealRescueWorkflowRequestDTO;
import com.crm.dto.request.DealApprovalWorkflowRequestDTO;
import com.crm.dto.request.GovernanceOpsWorkflowRequestDTO;
import com.crm.dto.request.QuotaRiskWorkflowRequestDTO;
import com.crm.dto.request.TerritoryEscalationWorkflowRequestDTO;
import com.crm.dto.response.CampaignNurtureWorkflowResponseDTO;
import com.crm.dto.response.CaseAssignmentWorkflowResponseDTO;
import com.crm.dto.response.CaseSlaWorkflowResponseDTO;
import com.crm.dto.response.DealApprovalWorkflowResponseDTO;
import com.crm.dto.response.DealRescueWorkflowResponseDTO;
import com.crm.dto.response.GovernanceOpsWorkflowResponseDTO;
import com.crm.dto.response.LeadIntakeWorkflowResponseDTO;
import com.crm.dto.response.QuotaRiskWorkflowResponseDTO;
import com.crm.dto.response.TerritoryEscalationWorkflowResponseDTO;
import com.crm.entity.WorkflowRule;

import java.util.UUID;

public interface WorkflowRuleService {

    LeadIntakeWorkflowResponseDTO getLeadIntakeWorkflow();

    LeadIntakeWorkflowResponseDTO updateLeadIntakeWorkflow(LeadIntakeWorkflowRequestDTO request);

    WorkflowRule resolveLeadIntakeWorkflow(UUID tenantId);

    CampaignNurtureWorkflowResponseDTO getCampaignNurtureWorkflow();

    CampaignNurtureWorkflowResponseDTO updateCampaignNurtureWorkflow(CampaignNurtureWorkflowRequestDTO request);

    WorkflowRule resolveCampaignNurtureWorkflow(UUID tenantId);

    CaseAssignmentWorkflowResponseDTO getCaseAssignmentWorkflow();

    CaseAssignmentWorkflowResponseDTO updateCaseAssignmentWorkflow(CaseAssignmentWorkflowRequestDTO request);

    WorkflowRule resolveCaseAssignmentWorkflow(UUID tenantId);

    CaseSlaWorkflowResponseDTO getCaseSlaWorkflow();

    CaseSlaWorkflowResponseDTO updateCaseSlaWorkflow(CaseSlaWorkflowRequestDTO request);

    WorkflowRule resolveCaseSlaWorkflow(UUID tenantId);

    DealRescueWorkflowResponseDTO getDealRescueWorkflow();

    DealRescueWorkflowResponseDTO updateDealRescueWorkflow(DealRescueWorkflowRequestDTO request);

    WorkflowRule resolveDealRescueWorkflow(UUID tenantId);

    QuotaRiskWorkflowResponseDTO getQuotaRiskWorkflow();

    QuotaRiskWorkflowResponseDTO updateQuotaRiskWorkflow(QuotaRiskWorkflowRequestDTO request);

    WorkflowRule resolveQuotaRiskWorkflow(UUID tenantId);

    DealApprovalWorkflowResponseDTO getDealApprovalWorkflow();

    DealApprovalWorkflowResponseDTO updateDealApprovalWorkflow(DealApprovalWorkflowRequestDTO request);

    WorkflowRule resolveDealApprovalWorkflow(UUID tenantId);

    GovernanceOpsWorkflowResponseDTO getGovernanceOpsWorkflow();

    GovernanceOpsWorkflowResponseDTO updateGovernanceOpsWorkflow(GovernanceOpsWorkflowRequestDTO request);

    WorkflowRule resolveGovernanceOpsWorkflow(UUID tenantId);

    TerritoryEscalationWorkflowResponseDTO getTerritoryEscalationWorkflow();

    TerritoryEscalationWorkflowResponseDTO updateTerritoryEscalationWorkflow(TerritoryEscalationWorkflowRequestDTO request);

    WorkflowRule resolveTerritoryEscalationWorkflow(UUID tenantId);
}
