package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.SupportCaseFilterDTO;
import com.crm.dto.request.SupportCaseRequestDTO;
import com.crm.dto.response.SupportCaseAssignmentAutomationResultDTO;
import com.crm.dto.response.SupportCaseAssignmentQueueItemDTO;
import com.crm.dto.response.SupportCaseAssignmentQueueSummaryDTO;
import com.crm.dto.response.SupportCaseOperationsDashboardDTO;
import com.crm.dto.response.SupportCaseOwnerWorkloadDTO;
import com.crm.dto.response.SupportCaseQueueDashboardItemDTO;
import com.crm.dto.response.SupportCaseResponseDTO;
import com.crm.dto.response.SupportCaseSlaAutomationResultDTO;
import com.crm.dto.response.SupportCaseStatsDTO;
import com.crm.dto.response.SupportCaseTierDashboardItemDTO;
import com.crm.dto.response.SupportCaseTypeDashboardItemDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.SupportCase;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseCustomerTier;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseSlaStatus;
import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCaseType;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.entity.enums.UserRole;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.SupportCaseMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.SupportCaseRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import com.crm.security.RecordAccessService;
import com.crm.service.AutomationExecutionService;
import com.crm.service.AutomationExecutionTargets;
import com.crm.service.AutomationRunService;
import com.crm.service.SupportCaseService;
import com.crm.service.WorkflowRuleService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupportCaseServiceImpl implements SupportCaseService {

    private static final String RESPONSE_BREACH_TASK_TYPE = "case_response_sla";
    private static final String RESOLUTION_BREACH_TASK_TYPE = "case_resolution_sla";
    private static final String ESCALATION_TASK_TYPE = "case_sla_escalation";
    private static final String ASSIGNMENT_TASK_TYPE = "case_assignment";
    private static final String RESPONSE_BREACH_TASK_PREFIX = "Response SLA breach: ";
    private static final String RESOLUTION_BREACH_TASK_PREFIX = "Resolution SLA breach: ";
    private static final String ESCALATION_TASK_PREFIX = "Escalated support case: ";
    private static final String ASSIGNMENT_TASK_PREFIX = "New support case assignment: ";
    private static final Collection<TaskStatus> OPEN_TASK_STATUSES = List.of(TaskStatus.TODO, TaskStatus.IN_PROGRESS);
    private static final List<SupportCaseStatus> ACTIVE_CASE_STATUSES = List.of(
            SupportCaseStatus.OPEN,
            SupportCaseStatus.IN_PROGRESS,
            SupportCaseStatus.WAITING_ON_CUSTOMER,
            SupportCaseStatus.ESCALATED
    );
    private static final List<UserRole> CASE_ASSIGNMENT_ROLES = List.of(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP);

    private final SupportCaseRepository supportCaseRepository;
    private final SupportCaseMapper supportCaseMapper;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final WorkflowRuleService workflowRuleService;
    private final AutomationRunService automationRunService;
    private final RecordAccessService recordAccessService;
    private final AutomationExecutionService automationExecutionService;

    @Override
    @Transactional(readOnly = true)
    public Page<SupportCaseResponseDTO> findAll(Pageable pageable, SupportCaseFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();

        List<Specification<SupportCase>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<SupportCase> accessScope = recordAccessService.supportCaseReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }

        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase().trim() + "%";
                specs.add((root, query, cb) -> cb.or(
                        cb.like(cb.lower(root.get("title")), search),
                        cb.like(cb.lower(root.get("caseNumber")), search),
                        cb.like(cb.lower(root.get("description")), search)
                ));
            }

            specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            specs.add(SpecificationBuilder.equal("priority", filter.getPriority()));
            specs.add(SpecificationBuilder.equal("source", filter.getSource()));
            specs.add(SpecificationBuilder.equal("caseType", filter.getCaseType()));
            specs.add(SpecificationBuilder.equal("supportQueue", filter.getSupportQueue()));
        }

        Specification<SupportCase> spec = SpecificationBuilder.combineWithAnd(specs);
        return supportCaseRepository.findAll(spec, pageable).map(supportCaseMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public SupportCaseResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        SupportCase supportCase = supportCaseRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Support case", id));
        recordAccessService.assertCanViewSupportCase(supportCase);
        return supportCaseMapper.toDto(supportCase);
    }

    @Override
    @Transactional
    public SupportCaseResponseDTO create(SupportCaseRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        validateRequest(request, tenantId);
        var caseSlaWorkflow = workflowRuleService.resolveCaseSlaWorkflow(tenantId);

        SupportCase supportCase = supportCaseMapper.toEntity(request);
        supportCase.setTenantId(tenantId);
        supportCase.setArchived(false);
        supportCase.setCaseNumber(generateCaseNumber());
        supportCase.setOwnerId(recordAccessService.resolveAssignableOwnerId(supportCase.getOwnerId()));
        applyCaseSpecialization(supportCase);
        applyDefaultSlaTargets(supportCase, caseSlaWorkflow);
        supportCase.setFirstRespondedAt(resolveFirstRespondedAt(request.getStatus(), null));
        supportCase.setResolvedAt(resolveResolvedAt(request.getStatus(), null));
        supportCase = supportCaseRepository.save(supportCase);
        var automationOutcome = automationExecutionService.executeRealTimeRules(
                tenantId,
                AutomationEventType.CASE_CREATED,
                AutomationExecutionTargets.builder().supportCase(supportCase).build()
        );
        if (automationOutcome.isMutatedTarget()) {
            supportCase = supportCaseRepository.save(supportCase);
        }

        log.info("Created support case {} for tenant {}", supportCase.getId(), tenantId);
        return supportCaseMapper.toDto(supportCase);
    }

    @Override
    @Transactional
    public SupportCaseResponseDTO update(UUID id, SupportCaseRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        validateRequest(request, tenantId);
        var caseSlaWorkflow = workflowRuleService.resolveCaseSlaWorkflow(tenantId);

        SupportCase supportCase = supportCaseRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Support case", id));
        recordAccessService.assertCanWriteSupportCase(supportCase);

        supportCaseMapper.updateEntity(request, supportCase);
        supportCase.setOwnerId(recordAccessService.resolveAssignableOwnerId(supportCase.getOwnerId()));
        applyCaseSpecialization(supportCase);
        applyDefaultSlaTargets(supportCase, caseSlaWorkflow);
        supportCase.setFirstRespondedAt(resolveFirstRespondedAt(request.getStatus(), supportCase.getFirstRespondedAt()));
        supportCase.setResolvedAt(resolveResolvedAt(request.getStatus(), supportCase.getResolvedAt()));
        supportCase = supportCaseRepository.save(supportCase);

        log.info("Updated support case {} for tenant {}", id, tenantId);
        return supportCaseMapper.toDto(supportCase);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        SupportCase supportCase = supportCaseRepository.findById(id)
                .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Support case", id));
        recordAccessService.assertCanWriteSupportCase(supportCase);

        supportCase.setArchived(true);
        supportCaseRepository.save(supportCase);
        log.info("Archived support case {} for tenant {}", id, tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public SupportCaseStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        List<SupportCase> cases = supportCaseRepository.findByTenantIdAndArchivedFalse(tenantId);
        cases = cases.stream()
                .filter(recordAccessService::canViewSupportCase)
                .toList();
        List<User> activeOwners = getCandidateOwners(tenantId);
        WorkflowRule caseAssignmentWorkflow = workflowRuleService.resolveCaseAssignmentWorkflow(tenantId);

        Map<SupportCaseStatus, Long> casesByStatus = new EnumMap<>(SupportCaseStatus.class);
        for (SupportCaseStatus status : SupportCaseStatus.values()) {
            casesByStatus.put(status, 0L);
        }
        cases.forEach(item -> casesByStatus.computeIfPresent(item.getStatus(), (key, count) -> count + 1));

        Map<SupportCasePriority, Long> casesByPriority = new EnumMap<>(SupportCasePriority.class);
        for (SupportCasePriority priority : SupportCasePriority.values()) {
            casesByPriority.put(priority, 0L);
        }
        cases.forEach(item -> casesByPriority.computeIfPresent(item.getPriority(), (key, count) -> count + 1));

        Map<SupportCaseCustomerTier, Long> casesByCustomerTier = new EnumMap<>(SupportCaseCustomerTier.class);
        for (SupportCaseCustomerTier customerTier : SupportCaseCustomerTier.values()) {
            casesByCustomerTier.put(customerTier, 0L);
        }
        cases.forEach(item -> casesByCustomerTier.computeIfPresent(
                item.getCustomerTier() != null ? item.getCustomerTier() : SupportCaseCustomerTier.STANDARD,
                (key, count) -> count + 1
        ));

        Map<SupportCaseType, Long> casesByType = new EnumMap<>(SupportCaseType.class);
        for (SupportCaseType type : SupportCaseType.values()) {
            casesByType.put(type, 0L);
        }
        cases.forEach(item -> casesByType.computeIfPresent(item.getCaseType(), (key, count) -> count + 1));

        Map<SupportCaseQueue, Long> casesByQueue = new EnumMap<>(SupportCaseQueue.class);
        Map<SupportCaseQueue, Long> openCasesByQueue = new EnumMap<>(SupportCaseQueue.class);
        for (SupportCaseQueue queue : SupportCaseQueue.values()) {
            casesByQueue.put(queue, 0L);
            openCasesByQueue.put(queue, 0L);
        }
        cases.forEach(item -> {
            casesByQueue.computeIfPresent(item.getSupportQueue(), (key, count) -> count + 1);
            if (ACTIVE_CASE_STATUSES.contains(item.getStatus())) {
                openCasesByQueue.computeIfPresent(item.getSupportQueue(), (key, count) -> count + 1);
            }
        });

        long openCases = cases.stream()
                .filter(item -> item.getStatus() != SupportCaseStatus.RESOLVED && item.getStatus() != SupportCaseStatus.CLOSED)
                .count();
        long activeCases = cases.stream()
                .filter(this::isActiveCase)
                .count();
        long unassignedActiveCases = cases.stream()
                .filter(item -> isActiveCase(item) && item.getOwnerId() == null)
                .count();
        long escalatedCases = cases.stream()
                .filter(item -> item.getStatus() == SupportCaseStatus.ESCALATED)
                .count();
        long breachedCases = cases.stream()
                .filter(this::hasBreachedSla)
                .count();
        long watchCases = cases.stream()
                .filter(this::hasWatchSla)
                .count();
        long overdueResponseCases = cases.stream()
                .filter(item -> Boolean.TRUE.equals(item.getOverdueResponse()))
                .count();
        long overdueResolutionCases = cases.stream()
                .filter(item -> Boolean.TRUE.equals(item.getOverdueResolution()))
                .count();
        long responseWatchCases = cases.stream()
                .filter(item -> item.getResponseSlaStatus() == SupportCaseSlaStatus.WATCH)
                .count();
          long resolutionWatchCases = cases.stream()
                  .filter(item -> item.getResolutionSlaStatus() == SupportCaseSlaStatus.WATCH)
                  .count();
        long strategicCases = cases.stream()
                .filter(item -> item.getCustomerTier() == SupportCaseCustomerTier.STRATEGIC)
                .count();
        long premiumCases = cases.stream()
                .filter(item -> item.getCustomerTier() == SupportCaseCustomerTier.PREMIUM)
                .count();
        long highTouchActiveCases = cases.stream()
                .filter(this::isActiveCase)
                .filter(this::isHighTouchCase)
                .count();
        long aged24hActiveCases = cases.stream()
                .filter(this::isActiveCase)
                .filter(item -> ageInHours(item) >= 24)
                .count();
        long aged72hActiveCases = cases.stream()
                .filter(this::isActiveCase)
                .filter(item -> ageInHours(item) >= 72)
                .count();
        long aged168hActiveCases = cases.stream()
                .filter(this::isActiveCase)
                .filter(item -> ageInHours(item) >= 168)
                .count();

        return SupportCaseStatsDTO.builder()
                .totalCases((long) cases.size())
                .openCases(openCases)
                .activeCases(activeCases)
                .unassignedActiveCases(unassignedActiveCases)
                .escalatedCases(escalatedCases)
                .breachedCases(breachedCases)
                .watchCases(watchCases)
                .overdueResponseCases(overdueResponseCases)
                .overdueResolutionCases(overdueResolutionCases)
                .responseWatchCases(responseWatchCases)
                .resolutionWatchCases(resolutionWatchCases)
                .strategicCases(strategicCases)
                .premiumCases(premiumCases)
                .highTouchActiveCases(highTouchActiveCases)
                .aged24hActiveCases(aged24hActiveCases)
                .aged72hActiveCases(aged72hActiveCases)
                .aged168hActiveCases(aged168hActiveCases)
                .casesByStatus(casesByStatus)
                .casesByPriority(casesByPriority)
                .casesByCustomerTier(casesByCustomerTier)
                .casesByType(casesByType)
                .casesByQueue(casesByQueue)
                .openCasesByQueue(openCasesByQueue)
                .queueSummaries(buildQueueSummaries(cases, activeOwners, caseAssignmentWorkflow))
                .caseTypeSummaries(buildCaseTypeSummaries(cases))
                .tierSummaries(buildTierSummaries(cases))
                .ownerWorkloads(buildOwnerWorkloads(activeOwners, cases))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SupportCaseOperationsDashboardDTO getOperationsDashboard() {
        UUID tenantId = TenantContext.getTenantId();
        List<SupportCase> cases = supportCaseRepository.findByTenantIdAndArchivedFalse(tenantId).stream()
                .filter(recordAccessService::canViewSupportCase)
                .toList();
        List<User> activeOwners = getCandidateOwners(tenantId);
        WorkflowRule caseAssignmentWorkflow = workflowRuleService.resolveCaseAssignmentWorkflow(tenantId);

        return SupportCaseOperationsDashboardDTO.builder()
                .totalVisibleCases((long) cases.size())
                .activeCases(cases.stream().filter(this::isActiveCase).count())
                .unassignedActiveCases(cases.stream().filter(item -> isActiveCase(item) && item.getOwnerId() == null).count())
                .escalatedActiveCases(cases.stream().filter(item -> item.getStatus() == SupportCaseStatus.ESCALATED).count())
                .breachedCases(cases.stream().filter(this::hasBreachedSla).count())
                .watchCases(cases.stream().filter(this::hasWatchSla).count())
                .strategicCases(cases.stream().filter(item -> item.getCustomerTier() == SupportCaseCustomerTier.STRATEGIC).count())
                .queueSummaries(buildQueueSummaries(cases, activeOwners, caseAssignmentWorkflow))
                .caseTypeSummaries(buildCaseTypeSummaries(cases))
                .ownerWorkloads(buildOwnerWorkloads(activeOwners, cases))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SupportCaseAssignmentQueueSummaryDTO getAssignmentQueue() {
        UUID tenantId = TenantContext.getTenantId();
        List<SupportCase> cases = supportCaseRepository.findByTenantIdAndArchivedFalse(tenantId);
        cases = cases.stream()
                .filter(recordAccessService::canViewSupportCase)
                .toList();
        List<User> candidateOwners = getCandidateOwners(tenantId);
        WorkflowRule caseAssignmentWorkflow = workflowRuleService.resolveCaseAssignmentWorkflow(tenantId);

        List<SupportCaseAssignmentQueueItemDTO> items = cases.stream()
                .filter(this::shouldIncludeInAssignmentQueue)
                .map(supportCase -> toAssignmentQueueItem(tenantId, supportCase, candidateOwners, caseAssignmentWorkflow))
                .sorted(Comparator
                        .comparing((SupportCaseAssignmentQueueItemDTO item) -> item.getPriority() == SupportCasePriority.URGENT ? 0 : item.getPriority() == SupportCasePriority.HIGH ? 1 : 2)
                        .thenComparing(SupportCaseAssignmentQueueItemDTO::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        int unassignedCases = (int) items.stream().filter(item -> "UNASSIGNED".equals(item.getQueueReason())).count();
        int escalatedCases = (int) items.stream().filter(item -> "ESCALATED".equals(item.getQueueReason())).count();
        int urgentCases = (int) items.stream().filter(item -> item.getPriority() == SupportCasePriority.URGENT).count();
        int breachedCases = (int) items.stream().filter(item ->
                item.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED
                        || item.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED
        ).count();
        Map<SupportCaseQueue, Long> casesByQueue = new EnumMap<>(SupportCaseQueue.class);
        for (SupportCaseQueue queue : SupportCaseQueue.values()) {
            casesByQueue.put(queue, 0L);
        }
        items.forEach(item -> casesByQueue.computeIfPresent(item.getSupportQueue(), (key, count) -> count + 1));

        return SupportCaseAssignmentQueueSummaryDTO.builder()
                .totalItems(items.size())
                .unassignedCases(unassignedCases)
                .escalatedCases(escalatedCases)
                .urgentCases(urgentCases)
                .breachedCases(breachedCases)
                .casesByQueue(casesByQueue)
                .items(items)
                .build();
    }

    @Override
    @Transactional
    public SupportCaseAssignmentAutomationResultDTO runAssignmentAutomation() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule caseAssignmentWorkflow = workflowRuleService.resolveCaseAssignmentWorkflow(tenantId);
        List<SupportCase> cases = supportCaseRepository.findByTenantIdAndArchivedFalse(tenantId);
        cases = cases.stream()
                .filter(recordAccessService::canViewSupportCase)
                .toList();
        List<User> candidateOwners = getCandidateOwners(tenantId);

        if (!Boolean.TRUE.equals(caseAssignmentWorkflow.getIsActive())
                || (!Boolean.TRUE.equals(caseAssignmentWorkflow.getAutoAssignUnassignedCases())
                && !Boolean.TRUE.equals(caseAssignmentWorkflow.getAutoReassignEscalatedCases()))) {
            automationRunService.recordRun(
                    tenantId,
                    "CASE_ASSIGNMENT",
                    "Support Case Assignment Automation",
                    "MANUAL",
                    "SKIPPED",
                    0,
                    0,
                    cases.size(),
                    "Case assignment workflow is inactive or all assignment triggers are disabled."
            );
            return SupportCaseAssignmentAutomationResultDTO.builder()
                    .reviewedCases(0)
                    .assignedCases(0)
                    .assignmentTasksCreated(0)
                    .skippedCases(cases.size())
                    .updatedCaseIds(List.of())
                    .createdTaskIds(List.of())
                    .build();
        }

        List<SupportCase> queueCases = cases.stream()
                .filter(supportCase -> shouldIncludeInAssignmentAutomationQueue(supportCase, caseAssignmentWorkflow))
                .toList();

        int assignedCases = 0;
        int assignmentTasksCreated = 0;
        int skippedCases = 0;
        List<UUID> updatedCaseIds = new ArrayList<>();
        List<UUID> createdTaskIds = new ArrayList<>();

        for (SupportCase supportCase : queueCases) {
            String queueReason = supportCase.getOwnerId() == null ? "UNASSIGNED" : "ESCALATED";
            Optional<User> suggestedOwner = suggestOwner(tenantId, supportCase, candidateOwners, caseAssignmentWorkflow);
            if (suggestedOwner.isEmpty()) {
                skippedCases++;
                continue;
            }

            User owner = suggestedOwner.get();
            boolean updated = false;
            if (!owner.getId().equals(supportCase.getOwnerId())) {
                supportCase.setOwnerId(owner.getId());
                updated = true;
            }
            if (supportCase.getStatus() == SupportCaseStatus.ESCALATED && supportCase.getResponseSlaStatus() != SupportCaseSlaStatus.BREACHED
                    && supportCase.getResolutionSlaStatus() != SupportCaseSlaStatus.BREACHED) {
                supportCase.setStatus(SupportCaseStatus.IN_PROGRESS);
                updated = true;
            }

            if (updated) {
                supportCaseRepository.save(supportCase);
                updatedCaseIds.add(supportCase.getId());
                assignedCases++;
            }

            if (Boolean.TRUE.equals(caseAssignmentWorkflow.getCreateAssignmentTasks())
                    && !taskRepository.existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
                    tenantId,
                    ASSIGNMENT_TASK_TYPE,
                    supportCase.getId(),
                    OPEN_TASK_STATUSES
            )) {
                Task task = Task.builder()
                        .title(ASSIGNMENT_TASK_PREFIX + supportCase.getCaseNumber())
                        .description(buildAssignmentTaskDescription(supportCase, owner, queueReason))
                        .dueDate(LocalDate.now().plusDays(getAssignmentTaskDueDays(supportCase.getPriority(), caseAssignmentWorkflow)))
                        .priority(getAssignmentTaskPriority(supportCase.getPriority(), caseAssignmentWorkflow))
                        .status(TaskStatus.TODO)
                        .assignedTo(owner.getId())
                        .relatedEntityType(ASSIGNMENT_TASK_TYPE)
                        .relatedEntityId(supportCase.getId())
                        .build();
                task.setTenantId(tenantId);
                createdTaskIds.add(taskRepository.save(task).getId());
                assignmentTasksCreated++;
            }
        }

        automationRunService.recordRun(
                tenantId,
                "CASE_ASSIGNMENT",
                "Support Case Assignment Automation",
                "MANUAL",
                "SUCCESS",
                queueCases.size(),
                assignedCases + assignmentTasksCreated,
                skippedCases,
                String.format("Reviewed %d queued support case(s), assigned %d, and created %d assignment task(s).",
                        queueCases.size(), assignedCases, assignmentTasksCreated)
        );

        return SupportCaseAssignmentAutomationResultDTO.builder()
                .reviewedCases(queueCases.size())
                .assignedCases(assignedCases)
                .assignmentTasksCreated(assignmentTasksCreated)
                .skippedCases(skippedCases)
                .updatedCaseIds(updatedCaseIds)
                .createdTaskIds(createdTaskIds)
                .build();
    }

    @Override
    @Transactional
    public SupportCaseSlaAutomationResultDTO runSlaBreachAutomation() {
        UUID tenantId = TenantContext.getTenantId();
        var caseSlaWorkflow = workflowRuleService.resolveCaseSlaWorkflow(tenantId);
        List<SupportCase> cases = supportCaseRepository.findByTenantIdAndArchivedFalse(tenantId);
        cases = cases.stream()
                .filter(recordAccessService::canViewSupportCase)
                .toList();

        int responseTasksCreated = 0;
        int resolutionTasksCreated = 0;
        int escalationTasksCreated = 0;
        int escalatedCases = 0;
        int alreadyCoveredCases = 0;
        List<UUID> createdTaskIds = new ArrayList<>();

        if (!Boolean.TRUE.equals(caseSlaWorkflow.getIsActive())
                || (!Boolean.TRUE.equals(caseSlaWorkflow.getCreateBreachTasks())
                && !Boolean.TRUE.equals(caseSlaWorkflow.getAutoEscalateBreachedCases()))) {
            automationRunService.recordRun(
                    tenantId,
                    "CASE_SLA",
                    "Support Case SLA Automation",
                    "MANUAL",
                    "SKIPPED",
                    cases.size(),
                    0,
                    0,
                    "Case SLA workflow is inactive or all SLA automation actions are disabled."
            );
            return SupportCaseSlaAutomationResultDTO.builder()
                    .reviewedCases(cases.size())
                    .responseTasksCreated(0)
                    .resolutionTasksCreated(0)
                    .escalationTasksCreated(0)
                    .escalatedCases(0)
                    .alreadyCoveredCases(0)
                    .createdTaskIds(List.of())
                    .build();
        }

        for (SupportCase supportCase : cases) {
            boolean coveredCase = false;
            boolean breachedCase = supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED
                    || supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED;

            if (supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED
                    && !taskRepository.existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
                    tenantId,
                    RESPONSE_BREACH_TASK_TYPE,
                    supportCase.getId(),
                    OPEN_TASK_STATUSES
            )) {
                Task task = Task.builder()
                        .title(RESPONSE_BREACH_TASK_PREFIX + supportCase.getCaseNumber())
                        .description(buildResponseBreachTaskDescription(supportCase))
                        .dueDate(LocalDate.now().plusDays(caseSlaWorkflow.getResponseBreachTaskDueDays()))
                        .priority(caseSlaWorkflow.getResponseBreachTaskPriority())
                        .status(TaskStatus.TODO)
                        .assignedTo(supportCase.getOwnerId())
                        .relatedEntityType(RESPONSE_BREACH_TASK_TYPE)
                        .relatedEntityId(supportCase.getId())
                        .build();
                task.setTenantId(tenantId);
                createdTaskIds.add(taskRepository.save(task).getId());
                responseTasksCreated++;
            } else if (supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED) {
                coveredCase = true;
            }

            if (supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED
                    && !taskRepository.existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
                    tenantId,
                    RESOLUTION_BREACH_TASK_TYPE,
                    supportCase.getId(),
                    OPEN_TASK_STATUSES
            )) {
                Task task = Task.builder()
                        .title(RESOLUTION_BREACH_TASK_PREFIX + supportCase.getCaseNumber())
                        .description(buildResolutionBreachTaskDescription(supportCase))
                        .dueDate(LocalDate.now().plusDays(caseSlaWorkflow.getResolutionBreachTaskDueDays()))
                        .priority(caseSlaWorkflow.getResolutionBreachTaskPriority())
                        .status(TaskStatus.TODO)
                        .assignedTo(supportCase.getOwnerId())
                        .relatedEntityType(RESOLUTION_BREACH_TASK_TYPE)
                        .relatedEntityId(supportCase.getId())
                        .build();
                task.setTenantId(tenantId);
                createdTaskIds.add(taskRepository.save(task).getId());
                resolutionTasksCreated++;
            } else if (supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED) {
                coveredCase = true;
            }

            if (coveredCase) {
                alreadyCoveredCases++;
            }

            if (shouldEscalateCase(supportCase, caseSlaWorkflow)) {
                if (supportCase.getStatus() != SupportCaseStatus.ESCALATED) {
                    supportCase.setStatus(SupportCaseStatus.ESCALATED);
                    supportCaseRepository.save(supportCase);
                    escalatedCases++;
                }

                if (!taskRepository.existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
                        tenantId,
                        ESCALATION_TASK_TYPE,
                        supportCase.getId(),
                        OPEN_TASK_STATUSES
                )) {
                    Task task = Task.builder()
                            .title(ESCALATION_TASK_PREFIX + supportCase.getCaseNumber())
                            .description(buildEscalationTaskDescription(supportCase))
                            .dueDate(LocalDate.now().plusDays(caseSlaWorkflow.getEscalationTaskDueDays()))
                            .priority(caseSlaWorkflow.getEscalationTaskPriority())
                            .status(TaskStatus.TODO)
                            .assignedTo(supportCase.getOwnerId())
                            .relatedEntityType(ESCALATION_TASK_TYPE)
                            .relatedEntityId(supportCase.getId())
                            .build();
                    task.setTenantId(tenantId);
                    createdTaskIds.add(taskRepository.save(task).getId());
                    escalationTasksCreated++;
                } else {
                    alreadyCoveredCases++;
                }
            }

            if (breachedCase) {
                var automationOutcome = automationExecutionService.executeRealTimeRules(
                        tenantId,
                        AutomationEventType.CASE_BREACHED,
                        AutomationExecutionTargets.builder().supportCase(supportCase).build()
                );
                if (automationOutcome.isMutatedTarget()) {
                    supportCase = supportCaseRepository.save(supportCase);
                }
                createdTaskIds.addAll(automationOutcome.getCreatedTaskIds());
            }
        }

        automationRunService.recordRun(
                tenantId,
                "CASE_SLA",
                "Support Case SLA Automation",
                "MANUAL",
                "SUCCESS",
                cases.size(),
                responseTasksCreated + resolutionTasksCreated + escalationTasksCreated + escalatedCases,
                alreadyCoveredCases,
                String.format(
                        "Reviewed %d support cases, created %d SLA follow-up task(s), %d escalation task(s), and escalated %d case(s).",
                        cases.size(),
                        responseTasksCreated + resolutionTasksCreated,
                        escalationTasksCreated,
                        escalatedCases
                )
        );

        return SupportCaseSlaAutomationResultDTO.builder()
                .reviewedCases(cases.size())
                .responseTasksCreated(responseTasksCreated)
                .resolutionTasksCreated(resolutionTasksCreated)
                .escalationTasksCreated(escalationTasksCreated)
                .escalatedCases(escalatedCases)
                .alreadyCoveredCases(alreadyCoveredCases)
                .createdTaskIds(createdTaskIds)
                .build();
    }

    private void validateRequest(SupportCaseRequestDTO request, UUID tenantId) {
        if (request.getResponseDueAt() != null && request.getResolutionDueAt() != null
                && request.getResolutionDueAt().isBefore(request.getResponseDueAt())) {
            throw new BadRequestException("Resolution due date cannot be before response due date");
        }

        if (request.getCompanyId() != null) {
            Company company = companyRepository.findById(request.getCompanyId())
                    .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                    .orElseThrow(() -> new BadRequestException("Selected company does not belong to this workspace"));
            if (company.getId() == null) {
                throw new BadRequestException("Selected company is invalid");
            }
        }

        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(item -> item.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(item.getArchived()))
                    .orElseThrow(() -> new BadRequestException("Selected contact does not belong to this workspace"));
            if (request.getCompanyId() != null && contact.getCompanyId() != null && !request.getCompanyId().equals(contact.getCompanyId())) {
                throw new BadRequestException("Selected contact does not belong to the chosen company");
            }
        }

        if (request.getOwnerId() != null) {
            User owner = userRepository.findByIdAndTenantIdAndArchivedFalse(request.getOwnerId(), tenantId)
                    .orElseThrow(() -> new BadRequestException("Selected case owner does not belong to this workspace"));
            if (!Boolean.TRUE.equals(owner.getIsActive())) {
                throw new BadRequestException("Selected case owner is inactive");
            }
        }
    }

    private String generateCaseNumber() {
        return "CASE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private LocalDateTime resolveResolvedAt(SupportCaseStatus status, LocalDateTime existingResolvedAt) {
        if (status == SupportCaseStatus.RESOLVED || status == SupportCaseStatus.CLOSED) {
            return existingResolvedAt != null ? existingResolvedAt : LocalDateTime.now();
        }
        return null;
    }

    private LocalDateTime resolveFirstRespondedAt(SupportCaseStatus status, LocalDateTime existingFirstRespondedAt) {
        if (existingFirstRespondedAt != null) {
            return existingFirstRespondedAt;
        }

        if (status == SupportCaseStatus.OPEN) {
            return null;
        }

        return LocalDateTime.now();
    }

    private void applyDefaultSlaTargets(SupportCase supportCase, com.crm.entity.WorkflowRule caseSlaWorkflow) {
        LocalDateTime baseTime = supportCase.getCreatedAt() != null ? supportCase.getCreatedAt() : LocalDateTime.now();
        if (supportCase.getResponseDueAt() == null && Boolean.TRUE.equals(caseSlaWorkflow.getAutoResponseTargetsEnabled())) {
            supportCase.setResponseDueAt(baseTime.plusHours(getDefaultResponseHours(
                    supportCase.getPriority(),
                    supportCase.getCaseType(),
                    supportCase.getCustomerTier(),
                    caseSlaWorkflow
            )));
        }
        if (supportCase.getResolutionDueAt() == null && Boolean.TRUE.equals(caseSlaWorkflow.getAutoResolutionTargetsEnabled())) {
            supportCase.setResolutionDueAt(baseTime.plusHours(getDefaultResolutionHours(
                    supportCase.getPriority(),
                    supportCase.getCaseType(),
                    supportCase.getCustomerTier(),
                    caseSlaWorkflow
            )));
        }
    }

    private long getDefaultResponseHours(
            SupportCasePriority priority,
            SupportCaseType caseType,
            SupportCaseCustomerTier customerTier,
            com.crm.entity.WorkflowRule caseSlaWorkflow
    ) {
        long baseHours = switch (priority) {
            case URGENT -> caseSlaWorkflow.getUrgentResponseHours();
            case HIGH -> caseSlaWorkflow.getHighResponseHours();
            case MEDIUM -> caseSlaWorkflow.getMediumResponseHours();
            case LOW -> caseSlaWorkflow.getLowResponseHours();
        };
        return applyCaseTypeAdjustment(applyTierMultiplier(baseHours, customerTier, caseSlaWorkflow, true), caseType, true);
    }

    private long getDefaultResolutionHours(
            SupportCasePriority priority,
            SupportCaseType caseType,
            SupportCaseCustomerTier customerTier,
            com.crm.entity.WorkflowRule caseSlaWorkflow
    ) {
        long baseHours = switch (priority) {
            case URGENT -> caseSlaWorkflow.getUrgentResolutionHours();
            case HIGH -> caseSlaWorkflow.getHighResolutionHours();
            case MEDIUM -> caseSlaWorkflow.getMediumResolutionHours();
            case LOW -> caseSlaWorkflow.getLowResolutionHours();
        };
        return applyCaseTypeAdjustment(applyTierMultiplier(baseHours, customerTier, caseSlaWorkflow, false), caseType, false);
    }

    private long applyTierMultiplier(
            long baseHours,
            SupportCaseCustomerTier customerTier,
            WorkflowRule caseSlaWorkflow,
            boolean responseTarget
    ) {
        SupportCaseCustomerTier resolvedTier = customerTier != null ? customerTier : SupportCaseCustomerTier.STANDARD;
        int multiplierPercent = switch (resolvedTier) {
            case STANDARD -> 100;
            case PREMIUM -> responseTarget
                    ? caseSlaWorkflow.getPremiumResponseMultiplierPercent()
                    : caseSlaWorkflow.getPremiumResolutionMultiplierPercent();
            case STRATEGIC -> responseTarget
                    ? caseSlaWorkflow.getStrategicResponseMultiplierPercent()
                    : caseSlaWorkflow.getStrategicResolutionMultiplierPercent();
        };

        return Math.max(1L, Math.round(baseHours * (multiplierPercent / 100.0d)));
    }

    private String buildResponseBreachTaskDescription(SupportCase supportCase) {
        return "Response SLA breached for case " + supportCase.getCaseNumber()
                + "\nTitle: " + supportCase.getTitle()
                + "\nImpact: " + (supportCase.getCustomerImpact() != null ? supportCase.getCustomerImpact() : "Not provided")
                + "\nResponse due: " + supportCase.getResponseDueAt()
                + "\nStatus: " + supportCase.getStatus().name().replace('_', ' ');
    }

    private String buildResolutionBreachTaskDescription(SupportCase supportCase) {
        return "Resolution SLA breached for case " + supportCase.getCaseNumber()
                + "\nTitle: " + supportCase.getTitle()
                + "\nImpact: " + (supportCase.getCustomerImpact() != null ? supportCase.getCustomerImpact() : "Not provided")
                + "\nResolution due: " + supportCase.getResolutionDueAt()
                + "\nStatus: " + supportCase.getStatus().name().replace('_', ' ');
    }

    private boolean shouldEscalateCase(SupportCase supportCase, com.crm.entity.WorkflowRule caseSlaWorkflow) {
        if (!Boolean.TRUE.equals(caseSlaWorkflow.getAutoEscalateBreachedCases())) {
            return false;
        }
        if (supportCase.getStatus() == SupportCaseStatus.RESOLVED || supportCase.getStatus() == SupportCaseStatus.CLOSED) {
            return false;
        }
        boolean responseTrigger = Boolean.TRUE.equals(caseSlaWorkflow.getEscalateOnResponseBreach())
                && supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED;
        boolean resolutionTrigger = Boolean.TRUE.equals(caseSlaWorkflow.getEscalateOnResolutionBreach())
                && supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED;
        return responseTrigger || resolutionTrigger;
    }

    private String buildEscalationTaskDescription(SupportCase supportCase) {
        return "Support case " + supportCase.getCaseNumber() + " has been escalated due to SLA breach."
                + "\nTitle: " + supportCase.getTitle()
                + "\nPriority: " + supportCase.getPriority().name()
                + "\nResponse SLA: " + supportCase.getResponseSlaStatus().name()
                + "\nResolution SLA: " + supportCase.getResolutionSlaStatus().name()
                + "\nCustomer impact: " + (supportCase.getCustomerImpact() != null ? supportCase.getCustomerImpact() : "Not provided");
    }

    private List<SupportCaseQueueDashboardItemDTO> buildQueueSummaries(
            List<SupportCase> cases,
            List<User> activeOwners,
            WorkflowRule workflowRule
    ) {
        List<SupportCaseQueueDashboardItemDTO> items = new ArrayList<>();
        for (SupportCaseQueue queue : SupportCaseQueue.values()) {
            List<SupportCase> queueCases = cases.stream()
                    .filter(item -> item.getSupportQueue() == queue)
                    .toList();
            long staffedOwners = activeOwners.stream()
                    .filter(owner -> isEligibleForQueue(owner, queue, workflowRule))
                    .count();
            long activeCases = queueCases.stream().filter(this::isActiveCase).count();
            long overdueActiveCases = queueCases.stream()
                    .filter(this::isActiveCase)
                    .filter(this::hasBreachedSla)
                    .count();
            long oldestActiveCaseHours = queueCases.stream()
                    .filter(this::isActiveCase)
                    .mapToLong(this::ageInHours)
                    .max()
                    .orElse(0L);
            double avgActiveCasesPerOwner = staffedOwners == 0 ? 0.0d : activeCases / (double) staffedOwners;
            String healthStatus = resolveQueueHealthStatus(queue, avgActiveCasesPerOwner, workflowRule, overdueActiveCases, oldestActiveCaseHours);
            items.add(SupportCaseQueueDashboardItemDTO.builder()
                    .supportQueue(queue)
                    .totalCases((long) queueCases.size())
                    .activeCases(activeCases)
                    .unassignedCases(queueCases.stream().filter(item -> isActiveCase(item) && item.getOwnerId() == null).count())
                    .escalatedCases(queueCases.stream().filter(item -> item.getStatus() == SupportCaseStatus.ESCALATED).count())
                    .breachedCases(queueCases.stream().filter(this::hasBreachedSla).count())
                    .watchCases(queueCases.stream().filter(this::hasWatchSla).count())
                    .urgentCases(queueCases.stream().filter(item -> item.getPriority() == SupportCasePriority.URGENT).count())
                    .highTouchCases(queueCases.stream().filter(this::isHighTouchCase).count())
                    .overdueActiveCases(overdueActiveCases)
                    .staffedOwners(staffedOwners)
                    .oldestActiveCaseHours(oldestActiveCaseHours)
                    .avgActiveCasesPerOwner(avgActiveCasesPerOwner)
                    .healthStatus(healthStatus)
                    .recommendedAction(resolveQueueRecommendedAction(healthStatus, staffedOwners, overdueActiveCases, oldestActiveCaseHours, queue))
                    .build());
        }
        return items;
    }

    private List<SupportCaseTypeDashboardItemDTO> buildCaseTypeSummaries(List<SupportCase> cases) {
        List<SupportCaseTypeDashboardItemDTO> items = new ArrayList<>();
        for (SupportCaseType caseType : SupportCaseType.values()) {
            List<SupportCase> typedCases = cases.stream()
                    .filter(item -> item.getCaseType() == caseType)
                    .toList();
            items.add(SupportCaseTypeDashboardItemDTO.builder()
                    .caseType(caseType)
                    .totalCases((long) typedCases.size())
                    .activeCases(typedCases.stream().filter(this::isActiveCase).count())
                    .breachedCases(typedCases.stream().filter(this::hasBreachedSla).count())
                    .watchCases(typedCases.stream().filter(this::hasWatchSla).count())
                    .strategicCases(typedCases.stream().filter(item -> item.getCustomerTier() == SupportCaseCustomerTier.STRATEGIC).count())
                    .build());
        }
        return items;
    }

    private List<SupportCaseTierDashboardItemDTO> buildTierSummaries(List<SupportCase> cases) {
        List<SupportCaseTierDashboardItemDTO> items = new ArrayList<>();
        for (SupportCaseCustomerTier customerTier : SupportCaseCustomerTier.values()) {
            List<SupportCase> tierCases = cases.stream()
                    .filter(item -> (item.getCustomerTier() != null ? item.getCustomerTier() : SupportCaseCustomerTier.STANDARD) == customerTier)
                    .toList();
            items.add(SupportCaseTierDashboardItemDTO.builder()
                    .customerTier(customerTier)
                    .totalCases((long) tierCases.size())
                    .activeCases(tierCases.stream().filter(this::isActiveCase).count())
                    .breachedCases(tierCases.stream().filter(this::hasBreachedSla).count())
                    .watchCases(tierCases.stream().filter(this::hasWatchSla).count())
                    .escalatedCases(tierCases.stream().filter(item -> item.getStatus() == SupportCaseStatus.ESCALATED).count())
                    .build());
        }
        return items;
    }

    private List<SupportCaseOwnerWorkloadDTO> buildOwnerWorkloads(List<User> activeOwners, List<SupportCase> cases) {
        return activeOwners.stream()
                .map(owner -> {
                    List<SupportCase> ownerCases = cases.stream()
                            .filter(this::isActiveCase)
                            .filter(item -> owner.getId().equals(item.getOwnerId()))
                            .toList();
                    return SupportCaseOwnerWorkloadDTO.builder()
                            .userId(owner.getId())
                            .name(owner.getFullName())
                            .role(owner.getRole())
                            .territory(owner.getTerritory())
                            .assignedActiveCases((long) ownerCases.size())
                            .urgentCases(ownerCases.stream().filter(item -> item.getPriority() == SupportCasePriority.URGENT).count())
                            .breachedCases(ownerCases.stream().filter(this::hasBreachedSla).count())
                            .escalatedCases(ownerCases.stream().filter(item -> item.getStatus() == SupportCaseStatus.ESCALATED).count())
                            .queuesCovered(ownerCases.stream()
                                    .map(SupportCase::getSupportQueue)
                                    .filter(queue -> queue != null)
                                    .distinct()
                                    .sorted(Comparator.comparing(Enum::name))
                                    .collect(Collectors.toList()))
                            .build();
                })
                .filter(item -> item.getAssignedActiveCases() > 0)
                .toList();
    }

    private boolean isActiveCase(SupportCase supportCase) {
        return ACTIVE_CASE_STATUSES.contains(supportCase.getStatus());
    }

    private boolean hasBreachedSla(SupportCase supportCase) {
        return supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.BREACHED
                || supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.BREACHED;
    }

    private boolean hasWatchSla(SupportCase supportCase) {
        return supportCase.getResponseSlaStatus() == SupportCaseSlaStatus.WATCH
                || supportCase.getResolutionSlaStatus() == SupportCaseSlaStatus.WATCH;
    }

    private boolean shouldIncludeInAssignmentQueue(SupportCase supportCase) {
        return ACTIVE_CASE_STATUSES.contains(supportCase.getStatus())
                && (supportCase.getOwnerId() == null || supportCase.getStatus() == SupportCaseStatus.ESCALATED);
    }

    private boolean shouldIncludeInAssignmentAutomationQueue(SupportCase supportCase, WorkflowRule workflowRule) {
        if (!ACTIVE_CASE_STATUSES.contains(supportCase.getStatus())) {
            return false;
        }
        if (supportCase.getOwnerId() == null) {
            return Boolean.TRUE.equals(workflowRule.getAutoAssignUnassignedCases());
        }
        return supportCase.getStatus() == SupportCaseStatus.ESCALATED
                && Boolean.TRUE.equals(workflowRule.getAutoReassignEscalatedCases());
    }

    private int assignmentPreferenceScore(SupportCase supportCase, User user, WorkflowRule workflowRule) {
        if (isHighTouchCase(supportCase) && Boolean.TRUE.equals(workflowRule.getPreferSeniorCoverageForHighTouch())) {
            return isSeniorSupportOwner(user) ? 0 : 2;
        }
        if (supportCase.getSupportQueue() == SupportCaseQueue.TIER_1 && Boolean.TRUE.equals(workflowRule.getPreferFrontlineForTierOne())) {
            return user.getRole() == UserRole.SALES_REP ? 0 : 1;
        }
        if ((supportCase.getSupportQueue() == SupportCaseQueue.BILLING
                || supportCase.getSupportQueue() == SupportCaseQueue.INCIDENT
                || supportCase.getSupportQueue() == SupportCaseQueue.TIER_2
                || supportCase.getSupportQueue() == SupportCaseQueue.ONBOARDING
                || supportCase.getSupportQueue() == SupportCaseQueue.CUSTOMER_SUCCESS)
                && Boolean.TRUE.equals(workflowRule.getPreferSpecialistCoverage())) {
            return isSeniorSupportOwner(user) ? 0 : 1;
        }
        return 0;
    }

    private boolean isSeniorSupportOwner(User user) {
        return user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER;
    }

    private boolean isHighTouchCase(SupportCase supportCase) {
        return supportCase.getCustomerTier() == SupportCaseCustomerTier.STRATEGIC
                || supportCase.getCustomerTier() == SupportCaseCustomerTier.PREMIUM
                || supportCase.getPriority() == SupportCasePriority.URGENT
                || supportCase.getPriority() == SupportCasePriority.HIGH
                || supportCase.getStatus() == SupportCaseStatus.ESCALATED
                || hasBreachedSla(supportCase)
                || supportCase.getSupportQueue() == SupportCaseQueue.INCIDENT;
    }

    private boolean isEligibleForQueue(User user, SupportCaseQueue queue, WorkflowRule workflowRule) {
        if (queue == null) {
            return true;
        }
        return switch (queue) {
            case TIER_1 -> !Boolean.TRUE.equals(workflowRule.getPreferFrontlineForTierOne()) || user.getRole() == UserRole.SALES_REP;
            case BILLING, INCIDENT, TIER_2, ONBOARDING, CUSTOMER_SUCCESS ->
                    !Boolean.TRUE.equals(workflowRule.getPreferSpecialistCoverage()) || isSeniorSupportOwner(user);
        };
    }

    private String resolveQueueHealthStatus(
            SupportCaseQueue queue,
            double avgActiveCasesPerOwner,
            WorkflowRule workflowRule,
            long overdueActiveCases,
            long oldestActiveCaseHours
    ) {
        if (overdueActiveCases > 0 || oldestActiveCaseHours >= 168) {
            return "CRITICAL";
        }
        if (avgActiveCasesPerOwner <= 0.0d) {
            return "HEALTHY";
        }
        int capacity = getQueueCapacity(queue, workflowRule);
        if (avgActiveCasesPerOwner > capacity) {
            return "OVERLOADED";
        }
        if (avgActiveCasesPerOwner >= Math.max(1.0d, capacity * 0.75d)) {
            return "WATCH";
        }
        return "HEALTHY";
    }

    private String resolveQueueRecommendedAction(
            String healthStatus,
            long staffedOwners,
            long overdueActiveCases,
            long oldestActiveCaseHours,
            SupportCaseQueue queue
    ) {
        if (staffedOwners == 0) {
            return "Assign staffed coverage to " + queue.name() + " immediately";
        }
        if ("CRITICAL".equals(healthStatus)) {
            return "Escalate manager review and clear overdue " + queue.name() + " backlog";
        }
        if ("OVERLOADED".equals(healthStatus)) {
            return "Rebalance active " + queue.name() + " work across available owners";
        }
        if (overdueActiveCases > 0 || oldestActiveCaseHours >= 72) {
            return "Review aging " + queue.name() + " cases before SLA risk increases";
        }
        if ("WATCH".equals(healthStatus)) {
            return "Monitor " + queue.name() + " capacity and preemptively triage high-touch work";
        }
        return "Queue is healthy";
    }

    private long ageInHours(SupportCase supportCase) {
        LocalDateTime createdAt = supportCase.getCreatedAt();
        if (createdAt == null) {
            return 0L;
        }
        return Math.max(0L, ChronoUnit.HOURS.between(createdAt, LocalDateTime.now()));
    }

    private int getQueueCapacity(SupportCaseQueue queue, WorkflowRule workflowRule) {
        return switch (queue) {
            case TIER_1 -> workflowRule.getFrontlineQueueCapacity();
            case BILLING, INCIDENT, TIER_2, ONBOARDING, CUSTOMER_SUCCESS -> workflowRule.getSpecialistQueueCapacity();
        };
    }

    private List<User> getCandidateOwners(UUID tenantId) {
        return userRepository.findByTenantIdAndRoleInAndIsActiveTrueAndArchivedFalse(tenantId, CASE_ASSIGNMENT_ROLES);
    }

    private SupportCaseAssignmentQueueItemDTO toAssignmentQueueItem(
            UUID tenantId,
            SupportCase supportCase,
            List<User> candidateOwners,
            WorkflowRule workflowRule
    ) {
        Optional<User> suggestedOwner = suggestOwner(tenantId, supportCase, candidateOwners, workflowRule);
        return SupportCaseAssignmentQueueItemDTO.builder()
                .caseId(supportCase.getId())
                .caseNumber(supportCase.getCaseNumber())
                .title(supportCase.getTitle())
                .status(supportCase.getStatus())
                .priority(supportCase.getPriority())
                .customerTier(supportCase.getCustomerTier())
                .caseType(supportCase.getCaseType())
                .supportQueue(supportCase.getSupportQueue())
                .companyName(supportCase.getCompany() != null ? supportCase.getCompany().getName() : null)
                .ownerId(supportCase.getOwnerId())
                .ownerName(supportCase.getOwner() != null ? supportCase.getOwner().getFullName() : null)
                .suggestedOwnerId(suggestedOwner.map(User::getId).orElse(null))
                .suggestedOwnerName(suggestedOwner.map(User::getFullName).orElse(null))
                .suggestedReason(resolveSuggestedReason(supportCase, suggestedOwner))
                .recommendedAction(resolveRecommendedAction(supportCase))
                .queueReason(supportCase.getOwnerId() == null ? "UNASSIGNED" : "ESCALATED")
                .responseSlaStatus(supportCase.getResponseSlaStatus())
                .resolutionSlaStatus(supportCase.getResolutionSlaStatus())
                .createdAt(supportCase.getCreatedAt())
                .build();
    }

    private Optional<User> suggestOwner(UUID tenantId, SupportCase supportCase, List<User> candidateOwners, WorkflowRule workflowRule) {
        if (candidateOwners.isEmpty()) {
            return Optional.empty();
        }

        if (Boolean.TRUE.equals(workflowRule.getPreferAccountOwner()) && supportCase.getCompanyId() != null) {
            Optional<User> companyOwner = companyRepository.findById(supportCase.getCompanyId())
                    .filter(company -> company.getTenantId().equals(tenantId) && !Boolean.TRUE.equals(company.getArchived()))
                    .map(Company::getOwnerId)
                    .flatMap(ownerId -> candidateOwners.stream().filter(user -> user.getId().equals(ownerId)).findFirst());
            if (companyOwner.isPresent()) {
                return companyOwner;
            }
        }

        return candidateOwners.stream()
                .filter(user -> isEligibleForQueue(user, supportCase.getSupportQueue(), workflowRule))
                .min(Comparator
                        .comparingInt((User user) -> assignmentPreferenceScore(supportCase, user, workflowRule))
                        .thenComparingLong((User user) -> supportCaseRepository.countByTenantIdAndOwnerIdAndSupportQueueAndStatusInAndArchivedFalse(
                                tenantId,
                                user.getId(),
                                supportCase.getSupportQueue(),
                                ACTIVE_CASE_STATUSES
                        ))
                        .thenComparingLong(user -> supportCaseRepository.countByTenantIdAndOwnerIdAndStatusInAndArchivedFalse(tenantId, user.getId(), ACTIVE_CASE_STATUSES))
                        .thenComparing(User::getFullName))
                .or(() -> candidateOwners.stream()
                        .min(Comparator
                                .comparingLong((User user) -> supportCaseRepository.countByTenantIdAndOwnerIdAndStatusInAndArchivedFalse(
                                        tenantId,
                                        user.getId(),
                                        ACTIVE_CASE_STATUSES
                                ))
                                .thenComparing(User::getFullName)));
    }

    private String resolveSuggestedReason(SupportCase supportCase, Optional<User> suggestedOwner) {
        if (suggestedOwner.isEmpty()) {
            return "No active workspace owner available";
        }
        if (supportCase.getCompanyId() != null && supportCase.getCompany() != null && suggestedOwner.get().getId().equals(supportCase.getCompany().getOwnerId())) {
            return "Matched to the account owner";
        }
        if (isHighTouchCase(supportCase) && isSeniorSupportOwner(suggestedOwner.get())) {
            return "Matched to a high-touch queue specialist for this case";
        }
        if (supportCase.getSupportQueue() == SupportCaseQueue.TIER_1 && suggestedOwner.get().getRole() == UserRole.SALES_REP) {
            return "Matched to the least-loaded frontline queue owner";
        }
        return "Matched to the least-loaded owner in the " + supportCase.getSupportQueue().name() + " queue";
    }

    private String resolveRecommendedAction(SupportCase supportCase) {
        if (hasBreachedSla(supportCase)) {
            return "Immediate manager follow-up required due to breached SLA";
        }
        if (supportCase.getStatus() == SupportCaseStatus.ESCALATED) {
            return "Reassign or review with senior support coverage";
        }
        if (isHighTouchCase(supportCase)) {
            return "Route to high-touch coverage and monitor closely";
        }
        return "Assign to the next available queue owner";
    }

    private long getAssignmentTaskDueDays(SupportCasePriority priority, WorkflowRule workflowRule) {
        if (priority == SupportCasePriority.URGENT) {
            return workflowRule.getUrgentAssignmentTaskDueDays();
        }
        return workflowRule.getDefaultAssignmentTaskDueDays();
    }

    private TaskPriority getAssignmentTaskPriority(SupportCasePriority priority, WorkflowRule workflowRule) {
        if (priority == SupportCasePriority.URGENT) {
            return workflowRule.getUrgentAssignmentTaskPriority();
        }
        return workflowRule.getDefaultAssignmentTaskPriority();
    }

    private String buildAssignmentTaskDescription(SupportCase supportCase, User owner, String queueReason) {
        return "Support case " + supportCase.getCaseNumber() + " has been assigned to " + owner.getFullName()
                + "\nTitle: " + supportCase.getTitle()
                + "\nPriority: " + supportCase.getPriority().name()
                + "\nCase type: " + supportCase.getCaseType().name()
                + "\nSupport queue: " + supportCase.getSupportQueue().name()
                + "\nQueue reason: " + queueReason
                + "\nCustomer impact: " + (supportCase.getCustomerImpact() != null ? supportCase.getCustomerImpact() : "Not provided");
    }

    private void applyCaseSpecialization(SupportCase supportCase) {
        if (supportCase.getCaseType() == null) {
            supportCase.setCaseType(inferCaseType(supportCase));
        }
        if (supportCase.getSupportQueue() == null) {
            supportCase.setSupportQueue(resolveSupportQueue(supportCase));
        }
    }

    private SupportCaseType inferCaseType(SupportCase supportCase) {
        String fingerprint = ((supportCase.getTitle() != null ? supportCase.getTitle() : "") + " "
                + (supportCase.getDescription() != null ? supportCase.getDescription() : "") + " "
                + (supportCase.getCustomerImpact() != null ? supportCase.getCustomerImpact() : "")).toLowerCase();
        if (supportCase.getPriority() == SupportCasePriority.URGENT
                || fingerprint.contains("outage")
                || fingerprint.contains("incident")
                || fingerprint.contains("down")) {
            return SupportCaseType.INCIDENT;
        }
        if (fingerprint.contains("invoice") || fingerprint.contains("billing") || fingerprint.contains("payment") || fingerprint.contains("refund")) {
            return SupportCaseType.BILLING;
        }
        if (fingerprint.contains("onboarding") || fingerprint.contains("implementation") || fingerprint.contains("training")) {
            return SupportCaseType.ONBOARDING;
        }
        if (fingerprint.contains("login") || fingerprint.contains("password") || fingerprint.contains("access") || fingerprint.contains("permission")) {
            return SupportCaseType.ACCESS;
        }
        if (fingerprint.contains("feature") || fingerprint.contains("enhancement") || fingerprint.contains("request")) {
            return SupportCaseType.FEATURE_REQUEST;
        }
        if (fingerprint.contains("api") || fingerprint.contains("error") || fingerprint.contains("bug") || fingerprint.contains("sync")) {
            return SupportCaseType.TECHNICAL;
        }
        return SupportCaseType.OTHER;
    }

    private SupportCaseQueue resolveSupportQueue(SupportCase supportCase) {
        return switch (supportCase.getCaseType()) {
            case INCIDENT -> SupportCaseQueue.INCIDENT;
            case BILLING -> SupportCaseQueue.BILLING;
            case ONBOARDING -> SupportCaseQueue.ONBOARDING;
            case FEATURE_REQUEST -> SupportCaseQueue.CUSTOMER_SUCCESS;
            case TECHNICAL, ACCESS -> (supportCase.getPriority() == SupportCasePriority.HIGH
                    || supportCase.getPriority() == SupportCasePriority.URGENT
                    || supportCase.getCustomerTier() == SupportCaseCustomerTier.STRATEGIC)
                    ? SupportCaseQueue.TIER_2
                    : SupportCaseQueue.TIER_1;
            case OTHER -> supportCase.getCustomerTier() == SupportCaseCustomerTier.STRATEGIC
                    ? SupportCaseQueue.CUSTOMER_SUCCESS
                    : SupportCaseQueue.TIER_1;
        };
    }

    private long applyCaseTypeAdjustment(long baseHours, SupportCaseType caseType, boolean responseTarget) {
        if (caseType == null) {
            return baseHours;
        }
        return switch (caseType) {
            case INCIDENT -> Math.max(1L, responseTarget ? Math.min(baseHours, 1L) : Math.min(baseHours, 8L));
            case BILLING -> Math.max(1L, responseTarget ? Math.min(baseHours, 4L) : Math.min(baseHours, 24L));
            case ONBOARDING -> responseTarget ? Math.max(baseHours, 8L) : Math.max(baseHours, 72L);
            case FEATURE_REQUEST -> responseTarget ? Math.max(baseHours, 12L) : Math.max(baseHours, 96L);
            case ACCESS -> Math.max(1L, responseTarget ? Math.min(baseHours, 2L) : Math.min(baseHours, 16L));
            case TECHNICAL, OTHER -> baseHours;
        };
    }
}
