package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.CompanyFilterDTO;
import com.crm.dto.request.CompanyRequestDTO;
import com.crm.dto.request.CompanyTerritoryReassignmentRequestDTO;
import com.crm.dto.response.CompanyInsightsResponseDTO;
import com.crm.dto.response.CompanyOpportunityInsightDTO;
import com.crm.dto.response.CompanyResponseDTO;
import com.crm.dto.response.CompanyTerritoryQueueItemDTO;
import com.crm.dto.response.CompanyTerritoryQueueSummaryDTO;
import com.crm.dto.response.CompanyTerritoryReassignmentResultDTO;
import com.crm.dto.response.IntegrationSyncResultDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Deal;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.enums.CompanyStatus;
import com.crm.entity.enums.DealRiskLevel;
import com.crm.entity.enums.DealStage;
import com.crm.entity.enums.InfluenceLevel;
import com.crm.entity.enums.StakeholderRole;
import com.crm.entity.enums.UserRole;
import com.crm.entity.enums.TaskStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.CompanyMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.DealRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import com.crm.security.RecordAccessService;
import com.crm.service.CompanyService;
import com.crm.service.CustomerDataGovernancePolicy;
import com.crm.service.WorkspaceErpSyncService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final ContactRepository contactRepository;
    private final DealRepository dealRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CustomerDataGovernancePolicy customerDataGovernancePolicy;
    private final RecordAccessService recordAccessService;
    private final WorkspaceErpSyncService workspaceErpSyncService;

    private static final EnumSet<TaskStatus> OPEN_TASK_STATUSES = EnumSet.of(
            TaskStatus.PENDING,
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS
    );

    @Override
    @Transactional(readOnly = true)
    public Page<CompanyResponseDTO> findAll(Pageable pageable, CompanyFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Company>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        Specification<Company> accessScope = recordAccessService.companyReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), search),
                    cb.like(cb.lower(root.get("email")), search),
                    cb.like(cb.lower(root.get("website")), search)
                ));
            }
            
            if (filter.getIndustry() != null) {
                specs.add(SpecificationBuilder.equal("industry", filter.getIndustry()));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getMinRevenue() != null) {
                specs.add(SpecificationBuilder.greaterThan("revenue", filter.getMinRevenue()));
            }
            
            if (filter.getMaxRevenue() != null) {
                specs.add(SpecificationBuilder.lessThan("revenue", filter.getMaxRevenue()));
            }
            
            if (filter.getMinEmployeeCount() != null) {
                specs.add(SpecificationBuilder.greaterThan("employeeCount", filter.getMinEmployeeCount()));
            }
            
            if (filter.getMaxEmployeeCount() != null) {
                specs.add(SpecificationBuilder.lessThan("employeeCount", filter.getMaxEmployeeCount()));
            }
            
            if (filter.getCity() != null) {
                specs.add(SpecificationBuilder.equal("city", filter.getCity()));
            }
            
            if (filter.getState() != null) {
                specs.add(SpecificationBuilder.equal("state", filter.getState()));
            }
            
            if (filter.getCountry() != null) {
                specs.add(SpecificationBuilder.equal("country", filter.getCountry()));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            }
        }
        
        Specification<Company> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Company> companies = companyRepository.findAll(spec, pageable);
        
        return companies.map(companyMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        recordAccessService.assertCanViewCompany(company);
        
        return companyMapper.toDto(company);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyInsightsResponseDTO getInsights(UUID id) {
        UUID tenantId = TenantContext.getTenantId();

        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        recordAccessService.assertCanViewCompany(company);

        List<Contact> contacts = contactRepository.findByTenantIdAndCompanyIdAndArchivedFalse(tenantId, id);
        List<Deal> deals = dealRepository.findByTenantIdAndCompanyIdAndArchivedFalse(tenantId, id);
        List<UUID> dealIds = deals.stream().map(Deal::getId).toList();

        List<Task> relatedTasks = new ArrayList<>(taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
                tenantId,
                "company",
                id
        ));
        if (!dealIds.isEmpty()) {
            relatedTasks.addAll(taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdInAndArchivedFalse(
                    tenantId,
                    "deal",
                    dealIds
            ));
        }

        LocalDate today = LocalDate.now();
        LocalDateTime stalledCutoff = LocalDateTime.now().minusDays(14);

        long primaryStakeholders = contacts.stream().filter(contact -> Boolean.TRUE.equals(contact.getIsPrimary())).count();
        long decisionMakers = contacts.stream().filter(contact -> contact.getStakeholderRole() == StakeholderRole.DECISION_MAKER).count();
        long highInfluenceContacts = contacts.stream().filter(contact -> contact.getInfluenceLevel() == InfluenceLevel.HIGH).count();

        List<Deal> activeDeals = deals.stream()
                .filter(this::isActiveDeal)
                .toList();
        long highRiskDeals = activeDeals.stream().filter(deal -> deal.getRiskLevel() == DealRiskLevel.HIGH).count();
        long stalledDeals = activeDeals.stream()
                .filter(deal -> deal.getStageChangedAt() != null && deal.getStageChangedAt().isBefore(stalledCutoff))
                .count();
        long overdueNextSteps = activeDeals.stream()
                .filter(deal -> deal.getNextStepDueDate() != null && deal.getNextStepDueDate().isBefore(today))
                .count();
        long territoryMismatchDeals = activeDeals.stream()
                .filter(this::hasTerritoryMismatch)
                .count();
        boolean companyTerritoryMismatch = hasTerritoryMismatch(company);

        long openTasks = relatedTasks.stream().filter(this::isOpenTask).count();
        long overdueTasks = relatedTasks.stream()
                .filter(task -> isOpenTask(task) && task.getDueDate() != null && task.getDueDate().isBefore(today))
                .count();

        BigDecimal pipelineValue = activeDeals.stream()
                .map(Deal::getValue)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal weightedPipelineValue = activeDeals.stream()
                .map(Deal::getWeightedValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Set<StakeholderRole> expectedRoles = EnumSet.of(
                StakeholderRole.EXECUTIVE_SPONSOR,
                StakeholderRole.DECISION_MAKER,
                StakeholderRole.CHAMPION,
                StakeholderRole.TECHNICAL_EVALUATOR,
                StakeholderRole.PROCUREMENT
        );
        Set<StakeholderRole> presentRoles = contacts.stream()
                .map(Contact::getStakeholderRole)
                .filter(role -> role != null && expectedRoles.contains(role))
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(StakeholderRole.class)));
        List<String> missingStakeholderRoles = expectedRoles.stream()
                .filter(role -> !presentRoles.contains(role))
                .map(this::formatStakeholderRole)
                .toList();

        int stakeholderCoveragePercent = expectedRoles.isEmpty()
                ? 100
                : (int) Math.round((presentRoles.size() * 100.0) / expectedRoles.size());
        int healthScore = calculateHealthScore(
                primaryStakeholders,
                decisionMakers,
                highInfluenceContacts,
                activeDeals.size(),
                highRiskDeals,
                stalledDeals,
                overdueNextSteps,
                overdueTasks,
                stakeholderCoveragePercent,
                territoryMismatchDeals,
                companyTerritoryMismatch
        );

        List<String> recommendedActions = buildRecommendedActions(
                missingStakeholderRoles,
                highRiskDeals,
                stalledDeals,
                overdueNextSteps,
                overdueTasks,
                activeDeals.size(),
                territoryMismatchDeals,
                companyTerritoryMismatch
        );

        List<CompanyOpportunityInsightDTO> opportunities = activeDeals.stream()
                .sorted(Comparator.comparing(Deal::getValue, Comparator.nullsLast(BigDecimal::compareTo)).reversed())
                .limit(5)
                .map(deal -> CompanyOpportunityInsightDTO.builder()
                        .dealId(deal.getId())
                        .dealName(deal.getName())
                        .stage(deal.getStage() != null ? deal.getStage().name() : null)
                        .value(deal.getValue())
                        .probability(deal.getProbability())
                        .weightedValue(deal.getWeightedValue())
                        .riskLevel(deal.getRiskLevel() != null ? deal.getRiskLevel().name() : null)
                        .ownerName(deal.getOwner() != null ? deal.getOwner().getFullName() : null)
                        .nextStep(deal.getNextStep())
                        .nextStepDueDate(deal.getNextStepDueDate())
                        .stalled(deal.getStageChangedAt() != null && deal.getStageChangedAt().isBefore(stalledCutoff))
                        .overdueNextStep(deal.getNextStepDueDate() != null && deal.getNextStepDueDate().isBefore(today))
                        .build())
                .toList();

        return CompanyInsightsResponseDTO.builder()
                .companyId(company.getId())
                .companyName(company.getName())
                .parentCompanyName(company.getParentCompanyName())
                .territory(company.getTerritory())
                .ownerTerritory(company.getOwner() != null ? company.getOwner().getTerritory() : null)
                .territoryMismatch(companyTerritoryMismatch)
                .territoryMismatchDeals(territoryMismatchDeals)
                .childCompanyCount(company.getChildCompanies() != null ? company.getChildCompanies().size() : 0)
                .totalContacts(contacts.size())
                .primaryStakeholders(primaryStakeholders)
                .decisionMakers(decisionMakers)
                .highInfluenceContacts(highInfluenceContacts)
                .activeDeals(activeDeals.size())
                .highRiskDeals(highRiskDeals)
                .stalledDeals(stalledDeals)
                .overdueNextSteps(overdueNextSteps)
                .openTasks(openTasks)
                .overdueTasks(overdueTasks)
                .pipelineValue(pipelineValue)
                .weightedPipelineValue(weightedPipelineValue)
                .stakeholderCoveragePercent(stakeholderCoveragePercent)
                .healthScore(healthScore)
                .healthStatus(resolveHealthStatus(healthScore))
                .missingStakeholderRoles(missingStakeholderRoles)
                .recommendedActions(recommendedActions)
                .opportunities(opportunities)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyTerritoryQueueSummaryDTO getTerritoryGovernanceQueue() {
        UUID tenantId = TenantContext.getTenantId();
        List<Company> companies = companyRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(this::hasTerritoryMismatch)
                .filter(recordAccessService::canViewCompany)
                .sorted(Comparator.comparingInt(this::territoryPriorityRank).reversed()
                        .thenComparing(Company::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<UUID> companyIds = companies.stream().map(Company::getId).filter(Objects::nonNull).toList();
        Map<UUID, List<Task>> tasksByCompany = companyIds.isEmpty()
                ? Map.of()
                : taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdInAndArchivedFalse(tenantId, "company", companyIds)
                .stream()
                .collect(Collectors.groupingBy(Task::getRelatedEntityId));

        List<CompanyTerritoryQueueItemDTO> items = companies.stream()
                .map(company -> toTerritoryQueueItem(company, tasksByCompany.getOrDefault(company.getId(), List.of())))
                .toList();

        return CompanyTerritoryQueueSummaryDTO.builder()
                .mismatchCount((long) items.size())
                .highPriorityCount(items.stream().filter(item -> item.getPriorityRank() != null && item.getPriorityRank() >= 4).count())
                .companies(items)
                .build();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public CompanyTerritoryReassignmentResultDTO reassignTerritoryMismatches(CompanyTerritoryReassignmentRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        List<Company> companies = resolveCompaniesForReassignment(tenantId, request);
        companies = companies.stream()
                .filter(recordAccessService::canWriteCompany)
                .toList();

        int reviewedCompanies = 0;
        int reassignedCompanies = 0;
        int alignedDeals = 0;
        int skippedCompanies = 0;
        List<UUID> updatedCompanyIds = new ArrayList<>();
        List<UUID> updatedDealIds = new ArrayList<>();

        for (Company company : companies) {
            if (!hasTerritoryMismatch(company)) {
                skippedCompanies++;
                continue;
            }

            reviewedCompanies++;
            UUID suggestedOwnerId = selectBestOwnerId(tenantId, company.getTerritory());
            if (suggestedOwnerId == null || suggestedOwnerId.equals(company.getOwnerId())) {
                skippedCompanies++;
                continue;
            }

            User suggestedOwner = validateOwner(tenantId, suggestedOwnerId);
            company.setOwnerId(suggestedOwnerId);
            companyRepository.save(company);
            reassignedCompanies++;
            updatedCompanyIds.add(company.getId());

            List<Deal> activeDeals = dealRepository.findByTenantIdAndCompanyIdAndArchivedFalse(tenantId, company.getId())
                    .stream()
                    .filter(this::isActiveDeal)
                    .toList();

            for (Deal deal : activeDeals) {
                if (deal.getOwnerId() != null && deal.getOwnerId().equals(suggestedOwnerId) && !hasTerritoryMismatch(deal)) {
                    continue;
                }
                if (territoryMatches(suggestedOwner.getTerritory(), deal.getTerritory()) == Boolean.FALSE) {
                    continue;
                }
                deal.setOwnerId(suggestedOwnerId);
                dealRepository.save(deal);
                alignedDeals++;
                updatedDealIds.add(deal.getId());
            }
        }

        return CompanyTerritoryReassignmentResultDTO.builder()
                .reviewedCompanies(reviewedCompanies)
                .reassignedCompanies(reassignedCompanies)
                .alignedDeals(alignedDeals)
                .skippedCompanies(skippedCompanies)
                .updatedCompanyIds(updatedCompanyIds)
                .updatedDealIds(updatedDealIds)
                .build();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public CompanyResponseDTO create(CompanyRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyMapper.toEntity(request);
        company.setTenantId(tenantId);
        company.setOwnerId(recordAccessService.resolveAssignableOwnerId(company.getOwnerId()));
        applyHierarchy(tenantId, company, request.getParentCompanyId(), null);
        applyTerritory(company, request.getTerritory());
        customerDataGovernancePolicy.applyCompanyGovernance(company, request);
        
        company = companyRepository.save(company);
        company = companyRepository.findById(company.getId()).orElse(company);
        log.info("Created company: {} for tenant: {}", company.getId(), tenantId);
        
        return findById(company.getId());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public CompanyResponseDTO update(UUID id, CompanyRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        recordAccessService.assertCanWriteCompany(company);
        
        companyMapper.updateEntity(request, company);
        company.setOwnerId(recordAccessService.resolveAssignableOwnerId(company.getOwnerId()));
        applyHierarchy(tenantId, company, request.getParentCompanyId(), id);
        applyTerritory(company, request.getTerritory());
        customerDataGovernancePolicy.applyCompanyGovernance(company, request);
        company = companyRepository.save(company);
        company = companyRepository.findById(company.getId()).orElse(company);
        
        log.info("Updated company: {} for tenant: {}", id, tenantId);
        
        return findById(company.getId());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Company company = companyRepository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        recordAccessService.assertCanWriteCompany(company);
        
        company.setArchived(true);
        companyRepository.save(company);
        
        log.info("Deleted (archived) company: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Company> companies = companyRepository.findAllById(ids).stream()
                .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                .filter(recordAccessService::canWriteCompany)
                .collect(Collectors.toList());
        
        if (companies.isEmpty()) {
            throw new BadRequestException("No valid companies found for deletion");
        }
        
        companies.forEach(company -> company.setArchived(true));
        companyRepository.saveAll(companies);
        
        log.info("Bulk deleted {} companies for tenant: {}", companies.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyResponseDTO> searchByName(String name) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Company> companies = companyRepository.searchByName(tenantId, "%" + name.toLowerCase() + "%");
        return companies.stream()
                .filter(recordAccessService::canViewCompany)
                .map(companyMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"companies", "dashboard-metrics"}, allEntries = true)
    public IntegrationSyncResultDTO syncToErp(UUID id, String providerKey) {
        Company company = companyRepository.findById(id)
                .filter(item -> TenantContext.getTenantId().equals(item.getTenantId()) && !item.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
        recordAccessService.assertCanWriteCompany(company);
        return workspaceErpSyncService.exportCompany(id, providerKey);
    }

    private List<Company> resolveCompaniesForReassignment(UUID tenantId, CompanyTerritoryReassignmentRequestDTO request) {
        if (request == null || request.getCompanyIds() == null || request.getCompanyIds().isEmpty()) {
            return companyRepository.findByTenantIdAndArchivedFalse(tenantId, Pageable.unpaged())
                    .getContent()
                    .stream()
                    .filter(this::hasTerritoryMismatch)
                    .toList();
        }

        return request.getCompanyIds().stream()
                .map(id -> companyRepository.findById(id)
                        .filter(company -> company.getTenantId().equals(tenantId) && !company.getArchived())
                        .orElseThrow(() -> new ResourceNotFoundException("Company", id)))
                .toList();
    }

    private void applyHierarchy(UUID tenantId, Company company, UUID parentCompanyId, UUID currentCompanyId) {
        if (parentCompanyId == null) {
            company.setParentCompanyId(null);
            company.setParentCompany(null);
            return;
        }

        if (currentCompanyId != null && currentCompanyId.equals(parentCompanyId)) {
            throw new BadRequestException("A company cannot be its own parent");
        }

        Company parentCompany = companyRepository.findById(parentCompanyId)
                .filter(candidate -> candidate.getTenantId().equals(tenantId) && !candidate.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Company", parentCompanyId));

        UUID ancestorId = parentCompany.getParentCompanyId();
        while (ancestorId != null) {
            if (currentCompanyId != null && currentCompanyId.equals(ancestorId)) {
                throw new BadRequestException("Company hierarchy cannot contain cycles");
            }

            UUID nextAncestorId = ancestorId;
            Company ancestor = companyRepository.findById(nextAncestorId)
                    .filter(candidate -> candidate.getTenantId().equals(tenantId) && !candidate.getArchived())
                    .orElse(null);
            if (ancestor == null) {
                break;
            }
            ancestorId = ancestor.getParentCompanyId();
        }

        company.setParentCompanyId(parentCompany.getId());
        company.setParentCompany(parentCompany);
    }

    private void applyTerritory(Company company, String requestedTerritory) {
        String territory = normalizeTerritory(requestedTerritory);
        if (territory == null) {
            territory = inferCompanyTerritory(company);
        }
        company.setTerritory(territory);
        if (company.getStatus() == null) {
            company.setStatus(CompanyStatus.ACTIVE);
        }
    }

    private CompanyTerritoryQueueItemDTO toTerritoryQueueItem(Company company, List<Task> companyTasks) {
        UUID tenantId = TenantContext.getTenantId();
        UUID suggestedOwnerId = selectBestOwnerId(tenantId, company.getTerritory());
        if (suggestedOwnerId != null && suggestedOwnerId.equals(company.getOwnerId())) {
            suggestedOwnerId = null;
        }
        User suggestedOwner = suggestedOwnerId == null
                ? null
                : userRepository.findByIdAndTenantIdAndArchivedFalse(suggestedOwnerId, tenantId).orElse(null);

        List<Deal> activeDeals = company.getDeals() == null
                ? List.of()
                : company.getDeals().stream().filter(this::isActiveDeal).toList();
        long mismatchDeals = activeDeals.stream().filter(this::hasTerritoryMismatch).count();
        long openTaskCount = companyTasks.stream().filter(this::isOpenTask).count();
        long overdueTaskCount = companyTasks.stream()
                .filter(task -> isOpenTask(task) && task.getDueDate() != null && task.getDueDate().isBefore(LocalDate.now()))
                .count();
        BigDecimal pipelineValue = activeDeals.stream()
                .map(Deal::getValue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CompanyTerritoryQueueItemDTO.builder()
                .companyId(company.getId())
                .companyName(company.getName())
                .territory(company.getTerritory())
                .currentOwnerName(company.getOwner() != null ? company.getOwner().getFullName() : null)
                .currentOwnerTerritory(company.getOwner() != null ? company.getOwner().getTerritory() : null)
                .suggestedOwnerId(suggestedOwnerId)
                .suggestedOwnerName(suggestedOwner != null ? suggestedOwner.getFullName() : null)
                .suggestedOwnerTerritory(suggestedOwner != null ? suggestedOwner.getTerritory() : null)
                .activeDealCount((long) activeDeals.size())
                .territoryMismatchDealCount(mismatchDeals)
                .openTaskCount(openTaskCount)
                .overdueTaskCount(overdueTaskCount)
                .childCompanyCount(company.getChildCompanies() != null ? (long) company.getChildCompanies().size() : 0L)
                .pipelineValue(pipelineValue)
                .priorityRank(territoryPriorityRank(company))
                .build();
    }

    private boolean isActiveDeal(Deal deal) {
        return deal.getStage() != DealStage.CLOSED_WON && deal.getStage() != DealStage.CLOSED_LOST;
    }

    private boolean isOpenTask(Task task) {
        return OPEN_TASK_STATUSES.contains(task.getStatus());
    }

    private boolean hasTerritoryMismatch(Company company) {
        return territoryMatches(company.getTerritory(), company.getOwner() != null ? company.getOwner().getTerritory() : null) == Boolean.FALSE;
    }

    private boolean hasTerritoryMismatch(Deal deal) {
        return territoryMatches(deal.getTerritory(), deal.getOwner() != null ? deal.getOwner().getTerritory() : null) == Boolean.FALSE;
    }

    private int territoryPriorityRank(Company company) {
        int rank = 0;
        if (hasTerritoryMismatch(company)) {
            rank += 3;
        }
        if (company.getDeals() != null) {
            rank += (int) Math.min(2, company.getDeals().stream().filter(this::hasTerritoryMismatch).count());
        }
        if (company.getChildCompanies() != null && !company.getChildCompanies().isEmpty()) {
            rank += 1;
        }
        return rank;
    }

    private UUID selectBestOwnerId(UUID tenantId, String territory) {
        List<User> allCandidates = userRepository.findByTenantIdAndIsActiveTrueAndArchivedFalse(tenantId).stream()
                .filter(user -> user.getRole() == UserRole.SALES_REP || user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN)
                .toList();

        List<User> candidates = allCandidates;
        if (normalizeTerritory(territory) != null) {
            List<User> territoryMatched = allCandidates.stream()
                    .filter(user -> territoryMatches(territory, user.getTerritory()) == Boolean.TRUE)
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
                        .thenComparingLong(user -> companyRepository.countByTenantIdAndOwnerIdAndArchivedFalse(tenantId, user.getId()))
                        .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(User::getId)
                .findFirst()
                .orElse(null);
    }

    private User validateOwner(UUID tenantId, UUID ownerId) {
        return userRepository.findByIdAndTenantIdAndArchivedFalse(ownerId, tenantId)
                .filter(User::getIsActive)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerId));
    }

    private int roleRank(UserRole role) {
        return switch (role) {
            case SALES_REP -> 0;
            case MANAGER -> 1;
            case ADMIN -> 2;
            default -> 3;
        };
    }

    private int calculateHealthScore(
            long primaryStakeholders,
            long decisionMakers,
            long highInfluenceContacts,
            long activeDeals,
            long highRiskDeals,
            long stalledDeals,
            long overdueNextSteps,
            long overdueTasks,
            int stakeholderCoveragePercent,
            long territoryMismatchDeals,
            boolean companyTerritoryMismatch
    ) {
        int score = 45;

        score += primaryStakeholders > 0 ? 12 : -12;
        score += decisionMakers > 0 ? 12 : -14;
        score += highInfluenceContacts > 1 ? 8 : highInfluenceContacts > 0 ? 4 : -8;
        score += activeDeals > 0 ? 10 : -4;
        score += stakeholderCoveragePercent >= 80 ? 8 : stakeholderCoveragePercent >= 50 ? 3 : -8;
        score -= (int) Math.min(18, highRiskDeals * 6);
        score -= (int) Math.min(18, stalledDeals * 9);
        score -= (int) Math.min(15, overdueNextSteps * 5);
        score -= (int) Math.min(15, overdueTasks * 5);
        score -= (int) Math.min(12, territoryMismatchDeals * 4);
        if (companyTerritoryMismatch) {
            score -= 6;
        }

        return Math.max(0, Math.min(100, score));
    }

    private String resolveHealthStatus(int healthScore) {
        if (healthScore >= 75) {
            return "HEALTHY";
        }
        if (healthScore >= 45) {
            return "WATCH";
        }
        return "AT_RISK";
    }

    private List<String> buildRecommendedActions(
            List<String> missingStakeholderRoles,
            long highRiskDeals,
            long stalledDeals,
            long overdueNextSteps,
            long overdueTasks,
            int activeDeals,
            long territoryMismatchDeals,
            boolean companyTerritoryMismatch
    ) {
        List<String> actions = new ArrayList<>();

        if (!missingStakeholderRoles.isEmpty()) {
            actions.add("Fill stakeholder gaps for " + String.join(", ", missingStakeholderRoles) + ".");
        }
        if (highRiskDeals > 0) {
            actions.add("Review high-risk opportunities and confirm deal recovery plans.");
        }
        if (stalledDeals > 0) {
            actions.add("Restart stalled deals with fresh executive outreach or stage requalification.");
        }
        if (overdueNextSteps > 0 || overdueTasks > 0) {
            actions.add("Clear overdue follow-up commitments before advancing the account plan.");
        }
        if (activeDeals == 0) {
            actions.add("Create or qualify a revenue opportunity before the account goes cold.");
        }
        if (companyTerritoryMismatch) {
            actions.add("Reassign the account owner or update the account territory so coverage matches the workspace territory model.");
        }
        if (territoryMismatchDeals > 0) {
            actions.add("Review deal ownership on this account because territory coverage is mismatched on " + territoryMismatchDeals + " open deal" + (territoryMismatchDeals == 1 ? "." : "s."));
        }

        if (actions.isEmpty()) {
            actions.add("Account coverage looks healthy. Keep buying committee updates and next steps current.");
        }

        return actions;
    }

    private String formatStakeholderRole(StakeholderRole role) {
        return role.name().toLowerCase().replace('_', ' ');
    }

    private Boolean territoryMatches(String expectedTerritory, String actualTerritory) {
        String normalizedExpected = normalizeTerritory(expectedTerritory);
        String normalizedActual = normalizeTerritory(actualTerritory);
        if (normalizedExpected == null || normalizedActual == null) {
            return null;
        }
        return normalizedExpected.equalsIgnoreCase(normalizedActual);
    }

    private String inferCompanyTerritory(Company company) {
        if (normalizeTerritory(company.getTerritory()) != null) {
            return normalizeTerritory(company.getTerritory());
        }
        if (normalizeTerritory(company.getCountry()) != null) {
            return normalizeTerritory(company.getCountry());
        }
        if (company.getParentCompany() != null && normalizeTerritory(company.getParentCompany().getTerritory()) != null) {
            return normalizeTerritory(company.getParentCompany().getTerritory());
        }
        if (normalizeTerritory(company.getState()) != null) {
            return normalizeTerritory(company.getState());
        }
        if (normalizeTerritory(company.getCity()) != null) {
            return normalizeTerritory(company.getCity());
        }
        return null;
    }

    private String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }
}
