package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.DealApprovalWorkflowRequestDTO;
import com.crm.dto.request.DealRescueWorkflowRequestDTO;
import com.crm.dto.request.GovernanceOpsWorkflowRequestDTO;
import com.crm.dto.request.LeadIntakeWorkflowRequestDTO;
import com.crm.dto.request.QuotaRiskWorkflowRequestDTO;
import com.crm.dto.request.TerritoryEscalationWorkflowRequestDTO;
import com.crm.dto.response.DealApprovalWorkflowResponseDTO;
import com.crm.dto.response.DealRescueWorkflowResponseDTO;
import com.crm.dto.response.GovernanceOpsWorkflowResponseDTO;
import com.crm.dto.response.LeadIntakeWorkflowResponseDTO;
import com.crm.dto.response.QuotaRiskWorkflowResponseDTO;
import com.crm.dto.response.TerritoryEscalationWorkflowResponseDTO;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.WorkflowRuleType;
import com.crm.exception.BadRequestException;
import com.crm.repository.WorkflowRuleRepository;
import com.crm.service.WorkflowRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowRuleServiceImpl implements WorkflowRuleService {

    private static final String DEFAULT_LEAD_INTAKE_NAME = "Lead Intake Automation";
    private static final String DEFAULT_LEAD_INTAKE_DESCRIPTION =
            "Controls lead auto-assignment, fast-track thresholds, and follow-up timing for this workspace.";
    private static final String DEFAULT_DEAL_RESCUE_NAME = "Deal Rescue Automation";
    private static final String DEFAULT_DEAL_RESCUE_DESCRIPTION =
            "Controls stalled-deal detection, rescue task timing, and which risky deals should be escalated for action.";
    private static final String DEFAULT_QUOTA_RISK_NAME = "Quota Risk Escalation";
    private static final String DEFAULT_QUOTA_RISK_DESCRIPTION =
            "Controls which pacing bands generate quota-risk reviews and how urgently those follow-up tasks are due.";
    private static final String DEFAULT_DEAL_APPROVAL_NAME = "Deal Approval Governance";
    private static final String DEFAULT_DEAL_APPROVAL_DESCRIPTION =
            "Controls which deals require formal approval and how urgently approval tasks are routed.";
    private static final String DEFAULT_GOVERNANCE_OPS_NAME = "Governance Operations";
    private static final String DEFAULT_GOVERNANCE_OPS_DESCRIPTION =
            "Controls digest cadence, overdue review severity bands, and governance escalation timing for this workspace.";
    private static final String DEFAULT_TERRITORY_ESCALATION_NAME = "Territory Escalation Governance";
    private static final String DEFAULT_TERRITORY_ESCALATION_DESCRIPTION =
            "Controls when territory drift becomes watch, high, or critical and how quickly manager alert tasks are due.";

    private final WorkflowRuleRepository workflowRuleRepository;

    @Override
    @Transactional(readOnly = true)
    public LeadIntakeWorkflowResponseDTO getLeadIntakeWorkflow() {
        UUID tenantId = requireTenant();
        return toDto(resolveLeadIntakeWorkflow(tenantId));
    }

    @Override
    @Transactional
    public LeadIntakeWorkflowResponseDTO updateLeadIntakeWorkflow(LeadIntakeWorkflowRequestDTO request) {
        UUID tenantId = requireTenant();
        validateRequest(request);

        WorkflowRule workflowRule = workflowRuleRepository
                .findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.LEAD_INTAKE)
                .orElseGet(() -> defaultLeadIntakeWorkflow(tenantId));

        workflowRule.setName(normalizeName(request.getName()));
        workflowRule.setDescription(normalizeDescription(request.getDescription()));
        workflowRule.setIsActive(request.getIsActive());
        workflowRule.setAutoAssignmentEnabled(request.getAutoAssignmentEnabled());
        workflowRule.setPreferTerritoryMatch(request.getPreferTerritoryMatch());
        workflowRule.setFallbackToLoadBalance(request.getFallbackToLoadBalance());
        workflowRule.setAutoFollowUpEnabled(request.getAutoFollowUpEnabled());
        workflowRule.setDefaultFollowUpDays(request.getDefaultFollowUpDays());
        workflowRule.setReferralFollowUpDays(request.getReferralFollowUpDays());
        workflowRule.setFastTrackFollowUpDays(request.getFastTrackFollowUpDays());
        workflowRule.setFastTrackScoreThreshold(request.getFastTrackScoreThreshold());
        workflowRule.setFastTrackValueThreshold(request.getFastTrackValueThreshold());
        workflowRule.setDefaultTaskPriority(request.getDefaultTaskPriority());
        workflowRule.setFastTrackTaskPriority(request.getFastTrackTaskPriority());

        WorkflowRule saved = workflowRuleRepository.save(workflowRule);
        log.info("Updated lead intake workflow for tenant {}", tenantId);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowRule resolveLeadIntakeWorkflow(UUID tenantId) {
        if (tenantId == null) {
            return defaultLeadIntakeWorkflow(null);
        }
        return workflowRuleRepository.findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.LEAD_INTAKE)
                .orElseGet(() -> defaultLeadIntakeWorkflow(tenantId));
    }

    @Override
    @Transactional(readOnly = true)
    public DealRescueWorkflowResponseDTO getDealRescueWorkflow() {
        UUID tenantId = requireTenant();
        return toDealRescueDto(resolveDealRescueWorkflow(tenantId));
    }

    @Override
    @Transactional
    public DealRescueWorkflowResponseDTO updateDealRescueWorkflow(DealRescueWorkflowRequestDTO request) {
        UUID tenantId = requireTenant();
        validateDealRescueRequest(request);

        WorkflowRule workflowRule = workflowRuleRepository
                .findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.DEAL_RESCUE)
                .orElseGet(() -> defaultDealRescueWorkflow(tenantId));

        workflowRule.setName(normalizeDealRescueName(request.getName()));
        workflowRule.setDescription(normalizeDealRescueDescription(request.getDescription()));
        workflowRule.setIsActive(request.getIsActive());
        workflowRule.setReviewStalledDeals(request.getReviewStalledDeals());
        workflowRule.setReviewHighRiskDeals(request.getReviewHighRiskDeals());
        workflowRule.setReviewOverdueNextSteps(request.getReviewOverdueNextSteps());
        workflowRule.setReviewTerritoryMismatch(request.getReviewTerritoryMismatch());
        workflowRule.setStalledDealDays(request.getStalledDealDays());
        workflowRule.setRescueTaskDueDays(request.getRescueTaskDueDays());
        workflowRule.setRescueTaskPriority(request.getRescueTaskPriority());

        WorkflowRule saved = workflowRuleRepository.save(workflowRule);
        log.info("Updated deal rescue workflow for tenant {}", tenantId);
        return toDealRescueDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowRule resolveDealRescueWorkflow(UUID tenantId) {
        if (tenantId == null) {
            return defaultDealRescueWorkflow(null);
        }
        return workflowRuleRepository.findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.DEAL_RESCUE)
                .orElseGet(() -> defaultDealRescueWorkflow(tenantId));
    }

    @Override
    @Transactional(readOnly = true)
    public QuotaRiskWorkflowResponseDTO getQuotaRiskWorkflow() {
        UUID tenantId = requireTenant();
        return toQuotaRiskDto(resolveQuotaRiskWorkflow(tenantId));
    }

    @Override
    @Transactional
    public QuotaRiskWorkflowResponseDTO updateQuotaRiskWorkflow(QuotaRiskWorkflowRequestDTO request) {
        UUID tenantId = requireTenant();
        validateQuotaRiskRequest(request);

        WorkflowRule workflowRule = workflowRuleRepository
                .findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.QUOTA_RISK)
                .orElseGet(() -> defaultQuotaRiskWorkflow(tenantId));

        workflowRule.setName(normalizeQuotaRiskName(request.getName()));
        workflowRule.setDescription(normalizeQuotaRiskDescription(request.getDescription()));
        workflowRule.setIsActive(request.getIsActive());
        workflowRule.setIncludeWatchReps(request.getIncludeWatchReps());
        workflowRule.setIncludeAtRiskReps(request.getIncludeAtRiskReps());
        workflowRule.setWatchTaskDueDays(request.getWatchTaskDueDays());
        workflowRule.setAtRiskTaskDueDays(request.getAtRiskTaskDueDays());
        workflowRule.setWatchTaskPriority(request.getWatchTaskPriority());
        workflowRule.setAtRiskTaskPriority(request.getAtRiskTaskPriority());

        WorkflowRule saved = workflowRuleRepository.save(workflowRule);
        log.info("Updated quota risk workflow for tenant {}", tenantId);
        return toQuotaRiskDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowRule resolveQuotaRiskWorkflow(UUID tenantId) {
        if (tenantId == null) {
            return defaultQuotaRiskWorkflow(null);
        }
        return workflowRuleRepository.findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.QUOTA_RISK)
                .orElseGet(() -> defaultQuotaRiskWorkflow(tenantId));
    }

    @Override
    @Transactional(readOnly = true)
    public DealApprovalWorkflowResponseDTO getDealApprovalWorkflow() {
        UUID tenantId = requireTenant();
        return toDealApprovalDto(resolveDealApprovalWorkflow(tenantId));
    }

    @Override
    @Transactional
    public DealApprovalWorkflowResponseDTO updateDealApprovalWorkflow(DealApprovalWorkflowRequestDTO request) {
        UUID tenantId = requireTenant();
        validateDealApprovalRequest(request);

        WorkflowRule workflowRule = workflowRuleRepository
                .findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.DEAL_APPROVAL)
                .orElseGet(() -> defaultDealApprovalWorkflow(tenantId));

        workflowRule.setName(normalizeDealApprovalName(request.getName()));
        workflowRule.setDescription(normalizeDealApprovalDescription(request.getDescription()));
        workflowRule.setIsActive(request.getIsActive());
        workflowRule.setRequireApprovalForHighRisk(request.getRequireApprovalForHighRisk());
        workflowRule.setValueApprovalThreshold(request.getValueApprovalThreshold());
        workflowRule.setApprovalTaskDueDays(request.getApprovalTaskDueDays());
        workflowRule.setApprovalTaskPriority(request.getApprovalTaskPriority());

        WorkflowRule saved = workflowRuleRepository.save(workflowRule);
        log.info("Updated deal approval workflow for tenant {}", tenantId);
        return toDealApprovalDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowRule resolveDealApprovalWorkflow(UUID tenantId) {
        if (tenantId == null) {
            return defaultDealApprovalWorkflow(null);
        }
        return workflowRuleRepository.findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.DEAL_APPROVAL)
                .orElseGet(() -> defaultDealApprovalWorkflow(tenantId));
    }

    @Override
    @Transactional(readOnly = true)
    public GovernanceOpsWorkflowResponseDTO getGovernanceOpsWorkflow() {
        UUID tenantId = requireTenant();
        return toGovernanceOpsDto(resolveGovernanceOpsWorkflow(tenantId));
    }

    @Override
    @Transactional
    public GovernanceOpsWorkflowResponseDTO updateGovernanceOpsWorkflow(GovernanceOpsWorkflowRequestDTO request) {
        UUID tenantId = requireTenant();
        validateGovernanceOpsRequest(request);

        WorkflowRule workflowRule = workflowRuleRepository
                .findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.GOVERNANCE_OPS)
                .orElseGet(() -> defaultGovernanceOpsWorkflow(tenantId));

        workflowRule.setName(normalizeGovernanceOpsName(request.getName()));
        workflowRule.setDescription(normalizeGovernanceOpsDescription(request.getDescription()));
        workflowRule.setIsActive(request.getIsActive());
        workflowRule.setDigestCadenceDays(request.getDigestCadenceDays());
        workflowRule.setDigestTaskDueDays(request.getDigestTaskDueDays());
        workflowRule.setDigestTaskPriority(request.getDigestTaskPriority());
        workflowRule.setElevateDigestForSlaBreaches(request.getElevateDigestForSlaBreaches());
        workflowRule.setWatchReviewDays(request.getWatchReviewDays());
        workflowRule.setHighReviewDays(request.getHighReviewDays());
        workflowRule.setCriticalReviewDays(request.getCriticalReviewDays());
        workflowRule.setOverdueReviewTaskPriority(request.getOverdueReviewTaskPriority());
        workflowRule.setOverdueEscalationTaskDueDays(request.getOverdueEscalationTaskDueDays());
        workflowRule.setOverdueEscalationTaskPriority(request.getOverdueEscalationTaskPriority());

        WorkflowRule saved = workflowRuleRepository.save(workflowRule);
        log.info("Updated governance ops workflow for tenant {}", tenantId);
        return toGovernanceOpsDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowRule resolveGovernanceOpsWorkflow(UUID tenantId) {
        if (tenantId == null) {
            return defaultGovernanceOpsWorkflow(null);
        }
        return workflowRuleRepository.findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.GOVERNANCE_OPS)
                .orElseGet(() -> defaultGovernanceOpsWorkflow(tenantId));
    }

    @Override
    @Transactional(readOnly = true)
    public TerritoryEscalationWorkflowResponseDTO getTerritoryEscalationWorkflow() {
        UUID tenantId = requireTenant();
        return toTerritoryEscalationDto(resolveTerritoryEscalationWorkflow(tenantId));
    }

    @Override
    @Transactional
    public TerritoryEscalationWorkflowResponseDTO updateTerritoryEscalationWorkflow(TerritoryEscalationWorkflowRequestDTO request) {
        UUID tenantId = requireTenant();
        validateTerritoryEscalationRequest(request);

        WorkflowRule workflowRule = workflowRuleRepository
                .findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.TERRITORY_ESCALATION)
                .orElseGet(() -> defaultTerritoryEscalationWorkflow(tenantId));

        workflowRule.setName(normalizeTerritoryEscalationName(request.getName()));
        workflowRule.setDescription(normalizeTerritoryEscalationDescription(request.getDescription()));
        workflowRule.setIsActive(request.getIsActive());
        workflowRule.setIncludeWatchEscalations(request.getIncludeWatchEscalations());
        workflowRule.setCriticalHighSeverityThreshold(request.getCriticalHighSeverityThreshold());
        workflowRule.setCriticalRepeatedMismatchThreshold(request.getCriticalRepeatedMismatchThreshold());
        workflowRule.setCriticalDealExceptionThreshold(request.getCriticalDealExceptionThreshold());
        workflowRule.setCriticalPipelineExposureThreshold(request.getCriticalPipelineExposureThreshold());
        workflowRule.setHighTotalExceptionThreshold(request.getHighTotalExceptionThreshold());
        workflowRule.setHighHighSeverityThreshold(request.getHighHighSeverityThreshold());
        workflowRule.setHighRepeatedMismatchThreshold(request.getHighRepeatedMismatchThreshold());
        workflowRule.setHighPipelineExposureThreshold(request.getHighPipelineExposureThreshold());
        workflowRule.setWatchEscalationSlaDays(request.getWatchEscalationSlaDays());
        workflowRule.setHighEscalationSlaDays(request.getHighEscalationSlaDays());
        workflowRule.setCriticalEscalationSlaDays(request.getCriticalEscalationSlaDays());
        workflowRule.setWatchEscalationTaskDueDays(request.getWatchEscalationTaskDueDays());
        workflowRule.setHighEscalationTaskDueDays(request.getHighEscalationTaskDueDays());
        workflowRule.setCriticalEscalationTaskDueDays(request.getCriticalEscalationTaskDueDays());
        workflowRule.setWatchEscalationTaskPriority(request.getWatchEscalationTaskPriority());
        workflowRule.setHighEscalationTaskPriority(request.getHighEscalationTaskPriority());
        workflowRule.setCriticalEscalationTaskPriority(request.getCriticalEscalationTaskPriority());

        WorkflowRule saved = workflowRuleRepository.save(workflowRule);
        log.info("Updated territory escalation workflow for tenant {}", tenantId);
        return toTerritoryEscalationDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkflowRule resolveTerritoryEscalationWorkflow(UUID tenantId) {
        if (tenantId == null) {
            return defaultTerritoryEscalationWorkflow(null);
        }
        return workflowRuleRepository.findByTenantIdAndRuleTypeAndArchivedFalse(tenantId, WorkflowRuleType.TERRITORY_ESCALATION)
                .orElseGet(() -> defaultTerritoryEscalationWorkflow(tenantId));
    }

    private LeadIntakeWorkflowResponseDTO toDto(WorkflowRule workflowRule) {
        return LeadIntakeWorkflowResponseDTO.builder()
                .id(workflowRule.getId())
                .ruleType(workflowRule.getRuleType() != null ? workflowRule.getRuleType().name() : WorkflowRuleType.LEAD_INTAKE.name())
                .name(workflowRule.getName())
                .description(workflowRule.getDescription())
                .isActive(workflowRule.getIsActive())
                .autoAssignmentEnabled(workflowRule.getAutoAssignmentEnabled())
                .preferTerritoryMatch(workflowRule.getPreferTerritoryMatch())
                .fallbackToLoadBalance(workflowRule.getFallbackToLoadBalance())
                .autoFollowUpEnabled(workflowRule.getAutoFollowUpEnabled())
                .defaultFollowUpDays(workflowRule.getDefaultFollowUpDays())
                .referralFollowUpDays(workflowRule.getReferralFollowUpDays())
                .fastTrackFollowUpDays(workflowRule.getFastTrackFollowUpDays())
                .fastTrackScoreThreshold(workflowRule.getFastTrackScoreThreshold())
                .fastTrackValueThreshold(workflowRule.getFastTrackValueThreshold())
                .defaultTaskPriority(workflowRule.getDefaultTaskPriority())
                .fastTrackTaskPriority(workflowRule.getFastTrackTaskPriority())
                .createdAt(workflowRule.getCreatedAt())
                .updatedAt(workflowRule.getUpdatedAt())
                .build();
    }

    private DealRescueWorkflowResponseDTO toDealRescueDto(WorkflowRule workflowRule) {
        return DealRescueWorkflowResponseDTO.builder()
                .id(workflowRule.getId())
                .ruleType(workflowRule.getRuleType() != null ? workflowRule.getRuleType().name() : WorkflowRuleType.DEAL_RESCUE.name())
                .name(workflowRule.getName())
                .description(workflowRule.getDescription())
                .isActive(workflowRule.getIsActive())
                .reviewStalledDeals(workflowRule.getReviewStalledDeals())
                .reviewHighRiskDeals(workflowRule.getReviewHighRiskDeals())
                .reviewOverdueNextSteps(workflowRule.getReviewOverdueNextSteps())
                .reviewTerritoryMismatch(workflowRule.getReviewTerritoryMismatch())
                .stalledDealDays(workflowRule.getStalledDealDays())
                .rescueTaskDueDays(workflowRule.getRescueTaskDueDays())
                .rescueTaskPriority(workflowRule.getRescueTaskPriority())
                .createdAt(workflowRule.getCreatedAt())
                .updatedAt(workflowRule.getUpdatedAt())
                .build();
    }

    private QuotaRiskWorkflowResponseDTO toQuotaRiskDto(WorkflowRule workflowRule) {
        return QuotaRiskWorkflowResponseDTO.builder()
                .id(workflowRule.getId())
                .ruleType(workflowRule.getRuleType() != null ? workflowRule.getRuleType().name() : WorkflowRuleType.QUOTA_RISK.name())
                .name(workflowRule.getName())
                .description(workflowRule.getDescription())
                .isActive(workflowRule.getIsActive())
                .includeWatchReps(workflowRule.getIncludeWatchReps())
                .includeAtRiskReps(workflowRule.getIncludeAtRiskReps())
                .watchTaskDueDays(workflowRule.getWatchTaskDueDays())
                .atRiskTaskDueDays(workflowRule.getAtRiskTaskDueDays())
                .watchTaskPriority(workflowRule.getWatchTaskPriority())
                .atRiskTaskPriority(workflowRule.getAtRiskTaskPriority())
                .createdAt(workflowRule.getCreatedAt())
                .updatedAt(workflowRule.getUpdatedAt())
                .build();
    }

    private DealApprovalWorkflowResponseDTO toDealApprovalDto(WorkflowRule workflowRule) {
        return DealApprovalWorkflowResponseDTO.builder()
                .id(workflowRule.getId())
                .ruleType(workflowRule.getRuleType() != null ? workflowRule.getRuleType().name() : WorkflowRuleType.DEAL_APPROVAL.name())
                .name(workflowRule.getName())
                .description(workflowRule.getDescription())
                .isActive(workflowRule.getIsActive())
                .requireApprovalForHighRisk(workflowRule.getRequireApprovalForHighRisk())
                .valueApprovalThreshold(workflowRule.getValueApprovalThreshold())
                .approvalTaskDueDays(workflowRule.getApprovalTaskDueDays())
                .approvalTaskPriority(workflowRule.getApprovalTaskPriority())
                .createdAt(workflowRule.getCreatedAt())
                .updatedAt(workflowRule.getUpdatedAt())
                .build();
    }

    private GovernanceOpsWorkflowResponseDTO toGovernanceOpsDto(WorkflowRule workflowRule) {
        return GovernanceOpsWorkflowResponseDTO.builder()
                .id(workflowRule.getId())
                .ruleType(workflowRule.getRuleType() != null ? workflowRule.getRuleType().name() : WorkflowRuleType.GOVERNANCE_OPS.name())
                .name(workflowRule.getName())
                .description(workflowRule.getDescription())
                .isActive(workflowRule.getIsActive())
                .digestCadenceDays(workflowRule.getDigestCadenceDays())
                .digestTaskDueDays(workflowRule.getDigestTaskDueDays())
                .digestTaskPriority(workflowRule.getDigestTaskPriority())
                .elevateDigestForSlaBreaches(workflowRule.getElevateDigestForSlaBreaches())
                .watchReviewDays(workflowRule.getWatchReviewDays())
                .highReviewDays(workflowRule.getHighReviewDays())
                .criticalReviewDays(workflowRule.getCriticalReviewDays())
                .overdueReviewTaskPriority(workflowRule.getOverdueReviewTaskPriority())
                .overdueEscalationTaskDueDays(workflowRule.getOverdueEscalationTaskDueDays())
                .overdueEscalationTaskPriority(workflowRule.getOverdueEscalationTaskPriority())
                .createdAt(workflowRule.getCreatedAt())
                .updatedAt(workflowRule.getUpdatedAt())
                .build();
    }

    private TerritoryEscalationWorkflowResponseDTO toTerritoryEscalationDto(WorkflowRule workflowRule) {
        return TerritoryEscalationWorkflowResponseDTO.builder()
                .id(workflowRule.getId())
                .ruleType(workflowRule.getRuleType() != null ? workflowRule.getRuleType().name() : WorkflowRuleType.TERRITORY_ESCALATION.name())
                .name(workflowRule.getName())
                .description(workflowRule.getDescription())
                .isActive(workflowRule.getIsActive())
                .includeWatchEscalations(workflowRule.getIncludeWatchEscalations())
                .criticalHighSeverityThreshold(workflowRule.getCriticalHighSeverityThreshold())
                .criticalRepeatedMismatchThreshold(workflowRule.getCriticalRepeatedMismatchThreshold())
                .criticalDealExceptionThreshold(workflowRule.getCriticalDealExceptionThreshold())
                .criticalPipelineExposureThreshold(workflowRule.getCriticalPipelineExposureThreshold())
                .highTotalExceptionThreshold(workflowRule.getHighTotalExceptionThreshold())
                .highHighSeverityThreshold(workflowRule.getHighHighSeverityThreshold())
                .highRepeatedMismatchThreshold(workflowRule.getHighRepeatedMismatchThreshold())
                .highPipelineExposureThreshold(workflowRule.getHighPipelineExposureThreshold())
                .watchEscalationSlaDays(workflowRule.getWatchEscalationSlaDays())
                .highEscalationSlaDays(workflowRule.getHighEscalationSlaDays())
                .criticalEscalationSlaDays(workflowRule.getCriticalEscalationSlaDays())
                .watchEscalationTaskDueDays(workflowRule.getWatchEscalationTaskDueDays())
                .highEscalationTaskDueDays(workflowRule.getHighEscalationTaskDueDays())
                .criticalEscalationTaskDueDays(workflowRule.getCriticalEscalationTaskDueDays())
                .watchEscalationTaskPriority(workflowRule.getWatchEscalationTaskPriority())
                .highEscalationTaskPriority(workflowRule.getHighEscalationTaskPriority())
                .criticalEscalationTaskPriority(workflowRule.getCriticalEscalationTaskPriority())
                .createdAt(workflowRule.getCreatedAt())
                .updatedAt(workflowRule.getUpdatedAt())
                .build();
    }

    private WorkflowRule defaultLeadIntakeWorkflow(UUID tenantId) {
        WorkflowRule workflowRule = WorkflowRule.builder()
                .ruleType(WorkflowRuleType.LEAD_INTAKE)
                .name(DEFAULT_LEAD_INTAKE_NAME)
                .description(DEFAULT_LEAD_INTAKE_DESCRIPTION)
                .isActive(true)
                .autoAssignmentEnabled(true)
                .preferTerritoryMatch(true)
                .fallbackToLoadBalance(true)
                .autoFollowUpEnabled(true)
                .defaultFollowUpDays(3)
                .referralFollowUpDays(2)
                .fastTrackFollowUpDays(1)
                .fastTrackScoreThreshold(80)
                .fastTrackValueThreshold(BigDecimal.valueOf(50000))
                .defaultTaskPriority(TaskPriority.MEDIUM)
                .fastTrackTaskPriority(TaskPriority.HIGH)
                .reviewStalledDeals(true)
                .reviewHighRiskDeals(true)
                .reviewOverdueNextSteps(true)
                .reviewTerritoryMismatch(true)
                .stalledDealDays(14)
                .rescueTaskDueDays(1)
                .rescueTaskPriority(TaskPriority.HIGH)
                .includeWatchReps(true)
                .includeAtRiskReps(true)
                .watchTaskDueDays(1)
                .atRiskTaskDueDays(0)
                .watchTaskPriority(TaskPriority.MEDIUM)
                .atRiskTaskPriority(TaskPriority.HIGH)
                .requireApprovalForHighRisk(true)
                .valueApprovalThreshold(BigDecimal.valueOf(100000))
                .approvalTaskDueDays(1)
                .approvalTaskPriority(TaskPriority.HIGH)
                .build();
        applyGovernanceOpsDefaults(workflowRule);
        applyTerritoryEscalationDefaults(workflowRule);
        workflowRule.setTenantId(tenantId);
        return workflowRule;
    }

    private WorkflowRule defaultDealRescueWorkflow(UUID tenantId) {
        WorkflowRule workflowRule = WorkflowRule.builder()
                .ruleType(WorkflowRuleType.DEAL_RESCUE)
                .name(DEFAULT_DEAL_RESCUE_NAME)
                .description(DEFAULT_DEAL_RESCUE_DESCRIPTION)
                .isActive(true)
                .autoAssignmentEnabled(true)
                .preferTerritoryMatch(true)
                .fallbackToLoadBalance(true)
                .autoFollowUpEnabled(true)
                .defaultFollowUpDays(3)
                .referralFollowUpDays(2)
                .fastTrackFollowUpDays(1)
                .fastTrackScoreThreshold(80)
                .fastTrackValueThreshold(BigDecimal.valueOf(50000))
                .defaultTaskPriority(TaskPriority.MEDIUM)
                .fastTrackTaskPriority(TaskPriority.HIGH)
                .reviewStalledDeals(true)
                .reviewHighRiskDeals(true)
                .reviewOverdueNextSteps(true)
                .reviewTerritoryMismatch(true)
                .stalledDealDays(14)
                .rescueTaskDueDays(1)
                .rescueTaskPriority(TaskPriority.HIGH)
                .includeWatchReps(true)
                .includeAtRiskReps(true)
                .watchTaskDueDays(1)
                .atRiskTaskDueDays(0)
                .watchTaskPriority(TaskPriority.MEDIUM)
                .atRiskTaskPriority(TaskPriority.HIGH)
                .requireApprovalForHighRisk(true)
                .valueApprovalThreshold(BigDecimal.valueOf(100000))
                .approvalTaskDueDays(1)
                .approvalTaskPriority(TaskPriority.HIGH)
                .build();
        applyGovernanceOpsDefaults(workflowRule);
        applyTerritoryEscalationDefaults(workflowRule);
        workflowRule.setTenantId(tenantId);
        return workflowRule;
    }

    private WorkflowRule defaultQuotaRiskWorkflow(UUID tenantId) {
        WorkflowRule workflowRule = WorkflowRule.builder()
                .ruleType(WorkflowRuleType.QUOTA_RISK)
                .name(DEFAULT_QUOTA_RISK_NAME)
                .description(DEFAULT_QUOTA_RISK_DESCRIPTION)
                .isActive(true)
                .autoAssignmentEnabled(true)
                .preferTerritoryMatch(true)
                .fallbackToLoadBalance(true)
                .autoFollowUpEnabled(true)
                .defaultFollowUpDays(3)
                .referralFollowUpDays(2)
                .fastTrackFollowUpDays(1)
                .fastTrackScoreThreshold(80)
                .fastTrackValueThreshold(BigDecimal.valueOf(50000))
                .defaultTaskPriority(TaskPriority.MEDIUM)
                .fastTrackTaskPriority(TaskPriority.HIGH)
                .reviewStalledDeals(true)
                .reviewHighRiskDeals(true)
                .reviewOverdueNextSteps(true)
                .reviewTerritoryMismatch(true)
                .stalledDealDays(14)
                .rescueTaskDueDays(1)
                .rescueTaskPriority(TaskPriority.HIGH)
                .includeWatchReps(true)
                .includeAtRiskReps(true)
                .watchTaskDueDays(1)
                .atRiskTaskDueDays(0)
                .watchTaskPriority(TaskPriority.MEDIUM)
                .atRiskTaskPriority(TaskPriority.HIGH)
                .requireApprovalForHighRisk(true)
                .valueApprovalThreshold(BigDecimal.valueOf(100000))
                .approvalTaskDueDays(1)
                .approvalTaskPriority(TaskPriority.HIGH)
                .build();
        applyGovernanceOpsDefaults(workflowRule);
        applyTerritoryEscalationDefaults(workflowRule);
        workflowRule.setTenantId(tenantId);
        return workflowRule;
    }

    private WorkflowRule defaultDealApprovalWorkflow(UUID tenantId) {
        WorkflowRule workflowRule = WorkflowRule.builder()
                .ruleType(WorkflowRuleType.DEAL_APPROVAL)
                .name(DEFAULT_DEAL_APPROVAL_NAME)
                .description(DEFAULT_DEAL_APPROVAL_DESCRIPTION)
                .isActive(true)
                .autoAssignmentEnabled(true)
                .preferTerritoryMatch(true)
                .fallbackToLoadBalance(true)
                .autoFollowUpEnabled(true)
                .defaultFollowUpDays(3)
                .referralFollowUpDays(2)
                .fastTrackFollowUpDays(1)
                .fastTrackScoreThreshold(80)
                .fastTrackValueThreshold(BigDecimal.valueOf(50000))
                .defaultTaskPriority(TaskPriority.MEDIUM)
                .fastTrackTaskPriority(TaskPriority.HIGH)
                .reviewStalledDeals(true)
                .reviewHighRiskDeals(true)
                .reviewOverdueNextSteps(true)
                .reviewTerritoryMismatch(true)
                .stalledDealDays(14)
                .rescueTaskDueDays(1)
                .rescueTaskPriority(TaskPriority.HIGH)
                .includeWatchReps(true)
                .includeAtRiskReps(true)
                .watchTaskDueDays(1)
                .atRiskTaskDueDays(0)
                .watchTaskPriority(TaskPriority.MEDIUM)
                .atRiskTaskPriority(TaskPriority.HIGH)
                .requireApprovalForHighRisk(true)
                .valueApprovalThreshold(BigDecimal.valueOf(100000))
                .approvalTaskDueDays(1)
                .approvalTaskPriority(TaskPriority.HIGH)
                .build();
        applyGovernanceOpsDefaults(workflowRule);
        applyTerritoryEscalationDefaults(workflowRule);
        workflowRule.setTenantId(tenantId);
        return workflowRule;
    }

    private WorkflowRule defaultGovernanceOpsWorkflow(UUID tenantId) {
        WorkflowRule workflowRule = WorkflowRule.builder()
                .ruleType(WorkflowRuleType.GOVERNANCE_OPS)
                .name(DEFAULT_GOVERNANCE_OPS_NAME)
                .description(DEFAULT_GOVERNANCE_OPS_DESCRIPTION)
                .isActive(true)
                .autoAssignmentEnabled(true)
                .preferTerritoryMatch(true)
                .fallbackToLoadBalance(true)
                .autoFollowUpEnabled(true)
                .defaultFollowUpDays(3)
                .referralFollowUpDays(2)
                .fastTrackFollowUpDays(1)
                .fastTrackScoreThreshold(80)
                .fastTrackValueThreshold(BigDecimal.valueOf(50000))
                .defaultTaskPriority(TaskPriority.MEDIUM)
                .fastTrackTaskPriority(TaskPriority.HIGH)
                .reviewStalledDeals(true)
                .reviewHighRiskDeals(true)
                .reviewOverdueNextSteps(true)
                .reviewTerritoryMismatch(true)
                .stalledDealDays(14)
                .rescueTaskDueDays(1)
                .rescueTaskPriority(TaskPriority.HIGH)
                .includeWatchReps(true)
                .includeAtRiskReps(true)
                .watchTaskDueDays(1)
                .atRiskTaskDueDays(0)
                .watchTaskPriority(TaskPriority.MEDIUM)
                .atRiskTaskPriority(TaskPriority.HIGH)
                .requireApprovalForHighRisk(true)
                .valueApprovalThreshold(BigDecimal.valueOf(100000))
                .approvalTaskDueDays(1)
                .approvalTaskPriority(TaskPriority.HIGH)
                .build();
        applyGovernanceOpsDefaults(workflowRule);
        applyTerritoryEscalationDefaults(workflowRule);
        workflowRule.setTenantId(tenantId);
        return workflowRule;
    }

    private WorkflowRule defaultTerritoryEscalationWorkflow(UUID tenantId) {
        WorkflowRule workflowRule = WorkflowRule.builder()
                .ruleType(WorkflowRuleType.TERRITORY_ESCALATION)
                .name(DEFAULT_TERRITORY_ESCALATION_NAME)
                .description(DEFAULT_TERRITORY_ESCALATION_DESCRIPTION)
                .isActive(true)
                .autoAssignmentEnabled(true)
                .preferTerritoryMatch(true)
                .fallbackToLoadBalance(true)
                .autoFollowUpEnabled(true)
                .defaultFollowUpDays(3)
                .referralFollowUpDays(2)
                .fastTrackFollowUpDays(1)
                .fastTrackScoreThreshold(80)
                .fastTrackValueThreshold(BigDecimal.valueOf(50000))
                .defaultTaskPriority(TaskPriority.MEDIUM)
                .fastTrackTaskPriority(TaskPriority.HIGH)
                .reviewStalledDeals(true)
                .reviewHighRiskDeals(true)
                .reviewOverdueNextSteps(true)
                .reviewTerritoryMismatch(true)
                .stalledDealDays(14)
                .rescueTaskDueDays(1)
                .rescueTaskPriority(TaskPriority.HIGH)
                .includeWatchReps(true)
                .includeAtRiskReps(true)
                .watchTaskDueDays(1)
                .atRiskTaskDueDays(0)
                .watchTaskPriority(TaskPriority.MEDIUM)
                .atRiskTaskPriority(TaskPriority.HIGH)
                .requireApprovalForHighRisk(true)
                .valueApprovalThreshold(BigDecimal.valueOf(100000))
                .approvalTaskDueDays(1)
                .approvalTaskPriority(TaskPriority.HIGH)
                .build();
        applyGovernanceOpsDefaults(workflowRule);
        applyTerritoryEscalationDefaults(workflowRule);
        workflowRule.setTenantId(tenantId);
        return workflowRule;
    }

    private void applyGovernanceOpsDefaults(WorkflowRule workflowRule) {
        workflowRule.setDigestCadenceDays(1);
        workflowRule.setDigestTaskDueDays(0);
        workflowRule.setDigestTaskPriority(TaskPriority.MEDIUM);
        workflowRule.setElevateDigestForSlaBreaches(true);
        workflowRule.setWatchReviewDays(1);
        workflowRule.setHighReviewDays(3);
        workflowRule.setCriticalReviewDays(5);
        workflowRule.setOverdueReviewTaskPriority(TaskPriority.HIGH);
        workflowRule.setOverdueEscalationTaskDueDays(0);
        workflowRule.setOverdueEscalationTaskPriority(TaskPriority.HIGH);
    }

    private void applyTerritoryEscalationDefaults(WorkflowRule workflowRule) {
        workflowRule.setIncludeWatchEscalations(true);
        workflowRule.setCriticalHighSeverityThreshold(2);
        workflowRule.setCriticalRepeatedMismatchThreshold(2);
        workflowRule.setCriticalDealExceptionThreshold(2);
        workflowRule.setCriticalPipelineExposureThreshold(BigDecimal.valueOf(100000));
        workflowRule.setHighTotalExceptionThreshold(2);
        workflowRule.setHighHighSeverityThreshold(1);
        workflowRule.setHighRepeatedMismatchThreshold(1);
        workflowRule.setHighPipelineExposureThreshold(BigDecimal.valueOf(25000));
        workflowRule.setWatchEscalationSlaDays(7);
        workflowRule.setHighEscalationSlaDays(5);
        workflowRule.setCriticalEscalationSlaDays(2);
        workflowRule.setWatchEscalationTaskDueDays(1);
        workflowRule.setHighEscalationTaskDueDays(1);
        workflowRule.setCriticalEscalationTaskDueDays(0);
        workflowRule.setWatchEscalationTaskPriority(TaskPriority.MEDIUM);
        workflowRule.setHighEscalationTaskPriority(TaskPriority.MEDIUM);
        workflowRule.setCriticalEscalationTaskPriority(TaskPriority.HIGH);
    }

    private void validateRequest(LeadIntakeWorkflowRequestDTO request) {
        if (!Boolean.TRUE.equals(request.getAutoAssignmentEnabled()) && !Boolean.TRUE.equals(request.getAutoFollowUpEnabled())) {
            throw new BadRequestException("At least one lead intake automation action must stay enabled");
        }
        if (!Boolean.TRUE.equals(request.getFallbackToLoadBalance()) && !Boolean.TRUE.equals(request.getPreferTerritoryMatch())
                && Boolean.TRUE.equals(request.getAutoAssignmentEnabled())) {
            throw new BadRequestException("Lead auto-assignment needs either territory matching or load balancing enabled");
        }
        if (request.getFastTrackFollowUpDays() > request.getDefaultFollowUpDays()) {
            throw new BadRequestException("Fast-track follow-up cannot be slower than the default follow-up");
        }
    }

    private void validateDealRescueRequest(DealRescueWorkflowRequestDTO request) {
        if (Boolean.TRUE.equals(request.getIsActive())
                && !Boolean.TRUE.equals(request.getReviewStalledDeals())
                && !Boolean.TRUE.equals(request.getReviewHighRiskDeals())
                && !Boolean.TRUE.equals(request.getReviewOverdueNextSteps())
                && !Boolean.TRUE.equals(request.getReviewTerritoryMismatch())) {
            throw new BadRequestException("At least one deal rescue trigger must stay enabled while the workflow is active");
        }
    }

    private void validateQuotaRiskRequest(QuotaRiskWorkflowRequestDTO request) {
        if (Boolean.TRUE.equals(request.getIsActive())
                && !Boolean.TRUE.equals(request.getIncludeWatchReps())
                && !Boolean.TRUE.equals(request.getIncludeAtRiskReps())) {
            throw new BadRequestException("At least one quota-risk pacing band must stay enabled while the workflow is active");
        }
        if (request.getAtRiskTaskDueDays() > request.getWatchTaskDueDays()) {
            throw new BadRequestException("At-risk follow-up cannot be slower than watch follow-up");
        }
    }

    private void validateDealApprovalRequest(DealApprovalWorkflowRequestDTO request) {
        if (!Boolean.TRUE.equals(request.getIsActive()) && Boolean.TRUE.equals(request.getRequireApprovalForHighRisk())) {
            return;
        }
        if (request.getValueApprovalThreshold() == null || request.getValueApprovalThreshold().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Approval threshold must be greater than zero");
        }
    }

    private void validateGovernanceOpsRequest(GovernanceOpsWorkflowRequestDTO request) {
        if (request.getHighReviewDays() <= request.getWatchReviewDays()) {
            throw new BadRequestException("High review threshold must be greater than the watch threshold");
        }
        if (request.getCriticalReviewDays() <= request.getHighReviewDays()) {
            throw new BadRequestException("Critical review threshold must be greater than the high threshold");
        }
    }

    private void validateTerritoryEscalationRequest(TerritoryEscalationWorkflowRequestDTO request) {
        if (request.getCriticalPipelineExposureThreshold().compareTo(request.getHighPipelineExposureThreshold()) <= 0) {
            throw new BadRequestException("Critical pipeline exposure threshold must be greater than the high threshold");
        }
        if (request.getCriticalEscalationSlaDays() >= request.getHighEscalationSlaDays()) {
            throw new BadRequestException("Critical escalation SLA must be faster than the high SLA");
        }
        if (request.getHighEscalationSlaDays() >= request.getWatchEscalationSlaDays()) {
            throw new BadRequestException("High escalation SLA must be faster than the watch SLA");
        }
        if (request.getCriticalHighSeverityThreshold() < request.getHighHighSeverityThreshold()) {
            throw new BadRequestException("Critical high-severity threshold cannot be below the high threshold");
        }
        if (request.getCriticalRepeatedMismatchThreshold() < request.getHighRepeatedMismatchThreshold()) {
            throw new BadRequestException("Critical repeated-mismatch threshold cannot be below the high threshold");
        }
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private String normalizeName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_LEAD_INTAKE_NAME;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeDescription(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_LEAD_INTAKE_DESCRIPTION;
        }
        return value.trim();
    }

    private String normalizeDealRescueName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_DEAL_RESCUE_NAME;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeDealRescueDescription(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_DEAL_RESCUE_DESCRIPTION;
        }
        return value.trim();
    }

    private String normalizeQuotaRiskName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_QUOTA_RISK_NAME;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeQuotaRiskDescription(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_QUOTA_RISK_DESCRIPTION;
        }
        return value.trim();
    }

    private String normalizeDealApprovalName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_DEAL_APPROVAL_NAME;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeDealApprovalDescription(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_DEAL_APPROVAL_DESCRIPTION;
        }
        return value.trim();
    }

    private String normalizeGovernanceOpsName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_GOVERNANCE_OPS_NAME;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeGovernanceOpsDescription(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_GOVERNANCE_OPS_DESCRIPTION;
        }
        return value.trim();
    }

    private String normalizeTerritoryEscalationName(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_TERRITORY_ESCALATION_NAME;
        }
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeTerritoryEscalationDescription(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_TERRITORY_ESCALATION_DESCRIPTION;
        }
        return value.trim();
    }
}
