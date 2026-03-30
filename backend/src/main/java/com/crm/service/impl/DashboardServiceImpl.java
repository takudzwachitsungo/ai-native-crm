package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.response.AutomationRunResponseDTO;
import com.crm.dto.response.DashboardStatsDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.dto.response.GovernanceAutomationResultDTO;
import com.crm.dto.response.GovernanceDigestAutomationResultDTO;
import com.crm.dto.response.GovernanceDigestHistoryItemDTO;
import com.crm.dto.response.GovernanceInboxItemDTO;
import com.crm.dto.response.GovernanceInboxSummaryDTO;
import com.crm.dto.response.GovernanceTaskAcknowledgementResultDTO;
import com.crm.dto.response.LeadStatsDTO;
import com.crm.dto.response.QuotaRiskAlertItemDTO;
import com.crm.dto.response.QuotaRiskAlertSummaryDTO;
import com.crm.dto.response.QuotaRiskAutomationResultDTO;
import com.crm.dto.response.RevenueOpsRepDTO;
import com.crm.dto.response.RevenueOpsSummaryDTO;
import com.crm.dto.response.TerritoryAutoRemediationResultDTO;
import com.crm.dto.response.TerritoryEscalationAutomationResultDTO;
import com.crm.dto.response.TerritoryEscalationItemDTO;
import com.crm.dto.response.TerritoryEscalationSummaryDTO;
import com.crm.dto.response.TerritoryExceptionAutomationResultDTO;
import com.crm.dto.response.TerritoryExceptionItemDTO;
import com.crm.dto.response.TerritoryExceptionSummaryDTO;
import com.crm.dto.response.TerritorySummaryDTO;
import com.crm.entity.Company;
import com.crm.entity.Deal;
import com.crm.entity.Lead;
import com.crm.entity.Task;
import com.crm.entity.Territory;
import com.crm.entity.User;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.LeadStatus;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.entity.enums.UserRole;
import com.crm.repository.DealRepository;
import com.crm.repository.CompanyRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.TerritoryRepository;
import com.crm.repository.UserRepository;
import com.crm.service.DashboardService;
import com.crm.service.DealService;
import com.crm.service.LeadService;
import com.crm.service.AutomationRunService;
import com.crm.service.WorkflowRuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final LeadService leadService;
    private final DealService dealService;
    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final DealRepository dealRepository;
    private final TaskRepository taskRepository;
    private final TerritoryRepository territoryRepository;
    private final WorkflowRuleService workflowRuleService;
    private final AutomationRunService automationRunService;

    private static final String QUOTA_RISK_TASK_PREFIX = "Quota risk review: ";
    private static final String QUOTA_RISK_AUTOMATION_KEY = "QUOTA_RISK";
    private static final String QUOTA_RISK_AUTOMATION_NAME = "Quota Risk Automation";
    private static final String TERRITORY_EXCEPTION_AUTOMATION_KEY = "TERRITORY_EXCEPTION";
    private static final String TERRITORY_EXCEPTION_AUTOMATION_NAME = "Territory Exception Review";
    private static final String TERRITORY_ESCALATION_AUTOMATION_KEY = "TERRITORY_ESCALATION";
    private static final String TERRITORY_ESCALATION_AUTOMATION_NAME = "Territory Escalation";
    private static final String TERRITORY_AUTO_REMEDIATION_AUTOMATION_KEY = "TERRITORY_AUTO_REMEDIATION";
    private static final String TERRITORY_AUTO_REMEDIATION_AUTOMATION_NAME = "Territory Auto-Remediation";
    private static final String GOVERNANCE_DIGEST_AUTOMATION_KEY = "GOVERNANCE_DIGEST";
    private static final String GOVERNANCE_DIGEST_AUTOMATION_NAME = "Governance Digest";
    private static final String GOVERNANCE_OPS_AUTOMATION_KEY = "GOVERNANCE_OPS";
    private static final String GOVERNANCE_OPS_AUTOMATION_NAME = "Governance Automation Sweep";
    private static final String TRIGGER_SOURCE_MANUAL = "MANUAL";
    private static final String TRIGGER_SOURCE_SCHEDULED = "SCHEDULED";
    private static final String RUN_STATUS_SUCCESS = "SUCCESS";
    private static final String RUN_STATUS_SKIPPED = "SKIPPED";
    private static final String TERRITORY_EXCEPTION_LEAD_TASK_TYPE = "territory_exception_lead";
    private static final String TERRITORY_EXCEPTION_COMPANY_TASK_TYPE = "territory_exception_company";
    private static final String TERRITORY_EXCEPTION_DEAL_TASK_TYPE = "territory_exception_deal";
    private static final String TERRITORY_EXCEPTION_TASK_PREFIX = "Territory exception: ";
    private static final String TERRITORY_COVERAGE_ALERT_TASK_TYPE = "territory_coverage_alert";
    private static final String TERRITORY_COVERAGE_ALERT_PREFIX = "Territory coverage alert: ";
    private static final String GOVERNANCE_DIGEST_TASK_TYPE = "governance_digest";
    private static final String GOVERNANCE_DIGEST_TASK_PREFIX = "Governance digest: ";
    private static final String GOVERNANCE_OVERDUE_REVIEW_TASK_TYPE = "governance_overdue_review";
    private static final String GOVERNANCE_OVERDUE_REVIEW_PREFIX = "Governance escalation: overdue reviews ";
    private static final Set<String> GOVERNANCE_REVIEW_TASK_TYPES = Set.of(
            GOVERNANCE_DIGEST_TASK_TYPE,
            "quota_risk",
            TERRITORY_COVERAGE_ALERT_TASK_TYPE
    );
    private static final Set<String> ACKNOWLEDGEABLE_GOVERNANCE_TASK_TYPES = Set.of(
            GOVERNANCE_DIGEST_TASK_TYPE,
            "quota_risk",
            TERRITORY_COVERAGE_ALERT_TASK_TYPE,
            GOVERNANCE_OVERDUE_REVIEW_TASK_TYPE
    );
    private static final EnumSet<TaskStatus> OPEN_TASK_STATUSES = EnumSet.of(
            TaskStatus.PENDING,
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS
    );
    private static final EnumSet<LeadStatus> CLOSED_LEAD_STATUSES = EnumSet.of(
            LeadStatus.CONVERTED,
            LeadStatus.LOST,
            LeadStatus.UNQUALIFIED
    );

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {
        log.debug("Calculating dashboard statistics");

        LeadStatsDTO leadStats = leadService.getStatistics();
        DealStatsDTO dealStats = dealService.getStatistics();

        return DashboardStatsDTO.builder()
                .totalLeads(leadStats.getTotalLeads())
                .totalDeals(dealStats.getTotalDeals())
                .totalRevenue(dealStats.getWonValueThisMonth() != null ? dealStats.getWonValueThisMonth() : BigDecimal.ZERO)
                .conversionRate(leadStats.getConversionRate() != null ? leadStats.getConversionRate() : 0.0)
                .winRate(dealStats.getWinRate() != null ? dealStats.getWinRate() : 0.0)
                .activeDeals(dealStats.getActiveDeals() != null ? dealStats.getActiveDeals() : 0L)
                .stalledDealCount(dealStats.getStalledDealCount() != null ? dealStats.getStalledDealCount() : 0L)
                .dealsNeedingAttention(dealStats.getDealsNeedingAttention() != null ? dealStats.getDealsNeedingAttention() : 0L)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AutomationRunResponseDTO> getAutomationRuns(int limit) {
        return automationRunService.getRecentRuns(TenantContext.getTenantId(), limit);
    }

    @Override
    @Transactional(readOnly = true)
    public RevenueOpsSummaryDTO getRevenueOpsSummary() {
        UUID tenantId = TenantContext.getTenantId();
        List<User> revenueUsers = userRepository.findByTenantIdAndIsActiveTrueAndArchivedFalse(tenantId).stream()
                .filter(user -> user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.SALES_REP)
                .toList();
        List<Territory> governedTerritories = territoryRepository.findByTenantIdAndIsActiveTrueAndArchivedFalseOrderByNameAsc(tenantId);
        Set<String> governedTerritoryNames = governedTerritories.stream()
                .map(Territory::getName)
                .map(this::normalizeTerritory)
                .collect(Collectors.toSet());

        List<Deal> deals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        Map<UUID, List<Deal>> dealsByOwner = deals.stream()
                .filter(deal -> deal.getOwnerId() != null)
                .collect(Collectors.groupingBy(Deal::getOwnerId));

        QuarterProgress quarterProgress = calculateQuarterProgress();

        List<RevenueOpsRepDTO> teamProgress = revenueUsers.stream()
                .map(user -> toRepProgress(user, dealsByOwner.getOrDefault(user.getId(), List.of()), governedTerritoryNames, quarterProgress))
                .sorted(Comparator.comparing(RevenueOpsRepDTO::getQuarterlyAttainmentPercent, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(RevenueOpsRepDTO::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        Map<String, List<RevenueOpsRepDTO>> repsByTerritory = new LinkedHashMap<>();
        governedTerritories.forEach(territory -> repsByTerritory.put(normalizeTerritory(territory.getName()), new ArrayList<>()));
        teamProgress.forEach(rep -> repsByTerritory
                .computeIfAbsent(normalizeTerritory(rep.getTerritory()), ignored -> new ArrayList<>())
                .add(rep));

        List<TerritorySummaryDTO> territorySummaries = repsByTerritory.entrySet().stream()
                .map(entry -> toTerritorySummary(entry.getKey(), entry.getValue(), governedTerritoryNames, quarterProgress))
                .sorted(Comparator.comparing(TerritorySummaryDTO::getGoverned, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TerritorySummaryDTO::getQuarterlyQuota, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TerritorySummaryDTO::getTerritory, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        BigDecimal totalPipeline = sum(teamProgress.stream().map(RevenueOpsRepDTO::getPipelineValue).toList());
        BigDecimal totalQuarterlyQuota = sum(teamProgress.stream().map(RevenueOpsRepDTO::getQuarterlyQuota).toList());
        BigDecimal totalAnnualQuota = sum(teamProgress.stream().map(RevenueOpsRepDTO::getAnnualQuota).toList());
        BigDecimal totalWeightedPipeline = sum(teamProgress.stream().map(RevenueOpsRepDTO::getWeightedPipelineValue).toList());
        BigDecimal totalClosedWon = sum(teamProgress.stream().map(RevenueOpsRepDTO::getClosedWonValue).toList());
        BigDecimal expectedClosedValueToDate = percentOf(totalQuarterlyQuota, quarterProgress.percent());
        BigDecimal requiredPipelineValue = requiredPipeline(totalQuarterlyQuota, totalClosedWon);

        return RevenueOpsSummaryDTO.builder()
                .activeRepCount((long) revenueUsers.size())
                .territoriesCovered(territorySummaries.stream().filter(summary -> !isUnassigned(summary.getTerritory())).count())
                .territoryCatalogCount((long) governedTerritories.size())
                .governedTerritoryCount(territorySummaries.stream().filter(summary -> Boolean.TRUE.equals(summary.getGoverned()) && !isUnassigned(summary.getTerritory())).count())
                .outOfCatalogTerritoryCount(territorySummaries.stream().filter(summary -> Boolean.FALSE.equals(summary.getGoverned()) && !isUnassigned(summary.getTerritory())).count())
                .repsWithoutTerritory(teamProgress.stream().filter(rep -> isUnassigned(rep.getTerritory())).count())
                .onTrackRepCount(teamProgress.stream().filter(rep -> "ON_TRACK".equals(rep.getPacingStatus())).count())
                .watchRepCount(teamProgress.stream().filter(rep -> "WATCH".equals(rep.getPacingStatus())).count())
                .atRiskRepCount(teamProgress.stream().filter(rep -> "AT_RISK".equals(rep.getPacingStatus())).count())
                .totalQuarterlyQuota(totalQuarterlyQuota)
                .totalAnnualQuota(totalAnnualQuota)
                .pipelineValue(totalPipeline)
                .weightedPipelineValue(totalWeightedPipeline)
                .closedWonValue(totalClosedWon)
                .attainmentPercent(percent(totalClosedWon, totalQuarterlyQuota))
                .projectedAttainmentPercent(percent(totalClosedWon.add(totalWeightedPipeline), totalQuarterlyQuota))
                .quarterProgressPercent(quarterProgress.percent())
                .expectedClosedValueToDate(expectedClosedValueToDate)
                .requiredPipelineValue(requiredPipelineValue)
                .pipelineCoverageRatio(ratio(totalPipeline, requiredPipelineValue))
                .teamProgress(teamProgress)
                .territorySummaries(territorySummaries)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public QuotaRiskAlertSummaryDTO getQuotaRiskAlerts() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule quotaRiskWorkflow = workflowRuleService.resolveQuotaRiskWorkflow(tenantId);
        List<QuotaRiskAlertItemDTO> alerts = buildQuotaRiskAlerts(tenantId, getRevenueOpsSummary().getTeamProgress(), quotaRiskWorkflow);

        return QuotaRiskAlertSummaryDTO.builder()
                .totalAlerts((long) alerts.size())
                .atRiskCount(alerts.stream().filter(alert -> "AT_RISK".equals(alert.getPacingStatus())).count())
                .watchCount(alerts.stream().filter(alert -> "WATCH".equals(alert.getPacingStatus())).count())
                .alerts(alerts)
                .build();
    }

    @Override
    @Transactional
    public QuotaRiskAutomationResultDTO runQuotaRiskAlertAutomation() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule quotaRiskWorkflow = workflowRuleService.resolveQuotaRiskWorkflow(tenantId);
        if (!Boolean.TRUE.equals(quotaRiskWorkflow.getIsActive())) {
            QuotaRiskAutomationResultDTO result = QuotaRiskAutomationResultDTO.builder()
                    .reviewedReps(0)
                    .tasksCreated(0)
                    .alreadyCoveredReps(0)
                    .createdTaskIds(List.of())
                    .build();
            recordAutomationRun(
                    tenantId,
                    QUOTA_RISK_AUTOMATION_KEY,
                    QUOTA_RISK_AUTOMATION_NAME,
                    TRIGGER_SOURCE_MANUAL,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedReps(),
                    result.getTasksCreated(),
                    result.getAlreadyCoveredReps(),
                    "Quota risk workflow is paused for this workspace."
            );
            return result;
        }
        List<QuotaRiskAlertItemDTO> alerts = buildQuotaRiskAlerts(tenantId, getRevenueOpsSummary().getTeamProgress(), quotaRiskWorkflow);
        User assignee = resolveQuotaRiskAssignee(tenantId);

        int reviewedReps = 0;
        int tasksCreated = 0;
        int alreadyCoveredReps = 0;
        List<UUID> createdTaskIds = new ArrayList<>();

        for (QuotaRiskAlertItemDTO alert : alerts) {
            reviewedReps++;
            if (Boolean.TRUE.equals(alert.getOpenTaskExists())) {
                alreadyCoveredReps++;
                continue;
            }

            UUID assignedTo = assignee != null && !assignee.getId().equals(alert.getUserId())
                    ? assignee.getId()
                    : alert.getUserId();

            Task task = Task.builder()
                    .title(QUOTA_RISK_TASK_PREFIX + alert.getName())
                    .description(buildQuotaRiskTaskDescription(alert))
                    .dueDate(resolveQuotaRiskDueDate(alert, quotaRiskWorkflow))
                    .priority(resolveQuotaRiskPriority(alert, quotaRiskWorkflow))
                    .status(TaskStatus.TODO)
                    .assignedTo(assignedTo)
                    .relatedEntityType("quota_risk")
                    .relatedEntityId(alert.getUserId())
                    .build();
            task.setTenantId(tenantId);

            Task savedTask = taskRepository.save(task);
            createdTaskIds.add(savedTask.getId());
            tasksCreated++;
        }

        QuotaRiskAutomationResultDTO result = QuotaRiskAutomationResultDTO.builder()
                .reviewedReps(reviewedReps)
                .tasksCreated(tasksCreated)
                .alreadyCoveredReps(alreadyCoveredReps)
                .createdTaskIds(createdTaskIds)
                .build();
        recordAutomationRun(
                tenantId,
                QUOTA_RISK_AUTOMATION_KEY,
                QUOTA_RISK_AUTOMATION_NAME,
                TRIGGER_SOURCE_MANUAL,
                RUN_STATUS_SUCCESS,
                result.getReviewedReps(),
                result.getTasksCreated(),
                result.getAlreadyCoveredReps(),
                "Reviewed %d rep(s), created %d quota follow-up task(s), %d already covered."
                        .formatted(reviewedReps, tasksCreated, alreadyCoveredReps)
        );
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public TerritoryExceptionSummaryDTO getTerritoryExceptions() {
        UUID tenantId = TenantContext.getTenantId();
        List<TerritoryExceptionItemDTO> exceptions = buildTerritoryExceptions(tenantId);

        return TerritoryExceptionSummaryDTO.builder()
                .totalExceptions((long) exceptions.size())
                .leadExceptions(exceptions.stream().filter(item -> "LEAD".equals(item.getEntityType())).count())
                .companyExceptions(exceptions.stream().filter(item -> "COMPANY".equals(item.getEntityType())).count())
                .dealExceptions(exceptions.stream().filter(item -> "DEAL".equals(item.getEntityType())).count())
                .highSeverityCount(exceptions.stream().filter(item -> "HIGH".equals(item.getSeverity())).count())
                .exceptions(exceptions)
                .build();
    }

    @Override
    @Transactional
    public TerritoryExceptionAutomationResultDTO runTerritoryExceptionAutomation() {
        UUID tenantId = TenantContext.getTenantId();
        List<TerritoryExceptionItemDTO> exceptions = buildTerritoryExceptions(tenantId);
        User assignee = resolveQuotaRiskAssignee(tenantId);

        int reviewedExceptions = 0;
        int tasksCreated = 0;
        int alreadyCoveredItems = 0;
        List<UUID> createdTaskIds = new ArrayList<>();

        for (TerritoryExceptionItemDTO item : exceptions) {
            reviewedExceptions++;
            if (Boolean.TRUE.equals(item.getOpenTaskExists())) {
                alreadyCoveredItems++;
                continue;
            }

            String relatedEntityType = switch (item.getEntityType()) {
                case "LEAD" -> TERRITORY_EXCEPTION_LEAD_TASK_TYPE;
                case "COMPANY" -> TERRITORY_EXCEPTION_COMPANY_TASK_TYPE;
                default -> TERRITORY_EXCEPTION_DEAL_TASK_TYPE;
            };

            UUID assignedTo = assignee != null && assignee.getId() != null ? assignee.getId() : item.getSuggestedOwnerId();
            Task task = Task.builder()
                    .title(TERRITORY_EXCEPTION_TASK_PREFIX + item.getTitle())
                    .description(buildTerritoryExceptionTaskDescription(item))
                    .dueDate("HIGH".equals(item.getSeverity()) ? LocalDate.now() : LocalDate.now().plusDays(1))
                    .priority("HIGH".equals(item.getSeverity()) ? TaskPriority.HIGH : TaskPriority.MEDIUM)
                    .status(TaskStatus.TODO)
                    .assignedTo(assignedTo)
                    .relatedEntityType(relatedEntityType)
                    .relatedEntityId(item.getEntityId())
                    .build();
            task.setTenantId(tenantId);
            Task savedTask = taskRepository.save(task);
            createdTaskIds.add(savedTask.getId());
            tasksCreated++;
        }

        TerritoryExceptionAutomationResultDTO result = TerritoryExceptionAutomationResultDTO.builder()
                .reviewedExceptions(reviewedExceptions)
                .tasksCreated(tasksCreated)
                .alreadyCoveredItems(alreadyCoveredItems)
                .createdTaskIds(createdTaskIds)
                .build();
        recordAutomationRun(
                tenantId,
                TERRITORY_EXCEPTION_AUTOMATION_KEY,
                TERRITORY_EXCEPTION_AUTOMATION_NAME,
                TRIGGER_SOURCE_MANUAL,
                RUN_STATUS_SUCCESS,
                result.getReviewedExceptions(),
                result.getTasksCreated(),
                result.getAlreadyCoveredItems(),
                "Reviewed %d territory exception(s), created %d review task(s), %d already covered."
                        .formatted(reviewedExceptions, tasksCreated, alreadyCoveredItems)
        );
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public TerritoryEscalationSummaryDTO getTerritoryEscalations() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule territoryEscalationWorkflow = workflowRuleService.resolveTerritoryEscalationWorkflow(tenantId);
        List<TerritoryEscalationItemDTO> escalations = buildTerritoryEscalations(tenantId, buildTerritoryExceptions(tenantId), territoryEscalationWorkflow);

        return TerritoryEscalationSummaryDTO.builder()
                .totalEscalations((long) escalations.size())
                .criticalCount(escalations.stream().filter(item -> "CRITICAL".equals(item.getEscalationLevel())).count())
                .highCount(escalations.stream().filter(item -> "HIGH".equals(item.getEscalationLevel())).count())
                .watchCount(escalations.stream().filter(item -> "WATCH".equals(item.getEscalationLevel())).count())
                .totalPipelineExposure(sum(escalations.stream().map(TerritoryEscalationItemDTO::getPipelineExposure).toList()))
                .escalations(escalations)
                .build();
    }

    @Override
    @Transactional
    public TerritoryEscalationAutomationResultDTO runTerritoryEscalationAutomation() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule territoryEscalationWorkflow = workflowRuleService.resolveTerritoryEscalationWorkflow(tenantId);
        if (!Boolean.TRUE.equals(territoryEscalationWorkflow.getIsActive())) {
            TerritoryEscalationAutomationResultDTO result = TerritoryEscalationAutomationResultDTO.builder()
                    .reviewedEscalations(0)
                    .tasksCreated(0)
                    .alreadyCoveredEscalations(0)
                    .createdTaskIds(List.of())
                    .build();
            recordAutomationRun(
                    tenantId,
                    TERRITORY_ESCALATION_AUTOMATION_KEY,
                    TERRITORY_ESCALATION_AUTOMATION_NAME,
                    TRIGGER_SOURCE_MANUAL,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedEscalations(),
                    result.getTasksCreated(),
                    result.getAlreadyCoveredEscalations(),
                    "Territory escalation workflow is paused for this workspace."
            );
            return result;
        }
        List<TerritoryEscalationItemDTO> escalations = buildTerritoryEscalations(tenantId, buildTerritoryExceptions(tenantId), territoryEscalationWorkflow);
        User assignee = resolveQuotaRiskAssignee(tenantId);
        Set<String> openAlertTitles = openTaskTitles(tenantId, TERRITORY_COVERAGE_ALERT_TASK_TYPE);

        int reviewedEscalations = 0;
        int tasksCreated = 0;
        int alreadyCoveredEscalations = 0;
        List<UUID> createdTaskIds = new ArrayList<>();

        for (TerritoryEscalationItemDTO escalation : escalations) {
            reviewedEscalations++;
            String title = buildTerritoryEscalationTitle(escalation.getTerritory());
            if (openAlertTitles.contains(title)) {
                alreadyCoveredEscalations++;
                continue;
            }

            UUID assignedTo = assignee != null && assignee.getId() != null
                    ? assignee.getId()
                    : escalation.getSuggestedOwnerId();
            UUID relatedEntityId = escalation.getSuggestedOwnerId() != null
                    ? escalation.getSuggestedOwnerId()
                    : assignedTo;
            if (assignedTo == null || relatedEntityId == null) {
                continue;
            }

            Task task = Task.builder()
                    .title(title)
                    .description(buildTerritoryEscalationTaskDescription(escalation))
                    .dueDate(LocalDate.now().plusDays(resolveTerritoryEscalationTaskDueDays(escalation.getEscalationLevel(), territoryEscalationWorkflow)))
                    .priority(resolveTerritoryEscalationTaskPriority(escalation.getEscalationLevel(), territoryEscalationWorkflow))
                    .status(TaskStatus.TODO)
                    .assignedTo(assignedTo)
                    .relatedEntityType(TERRITORY_COVERAGE_ALERT_TASK_TYPE)
                    .relatedEntityId(relatedEntityId)
                    .build();
            task.setTenantId(tenantId);
            Task savedTask = taskRepository.save(task);
            createdTaskIds.add(savedTask.getId());
            openAlertTitles.add(title);
            tasksCreated++;
        }

        TerritoryEscalationAutomationResultDTO result = TerritoryEscalationAutomationResultDTO.builder()
                .reviewedEscalations(reviewedEscalations)
                .tasksCreated(tasksCreated)
                .alreadyCoveredEscalations(alreadyCoveredEscalations)
                .createdTaskIds(createdTaskIds)
                .build();
        recordAutomationRun(
                tenantId,
                TERRITORY_ESCALATION_AUTOMATION_KEY,
                TERRITORY_ESCALATION_AUTOMATION_NAME,
                TRIGGER_SOURCE_MANUAL,
                RUN_STATUS_SUCCESS,
                result.getReviewedEscalations(),
                result.getTasksCreated(),
                result.getAlreadyCoveredEscalations(),
                "Reviewed %d escalation cluster(s), created %d manager alert task(s), %d already covered."
                        .formatted(reviewedEscalations, tasksCreated, alreadyCoveredEscalations)
        );
        return result;
    }

    @Override
    @Transactional
    public TerritoryAutoRemediationResultDTO runTerritoryAutoRemediation() {
        UUID tenantId = TenantContext.getTenantId();
        List<TerritoryExceptionItemDTO> exceptions = buildTerritoryExceptions(tenantId);

        int leadsReassigned = 0;
        int companiesReassigned = 0;
        int dealsReassigned = 0;
        int resolvedReviewTasks = 0;
        int skippedExceptions = 0;
        Set<UUID> updatedLeadIds = new LinkedHashSet<>();
        Set<UUID> updatedCompanyIds = new LinkedHashSet<>();
        Set<UUID> updatedDealIds = new LinkedHashSet<>();

        for (TerritoryExceptionItemDTO item : exceptions) {
            if (item.getSuggestedOwnerId() == null) {
                skippedExceptions++;
                continue;
            }

            User suggestedOwner = userRepository.findByIdAndTenantIdAndArchivedFalse(item.getSuggestedOwnerId(), tenantId)
                    .orElse(null);
            if (suggestedOwner == null || !territoriesAlign(item.getTerritory(), suggestedOwner.getTerritory())) {
                skippedExceptions++;
                continue;
            }

            switch (item.getEntityType()) {
                case "LEAD" -> {
                    Lead lead = leadRepository.findById(item.getEntityId())
                            .filter(entity -> tenantId.equals(entity.getTenantId()) && !Boolean.TRUE.equals(entity.getArchived()))
                            .orElse(null);
                    if (lead == null) {
                        skippedExceptions++;
                        continue;
                    }
                    if (!Objects.equals(lead.getOwnerId(), suggestedOwner.getId())) {
                        lead.setOwnerId(suggestedOwner.getId());
                        leadRepository.save(lead);
                        updatedLeadIds.add(lead.getId());
                        leadsReassigned++;
                    }
                    resolvedReviewTasks += completeOpenReviewTasks(tenantId, TERRITORY_EXCEPTION_LEAD_TASK_TYPE, lead.getId());
                }
                case "COMPANY" -> {
                    Company company = companyRepository.findById(item.getEntityId())
                            .filter(entity -> tenantId.equals(entity.getTenantId()) && !Boolean.TRUE.equals(entity.getArchived()))
                            .orElse(null);
                    if (company == null) {
                        skippedExceptions++;
                        continue;
                    }
                    if (!Objects.equals(company.getOwnerId(), suggestedOwner.getId())) {
                        company.setOwnerId(suggestedOwner.getId());
                        companyRepository.save(company);
                        updatedCompanyIds.add(company.getId());
                        companiesReassigned++;
                    }
                    resolvedReviewTasks += completeOpenReviewTasks(tenantId, TERRITORY_EXCEPTION_COMPANY_TASK_TYPE, company.getId());

                    List<Deal> activeDeals = company.getDeals() == null
                            ? List.of()
                            : company.getDeals().stream().filter(this::isActiveDeal).toList();
                    for (Deal deal : activeDeals) {
                        if (!territoriesAlign(deal.getTerritory(), suggestedOwner.getTerritory())) {
                            continue;
                        }
                        if (!Objects.equals(deal.getOwnerId(), suggestedOwner.getId())) {
                            deal.setOwnerId(suggestedOwner.getId());
                            dealRepository.save(deal);
                            updatedDealIds.add(deal.getId());
                            dealsReassigned++;
                        }
                        resolvedReviewTasks += completeOpenReviewTasks(tenantId, TERRITORY_EXCEPTION_DEAL_TASK_TYPE, deal.getId());
                    }
                }
                case "DEAL" -> {
                    Deal deal = dealRepository.findById(item.getEntityId())
                            .filter(entity -> tenantId.equals(entity.getTenantId()) && !Boolean.TRUE.equals(entity.getArchived()))
                            .orElse(null);
                    if (deal == null) {
                        skippedExceptions++;
                        continue;
                    }
                    if (!Objects.equals(deal.getOwnerId(), suggestedOwner.getId())) {
                        deal.setOwnerId(suggestedOwner.getId());
                        dealRepository.save(deal);
                        updatedDealIds.add(deal.getId());
                        dealsReassigned++;
                    }
                    resolvedReviewTasks += completeOpenReviewTasks(tenantId, TERRITORY_EXCEPTION_DEAL_TASK_TYPE, deal.getId());
                }
                default -> skippedExceptions++;
            }
        }

        TerritoryAutoRemediationResultDTO result = TerritoryAutoRemediationResultDTO.builder()
                .reviewedExceptions(exceptions.size())
                .leadsReassigned(leadsReassigned)
                .companiesReassigned(companiesReassigned)
                .dealsReassigned(dealsReassigned)
                .resolvedReviewTasks(resolvedReviewTasks)
                .skippedExceptions(skippedExceptions)
                .updatedLeadIds(new ArrayList<>(updatedLeadIds))
                .updatedCompanyIds(new ArrayList<>(updatedCompanyIds))
                .updatedDealIds(new ArrayList<>(updatedDealIds))
                .build();
        recordAutomationRun(
                tenantId,
                TERRITORY_AUTO_REMEDIATION_AUTOMATION_KEY,
                TERRITORY_AUTO_REMEDIATION_AUTOMATION_NAME,
                TRIGGER_SOURCE_MANUAL,
                RUN_STATUS_SUCCESS,
                result.getReviewedExceptions(),
                leadsReassigned + companiesReassigned + dealsReassigned,
                result.getSkippedExceptions(),
                "Reviewed %d exception(s), reassigned %d lead(s), %d account(s), %d deal(s), skipped %d."
                        .formatted(exceptions.size(), leadsReassigned, companiesReassigned, dealsReassigned, skippedExceptions)
        );
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public GovernanceInboxSummaryDTO getGovernanceInbox() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule quotaRiskWorkflow = workflowRuleService.resolveQuotaRiskWorkflow(tenantId);
        WorkflowRule governanceOpsWorkflow = workflowRuleService.resolveGovernanceOpsWorkflow(tenantId);
        WorkflowRule territoryEscalationWorkflow = workflowRuleService.resolveTerritoryEscalationWorkflow(tenantId);
        List<QuotaRiskAlertItemDTO> quotaRiskAlerts = buildQuotaRiskAlerts(tenantId, getRevenueOpsSummary().getTeamProgress(), quotaRiskWorkflow);
        List<TerritoryEscalationItemDTO> territoryEscalations = buildTerritoryEscalations(tenantId, buildTerritoryExceptions(tenantId), territoryEscalationWorkflow);
        List<GovernanceInboxItemDTO> items = buildGovernanceInboxItems(quotaRiskAlerts, territoryEscalations);
        List<Task> governanceDigests = findGovernanceDigestTasks(tenantId);
        List<Task> openGovernanceReviewTasks = findOpenGovernanceReviewTasks(tenantId);
        List<Task> overdueReviewTasks = openGovernanceReviewTasks.stream()
                .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(LocalDate.now()))
                .toList();
        Task latestDigest = governanceDigests.isEmpty() ? null : governanceDigests.get(0);
        long openDigestCount = governanceDigests.stream()
                .filter(task -> OPEN_TASK_STATUSES.contains(task.getStatus()))
                .count();
        long overdueReviewTaskCount = overdueReviewTasks.size();
        long watchReviewCount = overdueReviewTasks.stream()
                .filter(task -> "WATCH".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow)))
                .count();
        long highReviewCount = overdueReviewTasks.stream()
                .filter(task -> "HIGH".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow)))
                .count();
        long criticalReviewCount = overdueReviewTasks.stream()
                .filter(task -> "CRITICAL".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow)))
                .count();
        Long oldestOverdueReviewDays = overdueReviewTasks.stream()
                .map(this::governanceReviewOverdueDays)
                .max(Long::compareTo)
                .orElse(null);
        boolean digestCreatedToday = latestDigest != null
                && latestDigest.getCreatedAt() != null
                && latestDigest.getCreatedAt().toLocalDate().isEqual(LocalDate.now());
        Long daysSinceLastDigest = latestDigest == null || latestDigest.getCreatedAt() == null
                ? null
                : Math.max(0L, ChronoUnit.DAYS.between(latestDigest.getCreatedAt().toLocalDate(), LocalDate.now()));

        return GovernanceInboxSummaryDTO.builder()
                .totalItems((long) items.size())
                .territoryEscalationItems(items.stream().filter(item -> "TERRITORY_ESCALATION".equals(item.getItemType())).count())
                .quotaRiskItems(items.stream().filter(item -> "QUOTA_RISK".equals(item.getItemType())).count())
                .slaBreachedItems(items.stream().filter(item -> Boolean.TRUE.equals(item.getSlaBreached())).count())
                .openActionItems(items.stream().filter(item -> Boolean.FALSE.equals(item.getOpenTaskExists())).count())
                .openDigestCount(openDigestCount)
                .openReviewTaskCount((long) openGovernanceReviewTasks.size())
                .overdueReviewTaskCount(overdueReviewTaskCount)
                .watchReviewCount(watchReviewCount)
                .highReviewCount(highReviewCount)
                .criticalReviewCount(criticalReviewCount)
                .oldestOverdueReviewDays(oldestOverdueReviewDays)
                .digestDue(isGovernanceDigestDue(items, digestCreatedToday, daysSinceLastDigest, governanceOpsWorkflow))
                .reviewSlaStatus(determineGovernanceReviewStatus(criticalReviewCount, highReviewCount, watchReviewCount))
                .daysSinceLastDigest(daysSinceLastDigest)
                .lastDigestCreatedAt(latestDigest != null ? latestDigest.getCreatedAt() : null)
                .lastDigestStatus(latestDigest != null && latestDigest.getStatus() != null ? latestDigest.getStatus().name() : null)
                .recentDigests(governanceDigests.stream().limit(5).map(this::toGovernanceDigestHistoryItem).toList())
                .items(items)
                .build();
    }

    @Override
    @Transactional
    public GovernanceDigestAutomationResultDTO runGovernanceDigestAutomation() {
        return runGovernanceDigestAutomation(TRIGGER_SOURCE_MANUAL);
    }

    private GovernanceDigestAutomationResultDTO runGovernanceDigestAutomation(String triggerSource) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule governanceOpsWorkflow = workflowRuleService.resolveGovernanceOpsWorkflow(tenantId);
        if (!Boolean.TRUE.equals(governanceOpsWorkflow.getIsActive())) {
            GovernanceDigestAutomationResultDTO result = GovernanceDigestAutomationResultDTO.builder()
                    .reviewedItems(0)
                    .digestsCreated(0)
                    .alreadyCoveredDigests(0)
                    .createdTaskIds(List.of())
                    .build();
            recordAutomationRun(
                    tenantId,
                    GOVERNANCE_DIGEST_AUTOMATION_KEY,
                    GOVERNANCE_DIGEST_AUTOMATION_NAME,
                    triggerSource,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedItems(),
                    result.getDigestsCreated(),
                    result.getAlreadyCoveredDigests(),
                    "Governance ops workflow is paused for this workspace."
            );
            return result;
        }
        GovernanceInboxSummaryDTO inbox = getGovernanceInbox();
        User assignee = resolveQuotaRiskAssignee(tenantId);
        if (assignee == null || assignee.getId() == null) {
            GovernanceDigestAutomationResultDTO result = GovernanceDigestAutomationResultDTO.builder()
                    .reviewedItems(inbox.getItems() != null ? inbox.getItems().size() : 0)
                    .digestsCreated(0)
                    .alreadyCoveredDigests(0)
                    .createdTaskIds(List.of())
                    .build();
            recordAutomationRun(
                    tenantId,
                    GOVERNANCE_DIGEST_AUTOMATION_KEY,
                    GOVERNANCE_DIGEST_AUTOMATION_NAME,
                    triggerSource,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedItems(),
                    result.getDigestsCreated(),
                    result.getAlreadyCoveredDigests(),
                    "No assignee was available for the governance digest."
            );
            return result;
        }

        String title = GOVERNANCE_DIGEST_TASK_PREFIX + LocalDate.now();
        Set<String> openDigestTitles = openTaskTitles(tenantId, GOVERNANCE_DIGEST_TASK_TYPE);
        if (openDigestTitles.contains(title)) {
            GovernanceDigestAutomationResultDTO result = GovernanceDigestAutomationResultDTO.builder()
                    .reviewedItems(inbox.getItems() != null ? inbox.getItems().size() : 0)
                    .digestsCreated(0)
                    .alreadyCoveredDigests(1)
                    .createdTaskIds(List.of())
                    .build();
            recordAutomationRun(
                    tenantId,
                    GOVERNANCE_DIGEST_AUTOMATION_KEY,
                    GOVERNANCE_DIGEST_AUTOMATION_NAME,
                    triggerSource,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedItems(),
                    result.getDigestsCreated(),
                    result.getAlreadyCoveredDigests(),
                    "A governance digest already exists for today."
            );
            return result;
        }

        Task digestTask = Task.builder()
                .title(title)
                .description(buildGovernanceDigestDescription(inbox))
                .dueDate(LocalDate.now().plusDays(governanceOpsWorkflow.getDigestTaskDueDays()))
                .priority(resolveGovernanceDigestPriority(inbox, governanceOpsWorkflow))
                .status(TaskStatus.TODO)
                .assignedTo(assignee.getId())
                .relatedEntityType(GOVERNANCE_DIGEST_TASK_TYPE)
                .relatedEntityId(assignee.getId())
                .build();
        digestTask.setTenantId(tenantId);
        Task savedTask = taskRepository.save(digestTask);

        GovernanceDigestAutomationResultDTO result = GovernanceDigestAutomationResultDTO.builder()
                .reviewedItems(inbox.getItems() != null ? inbox.getItems().size() : 0)
                .digestsCreated(1)
                .alreadyCoveredDigests(0)
                .createdTaskIds(List.of(savedTask.getId()))
                .build();
        recordAutomationRun(
                tenantId,
                GOVERNANCE_DIGEST_AUTOMATION_KEY,
                GOVERNANCE_DIGEST_AUTOMATION_NAME,
                triggerSource,
                RUN_STATUS_SUCCESS,
                result.getReviewedItems(),
                result.getDigestsCreated(),
                result.getAlreadyCoveredDigests(),
                "Reviewed %d governance item(s) and created %d digest task."
                        .formatted(result.getReviewedItems(), result.getDigestsCreated())
        );
        return result;
    }

    @Override
    @Transactional
    public GovernanceAutomationResultDTO runGovernanceAutomation() {
        return runGovernanceAutomationInternal(TRIGGER_SOURCE_MANUAL);
    }

    @Override
    @Transactional
    public GovernanceAutomationResultDTO runGovernanceAutomationScheduled() {
        return runGovernanceAutomationInternal(TRIGGER_SOURCE_SCHEDULED);
    }

    private GovernanceAutomationResultDTO runGovernanceAutomationInternal(String triggerSource) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule governanceOpsWorkflow = workflowRuleService.resolveGovernanceOpsWorkflow(tenantId);
        GovernanceInboxSummaryDTO inbox = getGovernanceInbox();
        List<UUID> createdTaskIds = new ArrayList<>();
        int digestsCreated = 0;
        int overdueTasksEscalated = 0;
        int escalationTasksCreated = 0;
        int alreadyCoveredEscalations = 0;

        if (!Boolean.TRUE.equals(governanceOpsWorkflow.getIsActive())) {
            GovernanceAutomationResultDTO result = GovernanceAutomationResultDTO.builder()
                    .reviewedItems(inbox.getItems() != null ? inbox.getItems().size() : 0)
                    .digestsCreated(0)
                    .overdueTasksEscalated(0)
                    .escalationTasksCreated(0)
                    .alreadyCoveredEscalations(0)
                    .createdTaskIds(List.of())
                    .build();
            recordAutomationRun(
                    tenantId,
                    GOVERNANCE_OPS_AUTOMATION_KEY,
                    GOVERNANCE_OPS_AUTOMATION_NAME,
                    triggerSource,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedItems(),
                    result.getDigestsCreated() + result.getEscalationTasksCreated(),
                    result.getAlreadyCoveredEscalations(),
                    "Governance ops workflow is paused for this workspace."
            );
            return result;
        }

        if (Boolean.TRUE.equals(inbox.getDigestDue()) && inbox.getTotalItems() != null && inbox.getTotalItems() > 0) {
            GovernanceDigestAutomationResultDTO digestResult = runGovernanceDigestAutomation(triggerSource);
            digestsCreated += digestResult.getDigestsCreated() != null ? digestResult.getDigestsCreated() : 0;
            if (digestResult.getCreatedTaskIds() != null) {
                createdTaskIds.addAll(digestResult.getCreatedTaskIds());
            }
        }

        List<Task> overdueReviewTasks = findOpenGovernanceReviewTasks(tenantId).stream()
                .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(LocalDate.now()))
                .toList();
        String reviewSlaStatus = determineGovernanceReviewStatus(
                overdueReviewTasks.stream().filter(task -> "CRITICAL".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow))).count(),
                overdueReviewTasks.stream().filter(task -> "HIGH".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow))).count(),
                overdueReviewTasks.stream().filter(task -> "WATCH".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow))).count()
        );

        List<Task> tasksToUpdate = overdueReviewTasks.stream()
                .filter(task -> task.getPriority() != governanceOpsWorkflow.getOverdueReviewTaskPriority())
                .peek(task -> task.setPriority(governanceOpsWorkflow.getOverdueReviewTaskPriority()))
                .toList();
        if (!tasksToUpdate.isEmpty()) {
            taskRepository.saveAll(tasksToUpdate);
            overdueTasksEscalated = tasksToUpdate.size();
        }

        if (!overdueReviewTasks.isEmpty()) {
            User assignee = resolveQuotaRiskAssignee(tenantId);
            String escalationTitle = GOVERNANCE_OVERDUE_REVIEW_PREFIX + LocalDate.now();
            Set<String> openEscalationTitles = openTaskTitles(tenantId, GOVERNANCE_OVERDUE_REVIEW_TASK_TYPE);

            if (assignee != null && assignee.getId() != null && !openEscalationTitles.contains(escalationTitle)) {
                Task escalationTask = Task.builder()
                        .title(escalationTitle)
                        .description(buildOverdueGovernanceReviewDescription(overdueReviewTasks, reviewSlaStatus, governanceOpsWorkflow))
                        .dueDate(LocalDate.now().plusDays(governanceOpsWorkflow.getOverdueEscalationTaskDueDays()))
                        .priority(governanceOpsWorkflow.getOverdueEscalationTaskPriority())
                        .status(TaskStatus.TODO)
                        .assignedTo(assignee.getId())
                        .relatedEntityType(GOVERNANCE_OVERDUE_REVIEW_TASK_TYPE)
                        .relatedEntityId(assignee.getId())
                        .build();
                escalationTask.setTenantId(tenantId);
                Task savedTask = taskRepository.save(escalationTask);
                createdTaskIds.add(savedTask.getId());
                escalationTasksCreated++;
            } else if (!openEscalationTitles.isEmpty()) {
                alreadyCoveredEscalations = 1;
            }
        }

        GovernanceAutomationResultDTO result = GovernanceAutomationResultDTO.builder()
                .reviewedItems(inbox.getItems() != null ? inbox.getItems().size() : 0)
                .digestsCreated(digestsCreated)
                .overdueTasksEscalated(overdueTasksEscalated)
                .escalationTasksCreated(escalationTasksCreated)
                .alreadyCoveredEscalations(alreadyCoveredEscalations)
                .createdTaskIds(createdTaskIds)
                .build();
        recordAutomationRun(
                tenantId,
                GOVERNANCE_OPS_AUTOMATION_KEY,
                GOVERNANCE_OPS_AUTOMATION_NAME,
                triggerSource,
                RUN_STATUS_SUCCESS,
                result.getReviewedItems(),
                digestsCreated + escalationTasksCreated,
                result.getAlreadyCoveredEscalations(),
                "Reviewed %d governance item(s), created %d digest(s), escalated %d overdue review task(s), and created %d escalation task(s)."
                        .formatted(result.getReviewedItems(), digestsCreated, overdueTasksEscalated, escalationTasksCreated)
        );
        return result;
    }

    @Override
    @Transactional
    public GovernanceTaskAcknowledgementResultDTO acknowledgeGovernanceTask(UUID taskId) {
        UUID tenantId = TenantContext.getTenantId();
        Task task = taskRepository.findByIdAndTenantIdAndArchivedFalse(taskId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Governance task not found"));

        if (task.getRelatedEntityType() == null || !ACKNOWLEDGEABLE_GOVERNANCE_TASK_TYPES.contains(task.getRelatedEntityType())) {
            throw new IllegalArgumentException("Task is not a governance acknowledgement task");
        }

        TaskStatus previousStatus = task.getStatus();
        boolean acknowledged = OPEN_TASK_STATUSES.contains(previousStatus);
        if (acknowledged) {
            task.setStatus(TaskStatus.COMPLETED);
            taskRepository.save(task);
        }

        return GovernanceTaskAcknowledgementResultDTO.builder()
                .taskId(task.getId())
                .relatedEntityType(task.getRelatedEntityType())
                .acknowledged(acknowledged)
                .previousStatus(previousStatus != null ? previousStatus.name() : null)
                .newStatus(task.getStatus() != null ? task.getStatus().name() : null)
                .build();
    }

    private RevenueOpsRepDTO toRepProgress(
            User user,
            List<Deal> deals,
            Set<String> governedTerritoryNames,
            QuarterProgress quarterProgress
    ) {
        BigDecimal pipelineValue = sum(
                deals.stream()
                        .filter(this::isActiveDeal)
                        .map(Deal::getValue)
                        .toList()
        );
        BigDecimal weightedPipelineValue = sum(
                deals.stream()
                        .filter(this::isActiveDeal)
                        .map(Deal::getWeightedValue)
                        .toList()
        );
        BigDecimal closedWonValue = sum(
                deals.stream()
                        .filter(deal -> deal.getStage() == DealStage.CLOSED_WON)
                        .map(Deal::getValue)
                        .toList()
        );
        BigDecimal expectedClosedValue = percentOf(user.getQuarterlyQuota(), quarterProgress.percent());
        BigDecimal requiredPipelineValue = requiredPipeline(user.getQuarterlyQuota(), closedWonValue);
        Double projectedAttainmentPercent = percent(closedWonValue.add(weightedPipelineValue), user.getQuarterlyQuota());
        Double pipelineCoverageRatio = ratio(pipelineValue, requiredPipelineValue);
        String territory = normalizeTerritory(user.getTerritory());

        return RevenueOpsRepDTO.builder()
                .userId(user.getId())
                .name(user.getFullName())
                .role(user.getRole().name())
                .territory(territory)
                .quarterlyQuota(user.getQuarterlyQuota())
                .annualQuota(user.getAnnualQuota())
                .pipelineValue(pipelineValue)
                .weightedPipelineValue(weightedPipelineValue)
                .closedWonValue(closedWonValue)
                .quarterlyAttainmentPercent(percent(closedWonValue, user.getQuarterlyQuota()))
                .projectedAttainmentPercent(projectedAttainmentPercent)
                .expectedClosedValue(expectedClosedValue)
                .quotaGap(quotaGap(user.getQuarterlyQuota(), closedWonValue))
                .requiredPipelineValue(requiredPipelineValue)
                .pipelineCoverageRatio(pipelineCoverageRatio)
                .pacingStatus(pacingStatus(user.getQuarterlyQuota(), closedWonValue, weightedPipelineValue, pipelineCoverageRatio, expectedClosedValue))
                .governedTerritory(!isUnassigned(territory) && governedTerritoryNames.contains(territory))
                .build();
    }

    private List<QuotaRiskAlertItemDTO> buildQuotaRiskAlerts(UUID tenantId, List<RevenueOpsRepDTO> teamProgress, WorkflowRule quotaRiskWorkflow) {
        if (!Boolean.TRUE.equals(quotaRiskWorkflow.getIsActive())) {
            return List.of();
        }
        Map<UUID, Task> openTasksByRep = openTaskByEntityId(tenantId, "quota_risk");

        return teamProgress.stream()
                .filter(rep -> includeQuotaRiskRep(rep, quotaRiskWorkflow))
                .sorted(Comparator
                        .comparingInt((RevenueOpsRepDTO rep) -> "AT_RISK".equals(rep.getPacingStatus()) ? 0 : 1)
                        .thenComparing(RevenueOpsRepDTO::getQuotaGap, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(RevenueOpsRepDTO::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(rep -> QuotaRiskAlertItemDTO.builder()
                        .userId(rep.getUserId())
                        .name(rep.getName())
                        .role(rep.getRole())
                        .territory(rep.getTerritory())
                        .quarterlyQuota(rep.getQuarterlyQuota())
                        .annualQuota(rep.getAnnualQuota())
                        .closedWonValue(rep.getClosedWonValue())
                        .weightedPipelineValue(rep.getWeightedPipelineValue())
                        .expectedClosedValue(rep.getExpectedClosedValue())
                        .quotaGap(rep.getQuotaGap())
                        .requiredPipelineValue(rep.getRequiredPipelineValue())
                        .projectedAttainmentPercent(rep.getProjectedAttainmentPercent())
                        .pipelineCoverageRatio(rep.getPipelineCoverageRatio())
                        .pacingStatus(rep.getPacingStatus())
                        .governedTerritory(rep.getGovernedTerritory())
                        .openTaskExists(openTasksByRep.containsKey(rep.getUserId()))
                        .openTaskId(openTasksByRep.containsKey(rep.getUserId()) ? openTasksByRep.get(rep.getUserId()).getId() : null)
                        .openTaskStatus(openTasksByRep.containsKey(rep.getUserId()) && openTasksByRep.get(rep.getUserId()).getStatus() != null
                                ? openTasksByRep.get(rep.getUserId()).getStatus().name()
                                : null)
                        .build())
                .toList();
    }

    private List<TerritoryExceptionItemDTO> buildTerritoryExceptions(UUID tenantId) {
        Map<UUID, TerritorySuggestion> leadSuggestions = new LinkedHashMap<>();
        Map<UUID, TerritorySuggestion> companySuggestions = new LinkedHashMap<>();
        Map<UUID, TerritorySuggestion> dealSuggestions = new LinkedHashMap<>();

        Map<UUID, Boolean> openLeadTasks = openTaskMap(tenantId, TERRITORY_EXCEPTION_LEAD_TASK_TYPE);
        Map<UUID, Boolean> openCompanyTasks = openTaskMap(tenantId, TERRITORY_EXCEPTION_COMPANY_TASK_TYPE);
        Map<UUID, Boolean> openDealTasks = openTaskMap(tenantId, TERRITORY_EXCEPTION_DEAL_TASK_TYPE);

        List<TerritoryExceptionItemDTO> items = new ArrayList<>();

        List<Lead> leads = leadRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        for (Lead lead : leads) {
            if (CLOSED_LEAD_STATUSES.contains(lead.getStatus()) || !hasLeadTerritoryMismatch(lead)) {
                continue;
            }
            TerritorySuggestion suggestion = suggestOwner(tenantId, normalizeOptionalTerritory(lead.getTerritory()), WorkloadType.LEAD);
            leadSuggestions.put(lead.getId(), suggestion);
            items.add(TerritoryExceptionItemDTO.builder()
                    .entityType("LEAD")
                    .entityId(lead.getId())
                    .title(lead.getFullName())
                    .territory(lead.getTerritory())
                    .ownerName(lead.getOwner() != null ? lead.getOwner().getFullName() : null)
                    .ownerTerritory(lead.getOwner() != null ? lead.getOwner().getTerritory() : null)
                    .suggestedOwnerId(suggestion != null ? suggestion.userId() : null)
                    .suggestedOwnerName(suggestion != null ? suggestion.userName() : null)
                    .suggestedOwnerTerritory(suggestion != null ? suggestion.territory() : null)
                    .severity(leadSeverity(lead))
                    .impactValue(lead.getEstimatedValue())
                    .ageDays(entityAgeDays(lead))
                    .openTaskExists(openLeadTasks.getOrDefault(lead.getId(), false))
                    .build());
        }

        List<Company> companies = companyRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        for (Company company : companies) {
            if (!hasCompanyTerritoryMismatch(company)) {
                continue;
            }
            TerritorySuggestion suggestion = suggestOwner(tenantId, normalizeOptionalTerritory(company.getTerritory()), WorkloadType.COMPANY);
            companySuggestions.put(company.getId(), suggestion);
            items.add(TerritoryExceptionItemDTO.builder()
                    .entityType("COMPANY")
                    .entityId(company.getId())
                    .title(company.getName())
                    .territory(company.getTerritory())
                    .ownerName(company.getOwner() != null ? company.getOwner().getFullName() : null)
                    .ownerTerritory(company.getOwner() != null ? company.getOwner().getTerritory() : null)
                    .suggestedOwnerId(suggestion != null ? suggestion.userId() : null)
                    .suggestedOwnerName(suggestion != null ? suggestion.userName() : null)
                    .suggestedOwnerTerritory(suggestion != null ? suggestion.territory() : null)
                    .severity(companySeverity(company))
                    .impactValue(company.getDeals() == null ? BigDecimal.ZERO : company.getDeals().stream()
                            .filter(this::isActiveDeal)
                            .map(Deal::getValue)
                            .filter(value -> value != null)
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .ageDays(entityAgeDays(company))
                    .openTaskExists(openCompanyTasks.getOrDefault(company.getId(), false))
                    .build());
        }

        List<Deal> deals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged()).getContent();
        for (Deal deal : deals) {
            if (!isActiveDeal(deal) || !hasDealTerritoryMismatch(deal)) {
                continue;
            }
            TerritorySuggestion suggestion = suggestOwner(tenantId, normalizeOptionalTerritory(deal.getTerritory()), WorkloadType.DEAL);
            dealSuggestions.put(deal.getId(), suggestion);
            items.add(TerritoryExceptionItemDTO.builder()
                    .entityType("DEAL")
                    .entityId(deal.getId())
                    .title(deal.getName())
                    .territory(deal.getTerritory())
                    .ownerName(deal.getOwner() != null ? deal.getOwner().getFullName() : null)
                    .ownerTerritory(deal.getOwner() != null ? deal.getOwner().getTerritory() : null)
                    .suggestedOwnerId(suggestion != null ? suggestion.userId() : null)
                    .suggestedOwnerName(suggestion != null ? suggestion.userName() : null)
                    .suggestedOwnerTerritory(suggestion != null ? suggestion.territory() : null)
                    .severity(dealSeverity(deal))
                    .impactValue(deal.getValue())
                    .stage(deal.getStage() != null ? deal.getStage().name() : null)
                    .dueDate(deal.getNextStepDueDate())
                    .ageDays(entityAgeDays(deal))
                    .openTaskExists(openDealTasks.getOrDefault(deal.getId(), false))
                    .build());
        }

        return items.stream()
                .sorted(Comparator
                        .comparingInt((TerritoryExceptionItemDTO item) -> severityRank(item.getSeverity()))
                        .thenComparing(TerritoryExceptionItemDTO::getImpactValue, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TerritoryExceptionItemDTO::getTitle, Comparator.nullsLast(String::compareToIgnoreCase)))
                .limit(12)
                .toList();
    }

    private TerritorySummaryDTO toTerritorySummary(
            String territory,
            List<RevenueOpsRepDTO> reps,
            Set<String> governedTerritoryNames,
            QuarterProgress quarterProgress
    ) {
        BigDecimal quarterlyQuota = sum(reps.stream().map(RevenueOpsRepDTO::getQuarterlyQuota).toList());
        BigDecimal pipelineValue = sum(reps.stream().map(RevenueOpsRepDTO::getPipelineValue).toList());
        BigDecimal weightedPipelineValue = sum(reps.stream().map(RevenueOpsRepDTO::getWeightedPipelineValue).toList());
        BigDecimal closedWonValue = sum(reps.stream().map(RevenueOpsRepDTO::getClosedWonValue).toList());
        BigDecimal requiredPipelineValue = requiredPipeline(quarterlyQuota, closedWonValue);
        BigDecimal expectedClosedValue = percentOf(quarterlyQuota, quarterProgress.percent());
        Double pipelineCoverageRatio = ratio(pipelineValue, requiredPipelineValue);

        return TerritorySummaryDTO.builder()
                .territory(territory)
                .governed(!isUnassigned(territory) && governedTerritoryNames.contains(territory))
                .repCount((long) reps.size())
                .quarterlyQuota(quarterlyQuota)
                .pipelineValue(pipelineValue)
                .weightedPipelineValue(weightedPipelineValue)
                .closedWonValue(closedWonValue)
                .attainmentPercent(percent(closedWonValue, quarterlyQuota))
                .projectedAttainmentPercent(percent(closedWonValue.add(weightedPipelineValue), quarterlyQuota))
                .requiredPipelineValue(requiredPipelineValue)
                .pipelineCoverageRatio(pipelineCoverageRatio)
                .pacingStatus(pacingStatus(quarterlyQuota, closedWonValue, weightedPipelineValue, pipelineCoverageRatio, expectedClosedValue))
                .onTrackRepCount(reps.stream().filter(rep -> "ON_TRACK".equals(rep.getPacingStatus())).count())
                .watchRepCount(reps.stream().filter(rep -> "WATCH".equals(rep.getPacingStatus())).count())
                .atRiskRepCount(reps.stream().filter(rep -> "AT_RISK".equals(rep.getPacingStatus())).count())
                .build();
    }

    private boolean isActiveDeal(Deal deal) {
        return deal.getStage() != DealStage.CLOSED_WON && deal.getStage() != DealStage.CLOSED_LOST;
    }

    private BigDecimal sum(List<BigDecimal> values) {
        return values.stream()
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Double percent(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) <= 0) {
            return 0.0;
        }
        return numerator.multiply(BigDecimal.valueOf(100))
                .divide(denominator, 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private BigDecimal quotaGap(BigDecimal quota, BigDecimal closedWon) {
        if (quota == null) {
            return BigDecimal.ZERO;
        }
        return quota.subtract(closedWon != null ? closedWon : BigDecimal.ZERO);
    }

    private BigDecimal requiredPipeline(BigDecimal quota, BigDecimal closedWon) {
        if (quota == null || quota.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal remaining = quota.subtract(closedWon != null ? closedWon : BigDecimal.ZERO);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return remaining.multiply(BigDecimal.valueOf(3));
    }

    private Double ratio(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) <= 0) {
            return 0.0;
        }
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP).doubleValue();
    }

    private BigDecimal percentOf(BigDecimal value, double percent) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return value.multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private String pacingStatus(
            BigDecimal quota,
            BigDecimal closedWon,
            BigDecimal weightedPipeline,
            Double pipelineCoverageRatio,
            BigDecimal expectedClosedValue
    ) {
        if (quota == null || quota.compareTo(BigDecimal.ZERO) <= 0) {
            return "NO_QUOTA";
        }

        BigDecimal achieved = closedWon != null ? closedWon : BigDecimal.ZERO;
        BigDecimal projected = achieved.add(weightedPipeline != null ? weightedPipeline : BigDecimal.ZERO);

        if (projected.compareTo(quota) >= 0
                && (expectedClosedValue == null
                || expectedClosedValue.compareTo(BigDecimal.ZERO) <= 0
                || achieved.compareTo(expectedClosedValue.multiply(BigDecimal.valueOf(0.6))) >= 0
                || (pipelineCoverageRatio != null && pipelineCoverageRatio >= 1.0))) {
            return "ON_TRACK";
        }

        if (projected.compareTo(quota.multiply(BigDecimal.valueOf(0.85))) >= 0
                || (pipelineCoverageRatio != null && pipelineCoverageRatio >= 0.7)) {
            return "WATCH";
        }

        return "AT_RISK";
    }

    private User resolveQuotaRiskAssignee(UUID tenantId) {
        List<User> approvers = userRepository.findByTenantIdAndRoleInAndIsActiveTrueAndArchivedFalse(
                tenantId,
                List.of(UserRole.MANAGER, UserRole.ADMIN)
        );
        return approvers.stream()
                .sorted(Comparator
                        .comparing((User user) -> user.getRole() == UserRole.MANAGER ? 0 : 1)
                        .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .findFirst()
                .orElse(null);
    }

    private Map<UUID, Boolean> openTaskMap(UUID tenantId, String relatedEntityType) {
        return taskRepository.findByTenantIdAndRelatedEntityTypeAndArchivedFalse(tenantId, relatedEntityType)
                .stream()
                .filter(task -> task.getRelatedEntityId() != null)
                .collect(Collectors.toMap(
                        Task::getRelatedEntityId,
                        task -> OPEN_TASK_STATUSES.contains(task.getStatus()),
                        Boolean::logicalOr
                ));
    }

    private Map<UUID, Task> openTaskByEntityId(UUID tenantId, String relatedEntityType) {
        return taskRepository.findByTenantIdAndRelatedEntityTypeAndArchivedFalse(tenantId, relatedEntityType)
                .stream()
                .filter(task -> task.getRelatedEntityId() != null)
                .filter(task -> OPEN_TASK_STATUSES.contains(task.getStatus()))
                .collect(Collectors.toMap(
                        Task::getRelatedEntityId,
                        task -> task,
                        (existing, replacement) -> existing.getCreatedAt() != null
                                && replacement.getCreatedAt() != null
                                && existing.getCreatedAt().isAfter(replacement.getCreatedAt())
                                ? existing
                                : replacement
                ));
    }

    private boolean includeQuotaRiskRep(RevenueOpsRepDTO rep, WorkflowRule quotaRiskWorkflow) {
        return ("AT_RISK".equals(rep.getPacingStatus()) && Boolean.TRUE.equals(quotaRiskWorkflow.getIncludeAtRiskReps()))
                || ("WATCH".equals(rep.getPacingStatus()) && Boolean.TRUE.equals(quotaRiskWorkflow.getIncludeWatchReps()));
    }

    private LocalDate resolveQuotaRiskDueDate(QuotaRiskAlertItemDTO alert, WorkflowRule quotaRiskWorkflow) {
        int dueDays = "AT_RISK".equals(alert.getPacingStatus())
                ? quotaRiskWorkflow.getAtRiskTaskDueDays()
                : quotaRiskWorkflow.getWatchTaskDueDays();
        return LocalDate.now().plusDays(dueDays);
    }

    private TaskPriority resolveQuotaRiskPriority(QuotaRiskAlertItemDTO alert, WorkflowRule quotaRiskWorkflow) {
        return "AT_RISK".equals(alert.getPacingStatus())
                ? quotaRiskWorkflow.getAtRiskTaskPriority()
                : quotaRiskWorkflow.getWatchTaskPriority();
    }

    private Set<String> openTaskTitles(UUID tenantId, String relatedEntityType) {
        return taskRepository.findByTenantIdAndRelatedEntityTypeAndArchivedFalse(tenantId, relatedEntityType)
                .stream()
                .filter(task -> OPEN_TASK_STATUSES.contains(task.getStatus()))
                .map(Task::getTitle)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Map<String, Task> openTaskByTitle(UUID tenantId, String relatedEntityType) {
        return taskRepository.findByTenantIdAndRelatedEntityTypeAndArchivedFalse(tenantId, relatedEntityType)
                .stream()
                .filter(task -> OPEN_TASK_STATUSES.contains(task.getStatus()))
                .filter(task -> task.getTitle() != null)
                .collect(Collectors.toMap(
                        Task::getTitle,
                        task -> task,
                        (existing, replacement) -> existing.getCreatedAt() != null
                                && replacement.getCreatedAt() != null
                                && existing.getCreatedAt().isAfter(replacement.getCreatedAt())
                                ? existing
                                : replacement
                ));
    }

    private String buildQuotaRiskTaskDescription(QuotaRiskAlertItemDTO alert) {
        StringBuilder description = new StringBuilder("Review quota pacing and recovery plan for ")
                .append(alert.getName())
                .append(".");
        if (alert.getTerritory() != null) {
            description.append(" Territory: ").append(alert.getTerritory()).append(".");
        }
        description.append(" Current pace: ").append(alert.getPacingStatus()).append(".");
        if (alert.getQuarterlyQuota() != null) {
            description.append(" Quarterly quota: ").append(alert.getQuarterlyQuota()).append(".");
        }
        if (alert.getExpectedClosedValue() != null) {
            description.append(" Expected closed value by now: ").append(alert.getExpectedClosedValue()).append(".");
        }
        if (alert.getClosedWonValue() != null) {
            description.append(" Closed won: ").append(alert.getClosedWonValue()).append(".");
        }
        if (alert.getProjectedAttainmentPercent() != null) {
            description.append(" Projected attainment: ").append(alert.getProjectedAttainmentPercent()).append("%.");
        }
        if (alert.getPipelineCoverageRatio() != null) {
            description.append(" Pipeline coverage: ").append(alert.getPipelineCoverageRatio()).append("x.");
        }
        if (Boolean.FALSE.equals(alert.getGovernedTerritory())) {
            description.append(" Territory assignment is outside the governed catalog.");
        }
        return description.toString();
    }

    private String buildTerritoryExceptionTaskDescription(TerritoryExceptionItemDTO item) {
        StringBuilder description = new StringBuilder("Review territory ownership mismatch for ")
                .append(item.getEntityType().toLowerCase())
                .append(" ")
                .append(item.getTitle())
                .append(".");
        if (item.getTerritory() != null) {
            description.append(" Expected territory: ").append(item.getTerritory()).append(".");
        }
        if (item.getOwnerName() != null) {
            description.append(" Current owner: ").append(item.getOwnerName()).append(" (").append(item.getOwnerTerritory()).append(").");
        }
        if (item.getSuggestedOwnerName() != null) {
            description.append(" Suggested owner: ").append(item.getSuggestedOwnerName()).append(" (").append(item.getSuggestedOwnerTerritory()).append(").");
        }
        if (item.getImpactValue() != null && item.getImpactValue().compareTo(BigDecimal.ZERO) > 0) {
            description.append(" Impact value: ").append(item.getImpactValue()).append(".");
        }
        if (item.getStage() != null) {
            description.append(" Current stage: ").append(item.getStage()).append(".");
        }
        return description.toString();
    }

    private String buildTerritoryEscalationTaskDescription(TerritoryEscalationItemDTO escalation) {
        StringBuilder description = new StringBuilder("Review grouped territory drift for ")
                .append(normalizeTerritory(escalation.getTerritory()))
                .append(".");
        if (escalation.getSuggestedOwnerName() != null) {
            description.append(" Recommended owner: ")
                    .append(escalation.getSuggestedOwnerName());
            if (escalation.getSuggestedOwnerTerritory() != null) {
                description.append(" (").append(escalation.getSuggestedOwnerTerritory()).append(")");
            }
            description.append(".");
        }
        description.append(" Exception count: ").append(escalation.getTotalExceptions()).append(".");
        description.append(" Leads: ").append(escalation.getLeadExceptions()).append(",");
        description.append(" accounts: ").append(escalation.getCompanyExceptions()).append(",");
        description.append(" deals: ").append(escalation.getDealExceptions()).append(".");
        if (escalation.getHighSeverityCount() != null && escalation.getHighSeverityCount() > 0) {
            description.append(" High severity items: ").append(escalation.getHighSeverityCount()).append(".");
        }
        if (escalation.getRepeatedMismatchCount() != null && escalation.getRepeatedMismatchCount() > 0) {
            description.append(" Existing review coverage already open on ")
                    .append(escalation.getRepeatedMismatchCount())
                    .append(" item")
                    .append(escalation.getRepeatedMismatchCount() == 1 ? "." : "s.");
        }
        if (escalation.getPipelineExposure() != null && escalation.getPipelineExposure().compareTo(BigDecimal.ZERO) > 0) {
            description.append(" Pipeline exposure: ").append(escalation.getPipelineExposure()).append(".");
        }
        description.append(" Escalation level: ").append(escalation.getEscalationLevel()).append(".");
        return description.toString();
    }

    private String buildTerritoryEscalationTitle(String territory) {
        return TERRITORY_COVERAGE_ALERT_PREFIX + normalizeTerritory(territory);
    }

    private TerritorySuggestion suggestOwner(UUID tenantId, String territory, WorkloadType workloadType) {
        List<User> allCandidates = userRepository.findByTenantIdAndIsActiveTrueAndArchivedFalse(tenantId).stream()
                .filter(user -> user.getRole() == UserRole.SALES_REP || user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN)
                .toList();

        List<User> candidates = allCandidates;
        if (territory != null) {
            List<User> territoryMatched = allCandidates.stream()
                    .filter(user -> territoriesAlign(user.getTerritory(), territory))
                    .toList();
            if (!territoryMatched.isEmpty()) {
                candidates = territoryMatched;
            }
        }

        return candidates.stream()
                .sorted(Comparator
                        .comparingInt((User user) -> roleRank(user.getRole()))
                        .thenComparingLong(user -> workloadCount(tenantId, user.getId(), workloadType))
                        .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .findFirst()
                .map(user -> new TerritorySuggestion(user.getId(), user.getFullName(), user.getTerritory()))
                .orElse(null);
    }

    private long workloadCount(UUID tenantId, UUID userId, WorkloadType workloadType) {
        return switch (workloadType) {
            case LEAD -> leadRepository.countByTenantIdAndOwnerIdAndArchivedFalseAndStatusNotIn(tenantId, userId, CLOSED_LEAD_STATUSES);
            case COMPANY -> companyRepository.countByTenantIdAndOwnerIdAndArchivedFalse(tenantId, userId);
            case DEAL -> dealRepository.countByTenantIdAndOwnerIdAndArchivedFalseAndStageNotIn(
                    tenantId,
                    userId,
                    Set.of(DealStage.CLOSED_WON, DealStage.CLOSED_LOST)
            );
        };
    }

    private int roleRank(UserRole role) {
        return switch (role) {
            case SALES_REP -> 0;
            case MANAGER -> 1;
            case ADMIN -> 2;
            default -> 3;
        };
    }

    private boolean hasLeadTerritoryMismatch(Lead lead) {
        return territoriesMismatch(lead.getTerritory(), lead.getOwner() != null ? lead.getOwner().getTerritory() : null);
    }

    private boolean hasCompanyTerritoryMismatch(Company company) {
        return territoriesMismatch(company.getTerritory(), company.getOwner() != null ? company.getOwner().getTerritory() : null);
    }

    private boolean hasDealTerritoryMismatch(Deal deal) {
        return territoriesMismatch(deal.getTerritory(), deal.getOwner() != null ? deal.getOwner().getTerritory() : null);
    }

    private boolean territoriesMismatch(String expectedTerritory, String actualTerritory) {
        String normalizedExpected = normalizeOptionalTerritory(expectedTerritory);
        String normalizedActual = normalizeOptionalTerritory(actualTerritory);
        return normalizedExpected != null && normalizedActual != null && !normalizedExpected.equalsIgnoreCase(normalizedActual);
    }

    private boolean territoriesAlign(String expectedTerritory, String actualTerritory) {
        String normalizedExpected = normalizeOptionalTerritory(expectedTerritory);
        String normalizedActual = normalizeOptionalTerritory(actualTerritory);
        return normalizedExpected != null && normalizedActual != null && normalizedExpected.equalsIgnoreCase(normalizedActual);
    }

    private String normalizeOptionalTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }

    private List<TerritoryEscalationItemDTO> buildTerritoryEscalations(
            UUID tenantId,
            List<TerritoryExceptionItemDTO> exceptions,
            WorkflowRule territoryEscalationWorkflow
    ) {
        Map<String, Task> openAlertTasksByTitle = openTaskByTitle(tenantId, TERRITORY_COVERAGE_ALERT_TASK_TYPE);
        Map<String, List<TerritoryExceptionItemDTO>> grouped = exceptions.stream()
                .collect(Collectors.groupingBy(this::territoryEscalationKey, LinkedHashMap::new, Collectors.toList()));

        return grouped.values().stream()
                .map(items -> {
                    TerritoryExceptionItemDTO sample = items.get(0);
                    long totalExceptions = items.size();
                    long leadExceptions = items.stream().filter(item -> "LEAD".equals(item.getEntityType())).count();
                    long companyExceptions = items.stream().filter(item -> "COMPANY".equals(item.getEntityType())).count();
                    long dealExceptions = items.stream().filter(item -> "DEAL".equals(item.getEntityType())).count();
                    long highSeverityCount = items.stream().filter(item -> "HIGH".equals(item.getSeverity())).count();
                    long repeatedMismatchCount = items.stream().filter(item -> Boolean.TRUE.equals(item.getOpenTaskExists())).count();
                    BigDecimal pipelineExposure = sum(items.stream().map(TerritoryExceptionItemDTO::getImpactValue).toList());
                    long oldestMismatchAgeDays = items.stream()
                            .map(TerritoryExceptionItemDTO::getAgeDays)
                            .filter(Objects::nonNull)
                            .max(Long::compareTo)
                            .orElse(0L);
                    String escalationLevel = determineEscalationLevel(
                            totalExceptions,
                            highSeverityCount,
                            repeatedMismatchCount,
                            dealExceptions,
                            pipelineExposure,
                            territoryEscalationWorkflow
                    );
                    Task openAlertTask = openAlertTasksByTitle.get(buildTerritoryEscalationTitle(sample.getTerritory()));
                    boolean openAlertExists = openAlertTask != null;

                    return TerritoryEscalationItemDTO.builder()
                            .territory(sample.getTerritory())
                            .suggestedOwnerId(sample.getSuggestedOwnerId())
                            .suggestedOwnerName(sample.getSuggestedOwnerName())
                            .suggestedOwnerTerritory(sample.getSuggestedOwnerTerritory())
                            .totalExceptions(totalExceptions)
                            .leadExceptions(leadExceptions)
                            .companyExceptions(companyExceptions)
                            .dealExceptions(dealExceptions)
                            .highSeverityCount(highSeverityCount)
                            .repeatedMismatchCount(repeatedMismatchCount)
                            .pipelineExposure(pipelineExposure)
                            .escalationLevel(escalationLevel)
                            .oldestMismatchAgeDays(oldestMismatchAgeDays)
                            .slaBreached(isEscalationSlaBreached(escalationLevel, oldestMismatchAgeDays, territoryEscalationWorkflow))
                            .openAlertExists(openAlertExists)
                            .openTaskId(openAlertTask != null ? openAlertTask.getId() : null)
                            .openTaskStatus(openAlertTask != null && openAlertTask.getStatus() != null ? openAlertTask.getStatus().name() : null)
                            .build();
                })
                .filter(item -> Boolean.TRUE.equals(territoryEscalationWorkflow.getIncludeWatchEscalations())
                        || !"WATCH".equals(item.getEscalationLevel()))
                .sorted(Comparator
                        .comparingInt((TerritoryEscalationItemDTO item) -> escalationRank(item.getEscalationLevel()))
                        .thenComparing(TerritoryEscalationItemDTO::getPipelineExposure, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(TerritoryEscalationItemDTO::getTotalExceptions, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(item -> normalizeTerritory(item.getTerritory()), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private String territoryEscalationKey(TerritoryExceptionItemDTO item) {
        return normalizeTerritory(item.getTerritory()) + "|" + (item.getSuggestedOwnerId() != null ? item.getSuggestedOwnerId() : "unassigned");
    }

    private String determineEscalationLevel(
            long totalExceptions,
            long highSeverityCount,
            long repeatedMismatchCount,
            long dealExceptions,
            BigDecimal pipelineExposure,
            WorkflowRule territoryEscalationWorkflow
    ) {
        BigDecimal exposure = pipelineExposure != null ? pipelineExposure : BigDecimal.ZERO;
        if (highSeverityCount >= territoryEscalationWorkflow.getCriticalHighSeverityThreshold()
                || repeatedMismatchCount >= territoryEscalationWorkflow.getCriticalRepeatedMismatchThreshold()
                || dealExceptions >= territoryEscalationWorkflow.getCriticalDealExceptionThreshold()
                || exposure.compareTo(territoryEscalationWorkflow.getCriticalPipelineExposureThreshold()) >= 0) {
            return "CRITICAL";
        }
        if (totalExceptions >= territoryEscalationWorkflow.getHighTotalExceptionThreshold()
                || highSeverityCount >= territoryEscalationWorkflow.getHighHighSeverityThreshold()
                || repeatedMismatchCount >= territoryEscalationWorkflow.getHighRepeatedMismatchThreshold()
                || exposure.compareTo(territoryEscalationWorkflow.getHighPipelineExposureThreshold()) >= 0) {
            return "HIGH";
        }
        return "WATCH";
    }

    private int escalationRank(String escalationLevel) {
        return switch (escalationLevel) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            default -> 2;
        };
    }

    private boolean isEscalationSlaBreached(String escalationLevel, long oldestMismatchAgeDays, WorkflowRule territoryEscalationWorkflow) {
        return switch (escalationLevel) {
            case "CRITICAL" -> oldestMismatchAgeDays >= territoryEscalationWorkflow.getCriticalEscalationSlaDays();
            case "HIGH" -> oldestMismatchAgeDays >= territoryEscalationWorkflow.getHighEscalationSlaDays();
            default -> oldestMismatchAgeDays >= territoryEscalationWorkflow.getWatchEscalationSlaDays();
        };
    }

    private int resolveTerritoryEscalationTaskDueDays(String escalationLevel, WorkflowRule territoryEscalationWorkflow) {
        return switch (escalationLevel) {
            case "CRITICAL" -> territoryEscalationWorkflow.getCriticalEscalationTaskDueDays();
            case "HIGH" -> territoryEscalationWorkflow.getHighEscalationTaskDueDays();
            default -> territoryEscalationWorkflow.getWatchEscalationTaskDueDays();
        };
    }

    private TaskPriority resolveTerritoryEscalationTaskPriority(String escalationLevel, WorkflowRule territoryEscalationWorkflow) {
        return switch (escalationLevel) {
            case "CRITICAL" -> territoryEscalationWorkflow.getCriticalEscalationTaskPriority();
            case "HIGH" -> territoryEscalationWorkflow.getHighEscalationTaskPriority();
            default -> territoryEscalationWorkflow.getWatchEscalationTaskPriority();
        };
    }

    private List<GovernanceInboxItemDTO> buildGovernanceInboxItems(
            List<QuotaRiskAlertItemDTO> quotaRiskAlerts,
            List<TerritoryEscalationItemDTO> territoryEscalations
    ) {
        List<GovernanceInboxItemDTO> items = new ArrayList<>();

        territoryEscalations.stream()
                .map(item -> GovernanceInboxItemDTO.builder()
                        .itemType("TERRITORY_ESCALATION")
                        .title(normalizeTerritory(item.getTerritory()))
                        .severity(item.getEscalationLevel())
                        .territory(item.getTerritory())
                        .ownerName(item.getSuggestedOwnerName())
                        .ageDays(item.getOldestMismatchAgeDays())
                        .slaBreached(item.getSlaBreached())
                        .openTaskExists(item.getOpenAlertExists())
                        .openTaskId(item.getOpenTaskId())
                        .openTaskStatus(item.getOpenTaskStatus())
                        .summary(item.getTotalExceptions() + " exception(s), "
                                + item.getHighSeverityCount() + " high severity, exposure "
                                + item.getPipelineExposure())
                        .build())
                .forEach(items::add);

        quotaRiskAlerts.stream()
                .map(item -> GovernanceInboxItemDTO.builder()
                        .itemType("QUOTA_RISK")
                        .title(item.getName())
                        .severity(item.getPacingStatus())
                        .territory(item.getTerritory())
                        .ownerName(item.getName())
                        .ageDays(0L)
                        .slaBreached("AT_RISK".equals(item.getPacingStatus()) && Boolean.FALSE.equals(item.getOpenTaskExists()))
                        .openTaskExists(item.getOpenTaskExists())
                        .openTaskId(item.getOpenTaskId())
                        .openTaskStatus(item.getOpenTaskStatus())
                        .summary("Projected attainment " + item.getProjectedAttainmentPercent()
                                + "%, coverage " + item.getPipelineCoverageRatio() + "x")
                        .build())
                .forEach(items::add);

        return items.stream()
                .sorted(Comparator
                        .comparing((GovernanceInboxItemDTO item) -> Boolean.TRUE.equals(item.getSlaBreached()) ? 0 : 1)
                        .thenComparingInt(item -> governanceSeverityRank(item.getSeverity()))
                        .thenComparing(GovernanceInboxItemDTO::getAgeDays, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(GovernanceInboxItemDTO::getTitle, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .limit(12)
                .toList();
    }

    private int governanceSeverityRank(String severity) {
        return switch (severity) {
            case "CRITICAL", "AT_RISK" -> 0;
            case "HIGH", "WATCH" -> 1;
            default -> 2;
        };
    }

    private String buildGovernanceDigestDescription(GovernanceInboxSummaryDTO inbox) {
        StringBuilder description = new StringBuilder("Daily governance digest.");
        description.append(" Total items: ").append(inbox.getTotalItems()).append(".");
        description.append(" Territory escalations: ").append(inbox.getTerritoryEscalationItems()).append(".");
        description.append(" Quota risk alerts: ").append(inbox.getQuotaRiskItems()).append(".");
        description.append(" SLA breached: ").append(inbox.getSlaBreachedItems()).append(".");
        description.append(" Open actions without a task: ").append(inbox.getOpenActionItems()).append(".");
        description.append(" Governance review SLA: ")
                .append(inbox.getReviewSlaStatus() != null ? inbox.getReviewSlaStatus() : "ON_TRACK")
                .append(".");
        if (inbox.getOverdueReviewTaskCount() != null && inbox.getOverdueReviewTaskCount() > 0) {
            description.append(" Overdue reviews: ").append(inbox.getOverdueReviewTaskCount()).append(".");
            description.append(" Watch: ").append(inbox.getWatchReviewCount()).append(",");
            description.append(" high: ").append(inbox.getHighReviewCount()).append(",");
            description.append(" critical: ").append(inbox.getCriticalReviewCount()).append(".");
            if (inbox.getOldestOverdueReviewDays() != null) {
                description.append(" Oldest overdue review age: ")
                        .append(inbox.getOldestOverdueReviewDays())
                        .append(" day")
                        .append(inbox.getOldestOverdueReviewDays() == 1 ? "." : "s.");
            }
        }

        if (inbox.getItems() != null && !inbox.getItems().isEmpty()) {
            description.append(" Top items: ");
            description.append(inbox.getItems().stream()
                    .limit(3)
                    .map(item -> item.getItemType() + " " + item.getTitle() + " [" + item.getSeverity() + "]")
                    .collect(Collectors.joining("; ")));
            description.append(".");
        }

        return description.toString();
    }

    private List<Task> findGovernanceDigestTasks(UUID tenantId) {
        return taskRepository.findByTenantIdAndRelatedEntityTypeAndArchivedFalse(tenantId, GOVERNANCE_DIGEST_TASK_TYPE).stream()
                .sorted(Comparator.comparing(Task::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Task::getTitle, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    private List<Task> findOpenGovernanceReviewTasks(UUID tenantId) {
        return GOVERNANCE_REVIEW_TASK_TYPES.stream()
                .flatMap(relatedEntityType -> taskRepository.findByTenantIdAndRelatedEntityTypeAndArchivedFalse(tenantId, relatedEntityType).stream())
                .filter(task -> OPEN_TASK_STATUSES.contains(task.getStatus()))
                .toList();
    }

    private GovernanceDigestHistoryItemDTO toGovernanceDigestHistoryItem(Task task) {
        return GovernanceDigestHistoryItemDTO.builder()
                .taskId(task.getId())
                .title(task.getTitle())
                .status(task.getStatus() != null ? task.getStatus().name() : null)
                .priority(task.getPriority() != null ? task.getPriority().name() : null)
                .assignedToName(task.getAssigneeName())
                .dueDate(task.getDueDate())
                .createdAt(task.getCreatedAt())
                .build();
    }

    private boolean shouldPrioritizeGovernanceDigest(GovernanceInboxSummaryDTO inbox, WorkflowRule governanceOpsWorkflow) {
        if (!Boolean.TRUE.equals(governanceOpsWorkflow.getElevateDigestForSlaBreaches())) {
            return false;
        }
        return (inbox.getSlaBreachedItems() != null && inbox.getSlaBreachedItems() > 0)
                || (inbox.getCriticalReviewCount() != null && inbox.getCriticalReviewCount() > 0)
                || "CRITICAL".equals(inbox.getReviewSlaStatus())
                || "HIGH".equals(inbox.getReviewSlaStatus());
    }

    private boolean isGovernanceDigestDue(
            List<GovernanceInboxItemDTO> items,
            boolean digestCreatedToday,
            Long daysSinceLastDigest,
            WorkflowRule governanceOpsWorkflow
    ) {
        if (!Boolean.TRUE.equals(governanceOpsWorkflow.getIsActive()) || items == null || items.isEmpty()) {
            return false;
        }
        if (digestCreatedToday) {
            return false;
        }
        if (daysSinceLastDigest == null) {
            return true;
        }
        return daysSinceLastDigest >= governanceOpsWorkflow.getDigestCadenceDays();
    }

    private TaskPriority resolveGovernanceDigestPriority(GovernanceInboxSummaryDTO inbox, WorkflowRule governanceOpsWorkflow) {
        if (shouldPrioritizeGovernanceDigest(inbox, governanceOpsWorkflow)) {
            return TaskPriority.HIGH;
        }
        return governanceOpsWorkflow.getDigestTaskPriority();
    }

    private long governanceReviewOverdueDays(Task task) {
        if (task == null || task.getDueDate() == null) {
            return 0L;
        }
        return Math.max(0L, ChronoUnit.DAYS.between(task.getDueDate(), LocalDate.now()));
    }

    private String determineGovernanceReviewSeverity(Task task, WorkflowRule governanceOpsWorkflow) {
        long overdueDays = governanceReviewOverdueDays(task);
        if (overdueDays >= governanceOpsWorkflow.getCriticalReviewDays()) {
            return "CRITICAL";
        }
        if (overdueDays >= governanceOpsWorkflow.getHighReviewDays()) {
            return "HIGH";
        }
        return overdueDays >= governanceOpsWorkflow.getWatchReviewDays() ? "WATCH" : "ON_TRACK";
    }

    private String determineGovernanceReviewStatus(long criticalReviewCount, long highReviewCount, long watchReviewCount) {
        if (criticalReviewCount > 0) {
            return "CRITICAL";
        }
        if (highReviewCount > 0) {
            return "HIGH";
        }
        if (watchReviewCount > 0) {
            return "WATCH";
        }
        return "ON_TRACK";
    }

    private String buildOverdueGovernanceReviewDescription(List<Task> overdueTasks, String reviewSlaStatus, WorkflowRule governanceOpsWorkflow) {
        long watchCount = overdueTasks.stream()
                .filter(task -> "WATCH".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow)))
                .count();
        long highCount = overdueTasks.stream()
                .filter(task -> "HIGH".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow)))
                .count();
        long criticalCount = overdueTasks.stream()
                .filter(task -> "CRITICAL".equals(determineGovernanceReviewSeverity(task, governanceOpsWorkflow)))
                .count();
        Long oldestOverdueDays = overdueTasks.stream()
                .map(this::governanceReviewOverdueDays)
                .max(Long::compareTo)
                .orElse(0L);
        String summary = overdueTasks.stream()
                .limit(5)
                .map(task -> task.getTitle()
                        + " ["
                        + task.getRelatedEntityType()
                        + "] due "
                        + task.getDueDate()
                        + " ("
                        + determineGovernanceReviewSeverity(task, governanceOpsWorkflow)
                        + ", "
                        + governanceReviewOverdueDays(task)
                        + " day"
                        + (governanceReviewOverdueDays(task) == 1 ? "" : "s")
                        + " overdue)")
                .collect(Collectors.joining("; "));

        return "Review overdue governance items. Count: " + overdueTasks.size()
                + ". Review SLA status: " + reviewSlaStatus
                + ". Watch: " + watchCount
                + ", high: " + highCount
                + ", critical: " + criticalCount
                + ". Thresholds: watch " + governanceOpsWorkflow.getWatchReviewDays()
                + "d, high " + governanceOpsWorkflow.getHighReviewDays()
                + "d, critical " + governanceOpsWorkflow.getCriticalReviewDays() + "d"
                + ". Oldest overdue review age: " + oldestOverdueDays + " day" + (Objects.equals(oldestOverdueDays, 1L) ? "" : "s")
                + ". Top overdue items: " + summary + ".";
    }

    private int completeOpenReviewTasks(UUID tenantId, String relatedEntityType, UUID relatedEntityId) {
        List<Task> tasks = taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
                tenantId,
                relatedEntityType,
                relatedEntityId
        ).stream()
                .filter(task -> OPEN_TASK_STATUSES.contains(task.getStatus()))
                .toList();
        if (tasks.isEmpty()) {
            return 0;
        }

        tasks.forEach(task -> task.setStatus(TaskStatus.COMPLETED));
        taskRepository.saveAll(tasks);
        return tasks.size();
    }

    private void recordAutomationRun(
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
        automationRunService.recordRun(
                tenantId,
                automationKey,
                automationName,
                triggerSource,
                runStatus,
                reviewedCount,
                actionCount,
                alreadyCoveredCount,
                summary
        );
    }

    private long entityAgeDays(com.crm.entity.AbstractEntity entity) {
        if (entity == null) {
            return 0L;
        }
        LocalDate referenceDate = entity.getUpdatedAt() != null
                ? entity.getUpdatedAt().toLocalDate()
                : entity.getCreatedAt() != null ? entity.getCreatedAt().toLocalDate() : LocalDate.now();
        return Math.max(0L, ChronoUnit.DAYS.between(referenceDate, LocalDate.now()));
    }

    private String leadSeverity(Lead lead) {
        if (lead.getScore() != null && lead.getScore() >= 80) {
            return "HIGH";
        }
        if (lead.getEstimatedValue() != null && lead.getEstimatedValue().compareTo(BigDecimal.valueOf(25000)) >= 0) {
            return "HIGH";
        }
        return "MEDIUM";
    }

    private String companySeverity(Company company) {
        long activeDeals = company.getDeals() == null ? 0 : company.getDeals().stream().filter(this::isActiveDeal).count();
        return activeDeals > 0 || (company.getChildCompanies() != null && !company.getChildCompanies().isEmpty()) ? "HIGH" : "MEDIUM";
    }

    private String dealSeverity(Deal deal) {
        if (deal.getValue() != null && deal.getValue().compareTo(BigDecimal.valueOf(50000)) >= 0) {
            return "HIGH";
        }
        return "MEDIUM";
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "HIGH" -> 0;
            case "MEDIUM" -> 1;
            default -> 2;
        };
    }

    private record TerritorySuggestion(UUID userId, String userName, String territory) {}

    private enum WorkloadType {
        LEAD,
        COMPANY,
        DEAL
    }

    private QuarterProgress calculateQuarterProgress() {
        LocalDate today = LocalDate.now();
        int quarterStartMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
        LocalDate quarterStart = LocalDate.of(today.getYear(), quarterStartMonth, 1);
        LocalDate quarterEnd = quarterStart.plusMonths(3).minusDays(1);
        long totalDays = ChronoUnit.DAYS.between(quarterStart, quarterEnd) + 1;
        long elapsedDays = ChronoUnit.DAYS.between(quarterStart, today) + 1;
        double percent = totalDays <= 0
                ? 100.0
                : BigDecimal.valueOf((elapsedDays * 100.0) / totalDays)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
        return new QuarterProgress(percent);
    }

    private String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? "Unassigned" : territory.trim();
    }

    private boolean isUnassigned(String territory) {
        return "Unassigned".equalsIgnoreCase(normalizeTerritory(territory));
    }

    private record QuarterProgress(double percent) {}
}
