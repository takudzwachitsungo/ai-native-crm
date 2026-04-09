package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.DealApprovalActionRequestDTO;
import com.crm.dto.request.DealFilterDTO;
import com.crm.dto.request.DealRequestDTO;
import com.crm.dto.request.DealTerritoryReassignmentRequestDTO;
import com.crm.dto.response.DealAttentionItemDTO;
import com.crm.dto.response.DealAttentionSummaryDTO;
import com.crm.dto.response.DealAutomationResultDTO;
import com.crm.dto.response.DealResponseDTO;
import com.crm.dto.response.DealStatsDTO;
import com.crm.dto.response.DealTerritoryQueueItemDTO;
import com.crm.dto.response.DealTerritoryQueueSummaryDTO;
import com.crm.dto.response.DealTerritoryReassignmentResultDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.DealApprovalStatus;
import com.crm.entity.enums.DealRiskLevel;
import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.entity.enums.UserRole;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.DealMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import com.crm.security.RecordAccessService;
import com.crm.service.AutomationExecutionService;
import com.crm.service.AutomationExecutionTargets;
import com.crm.service.AutomationRunService;
import com.crm.service.DealService;
import com.crm.service.WorkflowRuleService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DealServiceImpl implements DealService {

    private final DealRepository dealRepository;
    private final CompanyRepository companyRepository;
    private final ContactRepository contactRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final DealMapper dealMapper;
    private final WorkflowRuleService workflowRuleService;
    private final AutomationRunService automationRunService;
    private final RecordAccessService recordAccessService;
    private final AutomationExecutionService automationExecutionService;

    private static final EnumSet<TaskStatus> OPEN_TASK_STATUSES = EnumSet.of(
            TaskStatus.PENDING,
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS
    );
    private static final String RESCUE_TASK_PREFIX = "Rescue stalled deal: ";
    private static final String DEAL_RESCUE_AUTOMATION_KEY = "DEAL_RESCUE";
    private static final String DEAL_RESCUE_AUTOMATION_NAME = "Deal Rescue Automation";
    private static final String TRIGGER_SOURCE_MANUAL = "MANUAL";
    private static final String RUN_STATUS_SUCCESS = "SUCCESS";
    private static final String RUN_STATUS_SKIPPED = "SKIPPED";
    private static final String APPROVAL_TASK_PREFIX = "Approve deal: ";
    private static final EnumSet<DealStage> CLOSED_DEAL_STAGES = EnumSet.of(DealStage.CLOSED_WON, DealStage.CLOSED_LOST);

    @Override
    @Transactional(readOnly = true)
    public Page<DealResponseDTO> findAll(Pageable pageable, DealFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Deal>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<Deal> accessScope = recordAccessService.dealReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), search),
                    cb.like(cb.lower(root.get("description")), search)
                ));
            }
            
            if (filter.getStage() != null) {
                specs.add(SpecificationBuilder.equal("stage", filter.getStage()));
            }
            
            if (filter.getDealType() != null) {
                specs.add(SpecificationBuilder.equal("dealType", filter.getDealType()));
            }
            
            if (filter.getLeadSource() != null) {
                specs.add(SpecificationBuilder.equal("leadSource", filter.getLeadSource()));
            }
            
            if (filter.getMinValue() != null) {
                specs.add(SpecificationBuilder.greaterThan("value", filter.getMinValue()));
            }
            
            if (filter.getMaxValue() != null) {
                specs.add(SpecificationBuilder.lessThan("value", filter.getMaxValue()));
            }
            
            if (filter.getMinProbability() != null) {
                specs.add(SpecificationBuilder.greaterThan("probability", filter.getMinProbability()));
            }
            
            if (filter.getMaxProbability() != null) {
                specs.add(SpecificationBuilder.lessThan("probability", filter.getMaxProbability()));
            }
            
            if (filter.getExpectedCloseDateFrom() != null && filter.getExpectedCloseDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("expectedCloseDate",
                    filter.getExpectedCloseDateFrom(), filter.getExpectedCloseDateTo()));
            }
            
            if (filter.getCompanyId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("company").get("id"), filter.getCompanyId()));
            }
            
            if (filter.getContactId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("contact").get("id"), filter.getContactId()));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            }
        }
        
        Specification<Deal> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Deal> deals = dealRepository.findAll(spec, pageable);
        
        return deals.map(dealMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public DealResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        recordAccessService.assertCanViewDeal(deal);
        
        return dealMapper.toDto(deal);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public DealResponseDTO create(DealRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        
        Deal deal = dealMapper.toEntity(request);
        deal.setTenantId(tenantId);
        deal.setOwnerId(recordAccessService.resolveAssignableOwnerId(deal.getOwnerId()));

        applyRelationshipsAndRules(tenantId, deal, request, null, null, approvalWorkflow);
        
        deal = dealRepository.save(deal);
        deal = dealRepository.findById(deal.getId()).orElse(deal);
        var automationOutcome = automationExecutionService.executeRealTimeRules(
                tenantId,
                AutomationEventType.DEAL_CREATED,
                AutomationExecutionTargets.builder().deal(deal).build()
        );
        if (automationOutcome.isMutatedTarget()) {
            deal = dealRepository.save(deal);
            deal = dealRepository.findById(deal.getId()).orElse(deal);
        }
        if (!requiresApproval(deal, approvalWorkflow)) {
            completeApprovalTasks(tenantId, deal.getId());
        }
        ensureDealNextStepTask(tenantId, deal);
        log.info("Created deal: {} for tenant: {}", deal.getId(), tenantId);
        
        return findById(deal.getId());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics"}, allEntries = true)
    public DealResponseDTO update(UUID id, DealRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        recordAccessService.assertCanWriteDeal(deal);

        DealStage previousStage = deal.getStage();
        dealMapper.updateEntity(request, deal);
        deal.setOwnerId(recordAccessService.resolveAssignableOwnerId(deal.getOwnerId()));
        applyRelationshipsAndRules(tenantId, deal, request, deal.getId(), previousStage, approvalWorkflow);
        deal = dealRepository.save(deal);
        deal = dealRepository.findById(deal.getId()).orElse(deal);
        var automationOutcome = automationExecutionService.executeRealTimeRules(
                tenantId,
                AutomationEventType.DEAL_UPDATED,
                AutomationExecutionTargets.builder().deal(deal).build()
        );
        if (automationOutcome.isMutatedTarget()) {
            deal = dealRepository.save(deal);
            deal = dealRepository.findById(deal.getId()).orElse(deal);
        }
        if (!requiresApproval(deal, approvalWorkflow)) {
            completeApprovalTasks(tenantId, deal.getId());
        }
        ensureDealNextStepTask(tenantId, deal);
        
        log.info("Updated deal: {} for tenant: {}", id, tenantId);
        
        return findById(deal.getId());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics"}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        recordAccessService.assertCanWriteDeal(deal);
        
        deal.setArchived(true);
        dealRepository.save(deal);
        
        log.info("Deleted (archived) deal: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Deal> deals = dealRepository.findAllById(ids).stream()
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .filter(recordAccessService::canWriteDeal)
                .collect(Collectors.toList());
        
        if (deals.isEmpty()) {
            throw new BadRequestException("No valid deals found for deletion");
        }
        
        deals.forEach(deal -> deal.setArchived(true));
        dealRepository.saveAll(deals);
        
        log.info("Bulk deleted {} deals for tenant: {}", deals.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics"}, allEntries = true)
    public DealResponseDTO updateStage(UUID id, DealStage newStage) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        
        Deal deal = dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
        recordAccessService.assertCanWriteDeal(deal);
        
        DealStage oldStage = deal.getStage();
        deal.setStage(newStage);
        
        // Update probability based on new stage
        deal.setProbability(getDefaultProbabilityForStage(newStage));
        deal.setStageChangedAt(LocalDateTime.now());
        
        // Set actual close date if won or lost
        if (newStage == DealStage.CLOSED_WON || newStage == DealStage.CLOSED_LOST) {
            deal.setActualCloseDate(LocalDate.now());
        } else {
            deal.setActualCloseDate(null);
        }

        if (newStage == DealStage.CLOSED_WON && requiresApproval(deal, approvalWorkflow) && deal.getApprovalStatus() != DealApprovalStatus.APPROVED) {
            throw new BadRequestException("This deal requires approval before it can be closed won");
        }
        if (!requiresApproval(deal, approvalWorkflow)) {
            clearApprovalState(deal);
        }
        
        deal = dealRepository.save(deal);
        deal = dealRepository.findById(deal.getId()).orElse(deal);
        var automationOutcome = automationExecutionService.executeRealTimeRules(
                tenantId,
                AutomationEventType.DEAL_UPDATED,
                AutomationExecutionTargets.builder().deal(deal).build()
        );
        if (automationOutcome.isMutatedTarget()) {
            deal = dealRepository.save(deal);
            deal = dealRepository.findById(deal.getId()).orElse(deal);
        }
        if (!requiresApproval(deal, approvalWorkflow)) {
            completeApprovalTasks(tenantId, deal.getId());
        }
        
        log.info("Updated deal {} stage from {} to {} for tenant: {}", id, oldStage, newStage, tenantId);
        
        return findById(deal.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DealResponseDTO> findByStage(DealStage stage) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Deal> deals = dealRepository.findByTenantIdAndStageAndArchivedFalse(tenantId, stage);
        return deals.stream()
                .filter(recordAccessService::canViewDeal)
                .map(dealMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DealStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule rescueWorkflow = workflowRuleService.resolveDealRescueWorkflow(tenantId);
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        
        List<Deal> allDeals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        allDeals = allDeals.stream()
                .filter(recordAccessService::canViewDeal)
                .toList();
        
        Long totalDeals = (long) allDeals.size();
        
        Map<DealStage, Long> dealsByStage = allDeals.stream()
                .collect(Collectors.groupingBy(Deal::getStage, Collectors.counting()));
        
        Map<DealStage, BigDecimal> valueByStage = allDeals.stream()
                .collect(Collectors.groupingBy(
                    Deal::getStage,
                    Collectors.reducing(BigDecimal.ZERO, Deal::getValue, BigDecimal::add)
                ));
        
        BigDecimal totalValue = allDeals.stream()
                .map(Deal::getValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal weightedTotalValue = allDeals.stream()
                .map(Deal::getWeightedValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal averageDealValue = totalDeals > 0 
                ? totalValue.divide(BigDecimal.valueOf(totalDeals), 2, BigDecimal.ROUND_HALF_UP)
                : BigDecimal.ZERO;
        
        Long wonDeals = dealsByStage.getOrDefault(DealStage.CLOSED_WON, 0L);
        Long lostDeals = dealsByStage.getOrDefault(DealStage.CLOSED_LOST, 0L);
        Long closedDeals = wonDeals + lostDeals;
        long activeDeals = allDeals.stream().filter(this::isActiveDeal).count();
        long highRiskDealCount = allDeals.stream()
                .filter(this::isActiveDeal)
                .filter(deal -> deal.getRiskLevel() == DealRiskLevel.HIGH)
                .count();
        long stalledDealCount = allDeals.stream()
                .filter(deal -> isStalledDeal(deal, rescueWorkflow))
                .count();
        long overdueNextStepCount = allDeals.stream()
                .filter(deal -> isOverdueNextStep(deal, rescueWorkflow))
                .count();
        long dealsNeedingAttention = allDeals.stream()
                .filter(deal -> needsAttention(deal, rescueWorkflow))
                .count();
        long pendingApprovalCount = allDeals.stream()
                .filter(deal -> requiresApproval(deal, approvalWorkflow))
                .filter(deal -> deal.getApprovalStatus() == DealApprovalStatus.PENDING)
                .count();
        
        Double winRate = closedDeals > 0 ? (wonDeals.doubleValue() / closedDeals) * 100 : 0.0;
        
        BigDecimal wonValue = valueByStage.getOrDefault(DealStage.CLOSED_WON, BigDecimal.ZERO);
        
        return DealStatsDTO.builder()
                .totalDeals(totalDeals)
                .dealsByStage(dealsByStage)
                .valueByStage(valueByStage)
                .totalValue(totalValue)
                .weightedTotalValue(weightedTotalValue)
                .averageDealValue(averageDealValue)
                .wonDealsThisMonth(wonDeals)
                .wonValueThisMonth(wonValue)
                .winRate(winRate)
                .activeDeals(activeDeals)
                .highRiskDealCount(highRiskDealCount)
                .stalledDealCount(stalledDealCount)
                .overdueNextStepCount(overdueNextStepCount)
                .dealsNeedingAttention(dealsNeedingAttention)
                .pendingApprovalCount(pendingApprovalCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DealAttentionSummaryDTO getAttentionSummary() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule rescueWorkflow = workflowRuleService.resolveDealRescueWorkflow(tenantId);
        List<Deal> activeDeals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(this::isActiveDeal)
                .filter(recordAccessService::canViewDeal)
                .toList();

        Map<UUID, List<Task>> tasksByDeal = getTasksByDeal(tenantId, activeDeals);
        List<DealAttentionItemDTO> attentionItems = buildAttentionItems(activeDeals, tasksByDeal, rescueWorkflow);

        return DealAttentionSummaryDTO.builder()
                .activeDealCount(activeDeals.size())
                .highRiskDealCount(activeDeals.stream().filter(deal -> deal.getRiskLevel() == DealRiskLevel.HIGH).count())
                .stalledDealCount(attentionItems.stream().filter(DealAttentionItemDTO::isStalled).count())
                .overdueNextStepCount(attentionItems.stream().filter(DealAttentionItemDTO::isOverdueNextStep).count())
                .dealsNeedingAttention(attentionItems.stream().filter(DealAttentionItemDTO::isNeedsAttention).count())
                .deals(attentionItems.stream().filter(DealAttentionItemDTO::isNeedsAttention).limit(8).toList())
                .build();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics", "tasks"}, allEntries = true)
    public DealAutomationResultDTO runStalledDealAutomation() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule rescueWorkflow = workflowRuleService.resolveDealRescueWorkflow(tenantId);
        if (!Boolean.TRUE.equals(rescueWorkflow.getIsActive())) {
            DealAutomationResultDTO result = DealAutomationResultDTO.builder()
                    .reviewedDeals(0)
                    .rescueTasksCreated(0)
                    .alreadyCoveredDeals(0)
                    .createdTaskIds(List.of())
                    .build();
            recordDealRescueRun(
                    tenantId,
                    RUN_STATUS_SKIPPED,
                    result.getReviewedDeals(),
                    result.getRescueTasksCreated(),
                    result.getAlreadyCoveredDeals(),
                    "Deal rescue workflow is paused for this workspace."
            );
            return result;
        }
        List<Deal> activeDeals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(this::isActiveDeal)
                .filter(recordAccessService::canWriteDeal)
                .toList();
        Map<UUID, List<Task>> tasksByDeal = getTasksByDeal(tenantId, activeDeals);

        int reviewedDeals = 0;
        int rescueTasksCreated = 0;
        int alreadyCoveredDeals = 0;
        List<UUID> createdTaskIds = new ArrayList<>();

        for (Deal deal : activeDeals) {
            if (!needsAttention(deal, rescueWorkflow)) {
                continue;
            }

            reviewedDeals++;
            List<Task> dealTasks = tasksByDeal.getOrDefault(deal.getId(), List.of());
            if (hasOpenRescueTask(dealTasks)) {
                alreadyCoveredDeals++;
                continue;
            }

            Task rescueTask = Task.builder()
                    .title(RESCUE_TASK_PREFIX + deal.getName())
                    .description(buildRescueTaskDescription(deal, rescueWorkflow))
                    .dueDate(LocalDate.now().plusDays(rescueWorkflow.getRescueTaskDueDays()))
                    .priority(rescueWorkflow.getRescueTaskPriority())
                    .status(TaskStatus.TODO)
                    .assignedTo(deal.getOwnerId())
                    .relatedEntityType("deal")
                    .relatedEntityId(deal.getId())
                    .build();
            rescueTask.setTenantId(tenantId);
            Task savedTask = taskRepository.save(rescueTask);
            createdTaskIds.add(savedTask.getId());
            rescueTasksCreated++;
        }

        DealAutomationResultDTO result = DealAutomationResultDTO.builder()
                .reviewedDeals(reviewedDeals)
                .rescueTasksCreated(rescueTasksCreated)
                .alreadyCoveredDeals(alreadyCoveredDeals)
                .createdTaskIds(createdTaskIds)
                .build();
        recordDealRescueRun(
                tenantId,
                RUN_STATUS_SUCCESS,
                result.getReviewedDeals(),
                result.getRescueTasksCreated(),
                result.getAlreadyCoveredDeals(),
                "Reviewed %d deal(s), created %d rescue task(s), %d already covered."
                        .formatted(reviewedDeals, rescueTasksCreated, alreadyCoveredDeals)
        );
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public DealTerritoryQueueSummaryDTO getTerritoryGovernanceQueue() {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule rescueWorkflow = workflowRuleService.resolveDealRescueWorkflow(tenantId);
        List<Deal> deals = dealRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(this::isActiveDeal)
                .filter(this::hasTerritoryMismatch)
                .filter(recordAccessService::canViewDeal)
                .sorted(Comparator.comparingInt((Deal deal) -> attentionRank(deal, rescueWorkflow)).reversed()
                        .thenComparing(Deal::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<DealTerritoryQueueItemDTO> items = deals.stream()
                .map(deal -> toTerritoryQueueItem(deal, rescueWorkflow))
                .toList();

        return DealTerritoryQueueSummaryDTO.builder()
                .mismatchCount((long) items.size())
                .highPriorityCount(items.stream().filter(item -> item.getPriorityRank() != null && item.getPriorityRank() >= 4).count())
                .deals(items)
                .build();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics", "tasks"}, allEntries = true)
    public DealTerritoryReassignmentResultDTO reassignTerritoryMismatches(DealTerritoryReassignmentRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();

        Set<UUID> requestedIds = request != null && request.getDealIds() != null
                ? request.getDealIds().stream().filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new))
                : Set.of();

        List<Deal> candidates = dealRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(this::isActiveDeal)
                .filter(this::hasTerritoryMismatch)
                .filter(recordAccessService::canWriteDeal)
                .filter(deal -> requestedIds.isEmpty() || requestedIds.contains(deal.getId()))
                .toList();

        int reassignedDeals = 0;
        int skippedDeals = 0;
        List<UUID> updatedDealIds = new ArrayList<>();

        for (Deal deal : candidates) {
            UUID suggestedOwnerId = selectBestOwnerId(tenantId, deal.getTerritory());
            if (suggestedOwnerId == null || suggestedOwnerId.equals(deal.getOwnerId())) {
                skippedDeals++;
                continue;
            }

            validateOwner(tenantId, suggestedOwnerId);
            deal.setOwnerId(suggestedOwnerId);
            deal = dealRepository.save(deal);
            ensureDealNextStepTask(tenantId, deal);
            updatedDealIds.add(deal.getId());
            reassignedDeals++;
        }

        return DealTerritoryReassignmentResultDTO.builder()
                .reviewedDeals(candidates.size())
                .reassignedDeals(reassignedDeals)
                .skippedDeals(skippedDeals)
                .updatedDealIds(updatedDealIds)
                .build();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics", "tasks"}, allEntries = true)
    public DealResponseDTO requestApproval(UUID id, DealApprovalActionRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        Deal deal = getTenantDeal(tenantId, id);
        recordAccessService.assertCanWriteDeal(deal);

        if (!requiresApproval(deal, approvalWorkflow)) {
            throw new BadRequestException("This deal does not currently require approval");
        }

        User requester = getCurrentUser();
        deal.setApprovalStatus(DealApprovalStatus.PENDING);
        deal.setApprovalRequestedAt(LocalDateTime.now());
        deal.setApprovalRequestedBy(requester.getId());
        deal.setApprovedAt(null);
        deal.setApprovedBy(null);
        deal.setRejectedAt(null);
        deal.setRejectedBy(null);
        deal.setApprovalNotes(normalizeNotes(request.getNotes()));
        deal = dealRepository.save(deal);

        ensureApprovalTask(tenantId, deal, requester, approvalWorkflow);
        return findById(deal.getId());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics", "tasks"}, allEntries = true)
    public DealResponseDTO approve(UUID id, DealApprovalActionRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        Deal deal = getTenantDeal(tenantId, id);
        recordAccessService.assertCanWriteDeal(deal);

        if (!requiresApproval(deal, approvalWorkflow)) {
            throw new BadRequestException("This deal no longer requires approval");
        }
        if (deal.getApprovalStatus() != DealApprovalStatus.PENDING) {
            throw new BadRequestException("Only pending approval requests can be approved");
        }

        User approver = getCurrentUser();
        deal.setApprovalStatus(DealApprovalStatus.APPROVED);
        deal.setApprovedAt(LocalDateTime.now());
        deal.setApprovedBy(approver.getId());
        deal.setRejectedAt(null);
        deal.setRejectedBy(null);
        deal.setApprovalNotes(normalizeNotes(request.getNotes()));
        deal = dealRepository.save(deal);

        completeApprovalTasks(tenantId, deal.getId());
        return findById(deal.getId());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"deal", "dashboard-metrics", "tasks"}, allEntries = true)
    public DealResponseDTO reject(UUID id, DealApprovalActionRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        Deal deal = getTenantDeal(tenantId, id);
        recordAccessService.assertCanWriteDeal(deal);

        if (!requiresApproval(deal, approvalWorkflow)) {
            throw new BadRequestException("This deal no longer requires approval");
        }
        if (deal.getApprovalStatus() != DealApprovalStatus.PENDING) {
            throw new BadRequestException("Only pending approval requests can be rejected");
        }

        User rejector = getCurrentUser();
        deal.setApprovalStatus(DealApprovalStatus.REJECTED);
        deal.setRejectedAt(LocalDateTime.now());
        deal.setRejectedBy(rejector.getId());
        deal.setApprovedAt(null);
        deal.setApprovedBy(null);
        deal.setApprovalNotes(normalizeNotes(request.getNotes()));
        deal = dealRepository.save(deal);

        completeApprovalTasks(tenantId, deal.getId());
        return findById(deal.getId());
    }

    private void applyRelationshipsAndRules(
            UUID tenantId,
            Deal deal,
            DealRequestDTO request,
            UUID dealId,
            DealStage previousStage,
            WorkflowRule approvalWorkflow
    ) {
        Company company = null;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId())
                    .filter(candidate -> candidate.getTenantId().equals(tenantId) && !candidate.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
            deal.setCompanyId(company.getId());
            deal.setCompany(company);
        } else {
            deal.setCompanyId(null);
            deal.setCompany(null);
        }

        if (request.getContactId() != null) {
            Contact contact = contactRepository.findById(request.getContactId())
                    .filter(candidate -> candidate.getTenantId().equals(tenantId) && !candidate.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Contact", request.getContactId()));
            if (company != null && contact.getCompanyId() != null && !company.getId().equals(contact.getCompanyId())) {
                throw new BadRequestException("Selected contact must belong to the selected company");
            }
            deal.setContactId(contact.getId());
            deal.setContact(contact);
        } else {
            deal.setContactId(null);
            deal.setContact(null);
        }

        if (deal.getProbability() == null) {
            deal.setProbability(getDefaultProbabilityForStage(deal.getStage()));
        }

        applyTerritory(deal, request, company);

        if (deal.getOwnerId() == null) {
            deal.setOwnerId(resolveDefaultOwnerId(tenantId, company, deal.getTerritory()));
        } else {
            validateOwner(tenantId, deal.getOwnerId());
        }

        if (deal.getStageChangedAt() == null || (previousStage != null && previousStage != deal.getStage())) {
            deal.setStageChangedAt(LocalDateTime.now());
        }

        if (request.getRiskLevel() == null) {
            deal.setRiskLevel(resolveRiskLevel(deal));
        }

        if (deal.getApprovalStatus() == null) {
            deal.setApprovalStatus(DealApprovalStatus.NONE);
        }

        if (!requiresApproval(deal, approvalWorkflow)) {
            clearApprovalState(deal);
        }

        if (deal.getStage() == DealStage.CLOSED_WON) {
            if (requiresApproval(deal, approvalWorkflow) && deal.getApprovalStatus() != DealApprovalStatus.APPROVED) {
                throw new BadRequestException("This deal requires approval before it can be closed won");
            }
            deal.setActualCloseDate(deal.getActualCloseDate() != null ? deal.getActualCloseDate() : LocalDate.now());
            deal.setLossReason(null);
        } else if (deal.getStage() == DealStage.CLOSED_LOST) {
            if (request.getLossReason() == null || request.getLossReason().isBlank()) {
                throw new BadRequestException("Loss reason is required when closing a deal as lost");
            }
            deal.setActualCloseDate(deal.getActualCloseDate() != null ? deal.getActualCloseDate() : LocalDate.now());
            deal.setWinReason(null);
        } else {
            deal.setActualCloseDate(null);
            deal.setWinReason(null);
            deal.setLossReason(null);
        }

        if (dealId == null && deal.getNextStepDueDate() == null && deal.getExpectedCloseDate() != null) {
            deal.setNextStepDueDate(deal.getExpectedCloseDate().minusDays(7));
        }
    }

    private DealRiskLevel resolveRiskLevel(Deal deal) {
        if (deal.getStage() == DealStage.CLOSED_LOST) {
            return DealRiskLevel.HIGH;
        }
        if ((deal.getStage() == DealStage.PROPOSAL || deal.getStage() == DealStage.NEGOTIATION)
                && ((deal.getProbability() != null && deal.getProbability() < 40)
                || (deal.getExpectedCloseDate() != null && deal.getExpectedCloseDate().isBefore(LocalDate.now())))) {
            return DealRiskLevel.HIGH;
        }
        if (deal.getExpectedCloseDate() != null && deal.getExpectedCloseDate().isBefore(LocalDate.now().plusDays(14))) {
            return DealRiskLevel.MEDIUM;
        }
        return DealRiskLevel.LOW;
    }

    private void ensureDealNextStepTask(UUID tenantId, Deal deal) {
        if (deal.getId() == null
                || deal.getStage() == DealStage.CLOSED_WON
                || deal.getStage() == DealStage.CLOSED_LOST
                || deal.getNextStep() == null
                || deal.getNextStep().isBlank()
                || deal.getNextStepDueDate() == null) {
            return;
        }

        boolean openTaskExists = taskRepository.existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
                tenantId,
                "deal",
                deal.getId(),
                OPEN_TASK_STATUSES
        );

        if (openTaskExists) {
            return;
        }

        Task task = Task.builder()
                .title("Advance deal: " + deal.getName())
                .description(buildNextStepTaskDescription(deal))
                .dueDate(deal.getNextStepDueDate())
                .priority(deal.getRiskLevel() == DealRiskLevel.HIGH ? TaskPriority.HIGH : TaskPriority.MEDIUM)
                .status(TaskStatus.TODO)
                .assignedTo(deal.getOwnerId())
                .relatedEntityType("deal")
                .relatedEntityId(deal.getId())
                .build();
        task.setTenantId(tenantId);
        taskRepository.save(task);
    }

    private void ensureApprovalTask(UUID tenantId, Deal deal, User requester, WorkflowRule approvalWorkflow) {
        if (!requiresApproval(deal, approvalWorkflow) || deal.getApprovalStatus() != DealApprovalStatus.PENDING || hasOpenApprovalTask(tenantId, deal.getId())) {
            return;
        }

        User assignee = resolveApprovalAssignee(tenantId, requester, deal.getOwnerId());
        Task approvalTask = Task.builder()
                .title(APPROVAL_TASK_PREFIX + deal.getName())
                .description(buildApprovalTaskDescription(deal, requester, assignee))
                .dueDate(LocalDate.now().plusDays(approvalWorkflow.getApprovalTaskDueDays()))
                .priority(approvalWorkflow.getApprovalTaskPriority())
                .status(TaskStatus.TODO)
                .assignedTo(assignee != null ? assignee.getId() : null)
                .relatedEntityType("deal_approval")
                .relatedEntityId(deal.getId())
                .build();
        approvalTask.setTenantId(tenantId);
        taskRepository.save(approvalTask);
    }

    private String buildNextStepTaskDescription(Deal deal) {
        StringBuilder description = new StringBuilder("Next step: ").append(deal.getNextStep()).append(".");
        if (deal.getCompanyName() != null) {
            description.append(" Account: ").append(deal.getCompanyName()).append(".");
        }
        if (hasText(deal.getTerritory())) {
            description.append(" Territory: ").append(deal.getTerritory()).append(".");
        }
        if (deal.getContactName() != null) {
            description.append(" Contact: ").append(deal.getContactName()).append(".");
        }
        if (deal.getCompetitorName() != null && !deal.getCompetitorName().isBlank()) {
            description.append(" Competitor: ").append(deal.getCompetitorName()).append(".");
        }
        if (deal.getBuyingCommitteeSummary() != null && !deal.getBuyingCommitteeSummary().isBlank()) {
            description.append(" Buying committee: ").append(deal.getBuyingCommitteeSummary()).append(".");
        }
        return description.toString();
    }

    private String buildApprovalTaskDescription(Deal deal, User requester, User assignee) {
        StringBuilder description = new StringBuilder("Review deal governance approval request.");
        if (deal.getCompanyName() != null) {
            description.append(" Account: ").append(deal.getCompanyName()).append(".");
        }
        description.append(" Deal value: ").append(deal.getValue()).append(".");
        if (deal.getRiskLevel() != null) {
            description.append(" Risk level: ").append(deal.getRiskLevel()).append(".");
        }
        if (requester != null) {
            description.append(" Requested by: ").append(requester.getFullName()).append(".");
        }
        if (assignee != null) {
            description.append(" Assigned approver: ").append(assignee.getFullName()).append(".");
        }
        if (deal.getApprovalNotes() != null && !deal.getApprovalNotes().isBlank()) {
            description.append(" Notes: ").append(deal.getApprovalNotes()).append(".");
        }
        return description.toString();
    }

    private boolean isActiveDeal(Deal deal) {
        return deal.getStage() != DealStage.CLOSED_WON && deal.getStage() != DealStage.CLOSED_LOST;
    }

    private boolean requiresApproval(Deal deal) {
        UUID tenantId = TenantContext.getTenantId();
        WorkflowRule approvalWorkflow = workflowRuleService.resolveDealApprovalWorkflow(tenantId);
        return requiresApproval(deal, approvalWorkflow);
    }

    private boolean requiresApproval(Deal deal, WorkflowRule approvalWorkflow) {
        if (deal.getStage() == DealStage.CLOSED_LOST) {
            return false;
        }
        if (approvalWorkflow == null || !Boolean.TRUE.equals(approvalWorkflow.getIsActive())) {
            return false;
        }
        boolean thresholdTriggered = deal.getValue() != null
                && approvalWorkflow.getValueApprovalThreshold() != null
                && deal.getValue().compareTo(approvalWorkflow.getValueApprovalThreshold()) >= 0;
        boolean highRiskTriggered = Boolean.TRUE.equals(approvalWorkflow.getRequireApprovalForHighRisk())
                && deal.getRiskLevel() == DealRiskLevel.HIGH;
        return thresholdTriggered || highRiskTriggered;
    }

    private boolean isStalledDeal(Deal deal, WorkflowRule rescueWorkflow) {
        return isActiveDeal(deal)
                && Boolean.TRUE.equals(rescueWorkflow.getReviewStalledDeals())
                && deal.getStageChangedAt() != null
                && deal.getStageChangedAt().isBefore(LocalDateTime.now().minusDays(rescueWorkflow.getStalledDealDays()));
    }

    private boolean isOverdueNextStep(Deal deal, WorkflowRule rescueWorkflow) {
        return isActiveDeal(deal)
                && Boolean.TRUE.equals(rescueWorkflow.getReviewOverdueNextSteps())
                && deal.getNextStepDueDate() != null
                && deal.getNextStepDueDate().isBefore(LocalDate.now());
    }

    private boolean needsAttention(Deal deal, WorkflowRule rescueWorkflow) {
        if (!isActiveDeal(deal) || !Boolean.TRUE.equals(rescueWorkflow.getIsActive())) {
            return false;
        }
        return isStalledDeal(deal, rescueWorkflow)
                || isOverdueNextStep(deal, rescueWorkflow)
                || (Boolean.TRUE.equals(rescueWorkflow.getReviewHighRiskDeals()) && deal.getRiskLevel() == DealRiskLevel.HIGH)
                || (Boolean.TRUE.equals(rescueWorkflow.getReviewTerritoryMismatch()) && hasTerritoryMismatch(deal));
    }

    private Map<UUID, List<Task>> getTasksByDeal(UUID tenantId, List<Deal> deals) {
        List<UUID> dealIds = deals.stream().map(Deal::getId).filter(Objects::nonNull).toList();
        if (dealIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdInAndArchivedFalse(tenantId, "deal", dealIds)
                .stream()
                .collect(Collectors.groupingBy(Task::getRelatedEntityId));
    }

    private List<DealAttentionItemDTO> buildAttentionItems(List<Deal> deals, Map<UUID, List<Task>> tasksByDeal, WorkflowRule rescueWorkflow) {
        LocalDate today = LocalDate.now();

        return deals.stream()
                .filter(deal -> needsAttention(deal, rescueWorkflow))
                .sorted(Comparator.comparing((Deal deal) -> attentionRank(deal, rescueWorkflow)).reversed()
                        .thenComparing(Deal::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(deal -> {
                    List<Task> tasks = tasksByDeal.getOrDefault(deal.getId(), List.of());
                    boolean hasOpenTask = tasks.stream().anyMatch(task -> OPEN_TASK_STATUSES.contains(task.getStatus()));
                    boolean rescueTaskOpen = hasOpenRescueTask(tasks);
                    Integer daysInStage = deal.getStageChangedAt() == null
                            ? null
                            : (int) java.time.Duration.between(deal.getStageChangedAt(), LocalDateTime.now()).toDays();
                    Integer daysUntilNextStepDue = deal.getNextStepDueDate() == null
                            ? null
                            : (int) java.time.temporal.ChronoUnit.DAYS.between(today, deal.getNextStepDueDate());

                    return DealAttentionItemDTO.builder()
                            .dealId(deal.getId())
                            .dealName(deal.getName())
                            .companyName(deal.getCompanyName())
                            .territory(deal.getTerritory())
                            .ownerName(deal.getOwner() != null ? deal.getOwner().getFullName() : null)
                            .ownerTerritory(deal.getOwner() != null ? deal.getOwner().getTerritory() : null)
                            .stage(deal.getStage())
                            .riskLevel(deal.getRiskLevel())
                            .nextStep(deal.getNextStep())
                            .nextStepDueDate(deal.getNextStepDueDate())
                            .stageChangedAt(deal.getStageChangedAt())
                            .daysInStage(daysInStage)
                            .daysUntilNextStepDue(daysUntilNextStepDue)
                            .stalled(isStalledDeal(deal, rescueWorkflow))
                            .overdueNextStep(isOverdueNextStep(deal, rescueWorkflow))
                            .hasOpenTask(hasOpenTask)
                            .rescueTaskOpen(rescueTaskOpen)
                            .territoryMismatch(hasTerritoryMismatch(deal))
                            .needsAttention(needsAttention(deal, rescueWorkflow))
                            .build();
                })
                .toList();
    }

    private DealTerritoryQueueItemDTO toTerritoryQueueItem(Deal deal, WorkflowRule rescueWorkflow) {
        UUID tenantId = TenantContext.getTenantId();
        UUID suggestedOwnerId = selectBestOwnerId(tenantId, deal.getTerritory());
        if (suggestedOwnerId != null && suggestedOwnerId.equals(deal.getOwnerId())) {
            suggestedOwnerId = null;
        }
        User suggestedOwner = suggestedOwnerId == null
                ? null
                : userRepository.findByIdAndTenantIdAndArchivedFalse(suggestedOwnerId, tenantId).orElse(null);

        return DealTerritoryQueueItemDTO.builder()
                .dealId(deal.getId())
                .dealName(deal.getName())
                .companyId(deal.getCompanyId())
                .companyName(deal.getCompanyName())
                .territory(deal.getTerritory())
                .stage(deal.getStage())
                .riskLevel(deal.getRiskLevel())
                .value(deal.getValue())
                .currentOwnerName(deal.getOwner() != null ? deal.getOwner().getFullName() : null)
                .currentOwnerTerritory(deal.getOwner() != null ? deal.getOwner().getTerritory() : null)
                .suggestedOwnerId(suggestedOwnerId)
                .suggestedOwnerName(suggestedOwner != null ? suggestedOwner.getFullName() : null)
                .suggestedOwnerTerritory(suggestedOwner != null ? suggestedOwner.getTerritory() : null)
                .nextStep(deal.getNextStep())
                .nextStepDueDate(deal.getNextStepDueDate())
                .stalled(isStalledDeal(deal, rescueWorkflow))
                .overdueNextStep(isOverdueNextStep(deal, rescueWorkflow))
                .priorityRank(attentionRank(deal, rescueWorkflow))
                .build();
    }

    private boolean hasOpenRescueTask(List<Task> tasks) {
        return tasks.stream().anyMatch(task ->
                OPEN_TASK_STATUSES.contains(task.getStatus())
                        && task.getTitle() != null
                        && task.getTitle().startsWith(RESCUE_TASK_PREFIX)
        );
    }

    private boolean hasOpenApprovalTask(UUID tenantId, UUID dealId) {
        return taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(tenantId, "deal_approval", dealId)
                .stream()
                .anyMatch(task -> OPEN_TASK_STATUSES.contains(task.getStatus()));
    }

    private void completeApprovalTasks(UUID tenantId, UUID dealId) {
        List<Task> approvalTasks = taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
                tenantId,
                "deal_approval",
                dealId
        );
        boolean changed = false;
        for (Task task : approvalTasks) {
            if (OPEN_TASK_STATUSES.contains(task.getStatus())) {
                task.setStatus(TaskStatus.COMPLETED);
                changed = true;
            }
        }
        if (changed) {
            taskRepository.saveAll(approvalTasks);
        }
    }

    private int attentionRank(Deal deal, WorkflowRule rescueWorkflow) {
        int rank = 0;
        if (Boolean.TRUE.equals(rescueWorkflow.getReviewHighRiskDeals()) && deal.getRiskLevel() == DealRiskLevel.HIGH) {
            rank += 3;
        }
        if (isStalledDeal(deal, rescueWorkflow)) {
            rank += 2;
        }
        if (isOverdueNextStep(deal, rescueWorkflow)) {
            rank += 2;
        }
        if (Boolean.TRUE.equals(rescueWorkflow.getReviewTerritoryMismatch()) && hasTerritoryMismatch(deal)) {
            rank += 1;
        }
        return rank;
    }

    private User resolveApprovalAssignee(UUID tenantId, User requester, UUID ownerId) {
        List<User> approvers = userRepository.findByTenantIdAndRoleInAndIsActiveTrueAndArchivedFalse(
                tenantId,
                List.of(UserRole.MANAGER, UserRole.ADMIN)
        );
        if (!approvers.isEmpty()) {
            return approvers.stream()
                    .sorted(Comparator
                            .comparing((User user) -> user.getRole() == UserRole.MANAGER ? 0 : 1)
                            .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .filter(user -> requester == null || !user.getId().equals(requester.getId()) || approvers.size() == 1)
                    .findFirst()
                    .orElse(approvers.get(0));
        }
        if (ownerId != null) {
            return userRepository.findByIdAndTenantIdAndArchivedFalse(ownerId, tenantId).orElse(requester);
        }
        return requester;
    }

    private User getCurrentUser() {
        UUID tenantId = TenantContext.getTenantId();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BadRequestException("Authenticated user context is required");
        }
        return userRepository.findByTenantIdAndEmailAndArchivedFalse(tenantId, authentication.getName())
                .orElseThrow(() -> new BadRequestException("Current user could not be resolved for this tenant"));
    }

    private String normalizeNotes(String notes) {
        return notes == null || notes.isBlank() ? null : notes.trim();
    }

    private Deal getTenantDeal(UUID tenantId, UUID id) {
        return dealRepository.findById(id)
                .filter(d -> d.getTenantId().equals(tenantId) && !d.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Deal", id));
    }

    private void clearApprovalState(Deal deal) {
        deal.setApprovalStatus(DealApprovalStatus.NONE);
        deal.setApprovalRequestedAt(null);
        deal.setApprovalRequestedBy(null);
        deal.setApprovedAt(null);
        deal.setApprovedBy(null);
        deal.setRejectedAt(null);
        deal.setRejectedBy(null);
        deal.setApprovalNotes(null);
    }

    private String buildRescueTaskDescription(Deal deal, WorkflowRule rescueWorkflow) {
        StringBuilder description = new StringBuilder("Review stalled deal and recover momentum.");
        if (deal.getCompanyName() != null) {
            description.append(" Account: ").append(deal.getCompanyName()).append(".");
        }
        if (deal.getNextStep() != null && !deal.getNextStep().isBlank()) {
            description.append(" Last next step: ").append(deal.getNextStep()).append(".");
        }
        if (isStalledDeal(deal, rescueWorkflow)) {
            description.append(" Deal has been in ").append(deal.getStage().name()).append(" for more than ")
                    .append(rescueWorkflow.getStalledDealDays()).append(" days.");
        }
        if (isOverdueNextStep(deal, rescueWorkflow) && deal.getNextStepDueDate() != null) {
            description.append(" Next step due date ").append(deal.getNextStepDueDate()).append(" is overdue.");
        }
        if (Boolean.TRUE.equals(rescueWorkflow.getReviewHighRiskDeals()) && deal.getRiskLevel() == DealRiskLevel.HIGH) {
            description.append(" Current risk level is HIGH.");
        }
        if (Boolean.TRUE.equals(rescueWorkflow.getReviewTerritoryMismatch()) && hasTerritoryMismatch(deal)) {
            description.append(" Owner territory does not match deal territory.");
        }
        return description.toString();
    }

    private void applyTerritory(Deal deal, DealRequestDTO request, Company company) {
        String territory = normalizeTerritory(request.getTerritory());
        if (territory == null && company != null) {
            territory = normalizeTerritory(company.getTerritory());
        }
        if (territory == null && company != null) {
            territory = inferCompanyTerritory(company);
        }
        deal.setTerritory(territory);
    }

    private UUID resolveDefaultOwnerId(UUID tenantId, Company company, String territory) {
        if (company != null && company.getOwnerId() != null) {
            User companyOwner = userRepository.findByIdAndTenantIdAndArchivedFalse(company.getOwnerId(), tenantId)
                    .filter(User::getIsActive)
                    .orElse(null);
            if (companyOwner != null && (!hasText(territory) || territoryMatches(companyOwner.getTerritory(), territory))) {
                return companyOwner.getId();
            }
        }
        return selectBestOwnerId(tenantId, territory);
    }

    private UUID selectBestOwnerId(UUID tenantId, String territory) {
        List<User> allCandidates = userRepository.findByTenantIdAndIsActiveTrueAndArchivedFalse(tenantId).stream()
                .filter(user -> user.getRole() == UserRole.SALES_REP || user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN)
                .toList();

        List<User> candidates = allCandidates;
        if (hasText(territory)) {
            List<User> territoryMatched = allCandidates.stream()
                    .filter(user -> territoryMatches(user.getTerritory(), territory))
                    .toList();
            if (!territoryMatched.isEmpty()) {
                candidates = territoryMatched;
            }
        }

        if (candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
                .sorted(Comparator
                        .comparingInt((User user) -> roleRank(user.getRole()))
                        .thenComparingLong(user -> activeDealCount(tenantId, user.getId()))
                        .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .findFirst()
                .map(User::getId)
                .orElse(null);
    }

    private long activeDealCount(UUID tenantId, UUID ownerId) {
        return dealRepository.countByTenantIdAndOwnerIdAndArchivedFalseAndStageNotIn(tenantId, ownerId, CLOSED_DEAL_STAGES);
    }

    private int roleRank(UserRole role) {
        return switch (role) {
            case SALES_REP -> 0;
            case MANAGER -> 1;
            case ADMIN -> 2;
            default -> 3;
        };
    }

    private void validateOwner(UUID tenantId, UUID ownerId) {
        userRepository.findByIdAndTenantIdAndArchivedFalse(ownerId, tenantId)
                .filter(User::getIsActive)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
    }

    private boolean hasTerritoryMismatch(Deal deal) {
        return hasText(deal.getTerritory())
                && deal.getOwner() != null
                && hasText(deal.getOwner().getTerritory())
                && !territoryMatches(deal.getOwner().getTerritory(), deal.getTerritory());
    }

    private boolean territoryMatches(String ownerTerritory, String dealTerritory) {
        return normalizeTerritory(ownerTerritory) != null
                && normalizeTerritory(ownerTerritory).equalsIgnoreCase(normalizeTerritory(dealTerritory));
    }

    private String inferCompanyTerritory(Company company) {
        if (hasText(company.getTerritory())) {
            return normalizeTerritory(company.getTerritory());
        }
        if (hasText(company.getCountry())) {
            return normalizeTerritory(company.getCountry());
        }
        if (company.getParentCompany() != null && hasText(company.getParentCompany().getTerritory())) {
            return normalizeTerritory(company.getParentCompany().getTerritory());
        }
        if (hasText(company.getState())) {
            return normalizeTerritory(company.getState());
        }
        if (hasText(company.getCity())) {
            return normalizeTerritory(company.getCity());
        }
        return null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }

    private void recordDealRescueRun(
            UUID tenantId,
            String runStatus,
            Integer reviewedDeals,
            Integer rescueTasksCreated,
            Integer alreadyCoveredDeals,
            String summary
    ) {
        automationRunService.recordRun(
                tenantId,
                DEAL_RESCUE_AUTOMATION_KEY,
                DEAL_RESCUE_AUTOMATION_NAME,
                TRIGGER_SOURCE_MANUAL,
                runStatus,
                reviewedDeals,
                rescueTasksCreated,
                alreadyCoveredDeals,
                summary
        );
    }

    private Integer getDefaultProbabilityForStage(DealStage stage) {
        return switch (stage) {
            case PROSPECTING -> 5;
            case QUALIFICATION -> 10;
            case PROPOSAL -> 50;
            case NEGOTIATION -> 75;
            case CLOSED_WON -> 100;
            case CLOSED_LOST -> 0;
        };
    }
}
