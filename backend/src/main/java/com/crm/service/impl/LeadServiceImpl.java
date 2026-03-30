package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.LeadFilterDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.dto.response.LeadStatsDTO;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Lead;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.ContactStatus;
import com.crm.entity.enums.LeadStatus;
import com.crm.entity.enums.LeadSource;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.entity.enums.UserRole;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.LeadMapper;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import com.crm.service.LeadService;
import com.crm.service.WorkflowRuleService;
import com.crm.util.SpecificationBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadServiceImpl implements LeadService {

    private final LeadRepository leadRepository;
    private final ContactRepository contactRepository;
    private final CompanyRepository companyRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final LeadMapper leadMapper;
    private final WorkflowRuleService workflowRuleService;

    private static final EnumSet<LeadStatus> CLOSED_LEAD_STATUSES = EnumSet.of(
            LeadStatus.CONVERTED,
            LeadStatus.LOST,
            LeadStatus.UNQUALIFIED
    );

    private static final EnumSet<TaskStatus> OPEN_TASK_STATUSES = EnumSet.of(
            TaskStatus.PENDING,
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS
    );

    @Override
    @Transactional(readOnly = true)
    public Page<LeadResponseDTO> findAll(Pageable pageable, LeadFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Lead>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("firstName")), search),
                    cb.like(cb.lower(root.get("lastName")), search),
                    cb.like(cb.lower(root.get("email")), search),
                    cb.like(cb.lower(root.get("company")), search)
                ));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getSource() != null) {
                specs.add(SpecificationBuilder.equal("source", filter.getSource()));
            }
            
            if (filter.getMinScore() != null) {
                specs.add(SpecificationBuilder.greaterThan("score", filter.getMinScore()));
            }
            
            if (filter.getMaxScore() != null) {
                specs.add(SpecificationBuilder.lessThan("score", filter.getMaxScore()));
            }
            
            if (filter.getMinEstimatedValue() != null) {
                specs.add(SpecificationBuilder.greaterThan("estimatedValue", filter.getMinEstimatedValue()));
            }
            
            if (filter.getMaxEstimatedValue() != null) {
                specs.add(SpecificationBuilder.lessThan("estimatedValue", filter.getMaxEstimatedValue()));
            }
            
            if (filter.getLastContactDateFrom() != null && filter.getLastContactDateTo() != null) {
                specs.add(SpecificationBuilder.dateBetween("lastContactDate", 
                    filter.getLastContactDateFrom(), filter.getLastContactDateTo()));
            }
            
            if (filter.getOwnerId() != null) {
                specs.add(SpecificationBuilder.equal("ownerId", filter.getOwnerId()));
            }
        }
        
        Specification<Lead> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Lead> leads = leadRepository.findAll(spec, pageable);
        
        return leads.map(leadMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "lead", key = "#id")
    public LeadResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public LeadResponseDTO create(LeadRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadMapper.toEntity(request);
        lead.setTenantId(tenantId);

        applyLeadDefaults(tenantId, lead, request);
        lead = leadRepository.save(lead);
        ensureLeadFollowUpTask(tenantId, lead);
        hydrateLeadOwner(tenantId, lead);
        log.info("Created lead: {} for tenant: {}", lead.getId(), tenantId);
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "dashboard-metrics"}, key = "#id", allEntries = true)
    public LeadResponseDTO update(UUID id, LeadRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        
        leadMapper.updateEntity(request, lead);
        applyLeadDefaults(tenantId, lead, request);
        lead = leadRepository.save(lead);
        ensureLeadFollowUpTask(tenantId, lead);
        hydrateLeadOwner(tenantId, lead);
        
        log.info("Updated lead: {} for tenant: {}", id, tenantId);
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "dashboard-metrics"}, key = "#id", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        
        lead.setArchived(true);
        leadRepository.save(lead);
        
        log.info("Deleted (archived) lead: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Lead> leads = leadRepository.findAllById(ids).stream()
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .collect(Collectors.toList());
        
        if (leads.isEmpty()) {
            throw new BadRequestException("No valid leads found for deletion");
        }
        
        leads.forEach(lead -> lead.setArchived(true));
        leadRepository.saveAll(leads);
        
        log.info("Bulk deleted {} leads for tenant: {}", leads.size(), tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "contacts", "dashboard-metrics"}, allEntries = true)
    public UUID convertToContact(UUID leadId, UUID companyId) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(leadId)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", leadId));
        
        if (lead.getStatus() == LeadStatus.CONVERTED) {
            throw new BadRequestException("Lead is already converted");
        }
        
        // Verify company exists if provided
        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId)
                    .filter(c -> c.getTenantId().equals(tenantId) && !c.getArchived())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", companyId));
        }
        
        // Create contact from lead
        Contact contact = new Contact();
        contact.setTenantId(tenantId);
        contact.setFirstName(lead.getFirstName());
        contact.setLastName(lead.getLastName());
        contact.setEmail(lead.getEmail());
        contact.setPhone(lead.getPhone());
        contact.setTitle(lead.getTitle());
        contact.setStatus(ContactStatus.ACTIVE);
        contact.setNotes(lead.getNotes());
        contact.setLastContactDate(lead.getLastContactDate());
        
        if (company != null) {
            contact.setCompany(company);
        }
        
        contact = contactRepository.save(contact);
        
        // Update lead status to converted
        lead.setStatus(LeadStatus.CONVERTED);
        leadRepository.save(lead);
        
        log.info("Converted lead {} to contact {} for tenant: {}", leadId, contact.getId(), tenantId);
        
        return contact.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadResponseDTO> findHighScoringLeads(Integer minScore) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Lead> leads = leadRepository.findHighScoringLeads(tenantId, minScore);
        return leads.stream()
                .map(leadMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LeadStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        log.info("Getting lead statistics for tenant: {}", tenantId);
        
        List<Lead> allLeads = leadRepository.findByTenantIdAndArchivedFalse(tenantId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        log.info("Found {} leads for tenant {}", allLeads.size(), tenantId);
        
        Long totalLeads = (long) allLeads.size();
        
        Map<LeadStatus, Long> leadsByStatus = allLeads.stream()
                .collect(Collectors.groupingBy(Lead::getStatus, Collectors.counting()));
        
        Double totalEstimatedValue = allLeads.stream()
                .filter(l -> l.getEstimatedValue() != null)
                .mapToDouble(l -> l.getEstimatedValue().doubleValue())
                .sum();
        
        Double averageScore = allLeads.stream()
                .filter(l -> l.getScore() != null)
                .mapToInt(Lead::getScore)
                .average()
                .orElse(0.0);
        
        Long convertedLeads = leadsByStatus.getOrDefault(LeadStatus.CONVERTED, 0L);
        Double conversionRate = totalLeads > 0 ? (convertedLeads.doubleValue() / totalLeads) * 100 : 0.0;
        
        return LeadStatsDTO.builder()
                .totalLeads(totalLeads)
                .leadsByStatus(leadsByStatus)
                .totalEstimatedValue(java.math.BigDecimal.valueOf(totalEstimatedValue))
                .averageScore(averageScore)
                .leadsConvertedThisMonth(convertedLeads)
                .conversionRate(conversionRate)
                .build();
    }

    private void applyLeadDefaults(UUID tenantId, Lead lead, LeadRequestDTO request) {
        WorkflowRule workflowRule = workflowRuleService.resolveLeadIntakeWorkflow(tenantId);

        if (lead.getStatus() == null) {
            lead.setStatus(LeadStatus.NEW);
        }

        if (!hasText(lead.getTerritory())) {
            lead.setTerritory(inferLeadTerritory(lead));
        } else {
            lead.setTerritory(normalizeTerritory(lead.getTerritory()));
        }

        if (request.getScore() == null || lead.getScore() == null) {
            lead.setScore(calculateLeadScore(lead));
        }

        if (lead.getOwnerId() == null && Boolean.TRUE.equals(workflowRule.getIsActive()) && Boolean.TRUE.equals(workflowRule.getAutoAssignmentEnabled())) {
            lead.setOwnerId(selectBestOwnerId(
                    tenantId,
                    lead.getTerritory(),
                    Boolean.TRUE.equals(workflowRule.getPreferTerritoryMatch()),
                    Boolean.TRUE.equals(workflowRule.getFallbackToLoadBalance())
            ));
        } else {
            if (lead.getOwnerId() != null) {
                validateOwner(tenantId, lead.getOwnerId());
            }
        }
    }

    private void hydrateLeadOwner(UUID tenantId, Lead lead) {
        if (lead.getOwnerId() == null) {
            lead.setOwner(null);
            return;
        }

        User owner = userRepository.findById(lead.getOwnerId())
                .filter(user -> tenantId.equals(user.getTenantId()) && !Boolean.TRUE.equals(user.getArchived()))
                .orElse(null);
        lead.setOwner(owner);
    }

    private int calculateLeadScore(Lead lead) {
        int score = 20;

        if (hasText(lead.getEmail())) {
            score += 15;
            String email = lead.getEmail().toLowerCase();
            if (!email.endsWith("@gmail.com") && !email.endsWith("@yahoo.com") && !email.endsWith("@hotmail.com")) {
                score += 10;
            }
        }

        if (hasText(lead.getPhone())) {
            score += 10;
        }

        if (hasText(lead.getCompany())) {
            score += 15;
        }

        if (hasText(lead.getTitle())) {
            score += 10;
            String title = lead.getTitle().toLowerCase();
            if (title.contains("head") || title.contains("director") || title.contains("manager")
                    || title.contains("chief") || title.contains("owner") || title.contains("vp")) {
                score += 10;
            }
        }

        if (lead.getEstimatedValue() != null) {
            score += 10;
            if (lead.getEstimatedValue().doubleValue() >= 50000) {
                score += 10;
            } else if (lead.getEstimatedValue().doubleValue() >= 10000) {
                score += 5;
            }
        }

        if (lead.getSource() != null) {
            score += switch (lead.getSource()) {
                case REFERRAL -> 15;
                case EVENT -> 12;
                case WEBSITE -> 10;
                case SOCIAL_MEDIA -> 8;
                case OTHER -> 5;
                case COLD_CALL -> 3;
            };
        }

        if (lead.getTags() != null && lead.getTags().length > 0) {
            score += Math.min(lead.getTags().length * 2, 10);
        }

        return Math.max(0, Math.min(score, 100));
    }

    private UUID selectBestOwnerId(UUID tenantId, String territory, boolean preferTerritoryMatch, boolean fallbackToLoadBalance) {
        List<User> allCandidates = userRepository.findByTenantIdAndIsActiveTrueAndArchivedFalse(tenantId).stream()
                .filter(user -> user.getRole() == UserRole.SALES_REP || user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.ADMIN)
                .toList();

        List<User> candidates = allCandidates;
        if (preferTerritoryMatch && hasText(territory)) {
            List<User> territoryMatched = allCandidates.stream()
                    .filter(user -> territoryMatches(user.getTerritory(), territory))
                    .toList();
            if (!territoryMatched.isEmpty()) {
                candidates = territoryMatched;
            } else if (!fallbackToLoadBalance) {
                candidates = List.of();
            }
        }

        if (candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
                .sorted(Comparator
                        .comparingInt((User user) -> roleRank(user.getRole()))
                        .thenComparingLong(user -> activeLeadCount(tenantId, user.getId()))
                        .thenComparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .findFirst()
                .map(User::getId)
                .orElse(null);
    }

    private long activeLeadCount(UUID tenantId, UUID ownerId) {
        return leadRepository.countByTenantIdAndOwnerIdAndArchivedFalseAndStatusNotIn(tenantId, ownerId, CLOSED_LEAD_STATUSES);
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

    private void ensureLeadFollowUpTask(UUID tenantId, Lead lead) {
        WorkflowRule workflowRule = workflowRuleService.resolveLeadIntakeWorkflow(tenantId);
        if (lead.getId() == null || CLOSED_LEAD_STATUSES.contains(lead.getStatus())) {
            return;
        }
        if (!Boolean.TRUE.equals(workflowRule.getIsActive()) || !Boolean.TRUE.equals(workflowRule.getAutoFollowUpEnabled())) {
            return;
        }

        boolean taskAlreadyExists = taskRepository.existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
                tenantId,
                "lead",
                lead.getId(),
                OPEN_TASK_STATUSES
        );

        if (taskAlreadyExists) {
            return;
        }

        Task followUpTask = Task.builder()
                .title(buildFollowUpTaskTitle(lead, workflowRule))
                .description(buildFollowUpTaskDescription(lead))
                .dueDate(resolveFollowUpDueDate(lead, workflowRule))
                .priority(resolveTaskPriority(lead, workflowRule))
                .status(TaskStatus.TODO)
                .assignedTo(lead.getOwnerId())
                .relatedEntityType("lead")
                .relatedEntityId(lead.getId())
                .build();
        followUpTask.setTenantId(tenantId);
        taskRepository.save(followUpTask);
    }

    private String buildFollowUpTaskTitle(Lead lead, WorkflowRule workflowRule) {
        if (isFastTrackLead(lead, workflowRule)) {
            return "Fast-track follow-up for " + lead.getFullName();
        }
        return "Follow up with " + lead.getFullName();
    }

    private String buildFollowUpTaskDescription(Lead lead) {
        StringBuilder description = new StringBuilder("Review and contact this lead.");
        if (hasText(lead.getCompany())) {
            description.append(" Company: ").append(lead.getCompany()).append(".");
        }
        if (lead.getSource() != null) {
            description.append(" Source: ").append(lead.getSource().name()).append(".");
        }
        if (lead.getEstimatedValue() != null) {
            description.append(" Estimated value: $").append(lead.getEstimatedValue()).append(".");
        }
        if (hasText(lead.getTerritory())) {
            description.append(" Territory: ").append(lead.getTerritory()).append(".");
        }
        if (lead.getScore() != null) {
            description.append(" Score: ").append(lead.getScore()).append("/100.");
        }
        return description.toString();
    }

    private TaskPriority resolveTaskPriority(Lead lead, WorkflowRule workflowRule) {
        if (isFastTrackLead(lead, workflowRule)) {
            return workflowRule.getFastTrackTaskPriority();
        }
        return workflowRule.getDefaultTaskPriority();
    }

    private LocalDate resolveFollowUpDueDate(Lead lead, WorkflowRule workflowRule) {
        if (isFastTrackLead(lead, workflowRule)) {
            return LocalDate.now().plusDays(Math.max(0, workflowRule.getFastTrackFollowUpDays()));
        }
        if (lead.getSource() == LeadSource.REFERRAL || lead.getSource() == LeadSource.EVENT) {
            return LocalDate.now().plusDays(Math.max(0, workflowRule.getReferralFollowUpDays()));
        }
        return LocalDate.now().plusDays(Math.max(0, workflowRule.getDefaultFollowUpDays()));
    }

    private boolean isFastTrackLead(Lead lead, WorkflowRule workflowRule) {
        Integer scoreThreshold = workflowRule.getFastTrackScoreThreshold();
        BigDecimal valueThreshold = workflowRule.getFastTrackValueThreshold();
        return (lead.getScore() != null && scoreThreshold != null && lead.getScore() >= scoreThreshold)
                || (lead.getEstimatedValue() != null && valueThreshold != null && lead.getEstimatedValue().compareTo(valueThreshold) >= 0);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String inferLeadTerritory(Lead lead) {
        if (hasText(lead.getTerritory())) {
            return normalizeTerritory(lead.getTerritory());
        }

        String email = lead.getEmail() != null ? lead.getEmail().toLowerCase(Locale.ROOT) : "";
        if (email.endsWith(".zw")) {
            return "Zimbabwe";
        }
        if (email.endsWith(".za")) {
            return "South Africa";
        }
        if (email.endsWith(".co.uk") || email.endsWith(".uk")) {
            return "United Kingdom";
        }

        String phone = lead.getPhone() != null ? lead.getPhone().replace(" ", "") : "";
        if (phone.startsWith("+263")) {
            return "Zimbabwe";
        }
        if (phone.startsWith("+27")) {
            return "South Africa";
        }
        if (phone.startsWith("+44")) {
            return "United Kingdom";
        }
        if (phone.startsWith("+1")) {
            return "North America";
        }

        return null;
    }

    private boolean territoryMatches(String userTerritory, String leadTerritory) {
        return normalizeTerritory(userTerritory) != null
                && normalizeTerritory(userTerritory).equalsIgnoreCase(normalizeTerritory(leadTerritory));
    }

    private String normalizeTerritory(String territory) {
        return territory == null || territory.isBlank() ? null : territory.trim();
    }
}
