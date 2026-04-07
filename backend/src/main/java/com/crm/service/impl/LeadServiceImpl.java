package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.LeadFilterDTO;
import com.crm.dto.request.LeadRequestDTO;
import com.crm.dto.response.LeadResponseDTO;
import com.crm.dto.response.LeadStatsDTO;
import com.crm.entity.Campaign;
import com.crm.entity.Company;
import com.crm.entity.Contact;
import com.crm.entity.Lead;
import com.crm.entity.NurtureJourneyStep;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.AutomationEventType;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.ContactStatus;
import com.crm.entity.enums.LeadStatus;
import com.crm.entity.enums.LeadSource;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.entity.enums.UserRole;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.LeadMapper;
import com.crm.repository.CampaignRepository;
import com.crm.repository.CompanyRepository;
import com.crm.repository.ContactRepository;
import com.crm.repository.LeadRepository;
import com.crm.repository.NurtureJourneyStepRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import com.crm.security.RecordAccessService;
import com.crm.service.AutomationExecutionService;
import com.crm.service.AutomationExecutionTargets;
import com.crm.service.CustomerDataGovernancePolicy;
import com.crm.service.LeadService;
import com.crm.service.WorkflowRuleService;
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

    private static final String CAMPAIGN_NURTURE_TAG = "campaign-nurture";
    private static final String JOURNEY_TAG_PREFIX = "journey:";
    private static final String JOURNEY_STEP_TAG_PREFIX = "journey-step:";

    private final LeadRepository leadRepository;
    private final CampaignRepository campaignRepository;
    private final ContactRepository contactRepository;
    private final CompanyRepository companyRepository;
    private final TaskRepository taskRepository;
    private final NurtureJourneyStepRepository nurtureJourneyStepRepository;
    private final UserRepository userRepository;
    private final LeadMapper leadMapper;
    private final WorkflowRuleService workflowRuleService;
    private final CustomerDataGovernancePolicy customerDataGovernancePolicy;
    private final RecordAccessService recordAccessService;
    private final AutomationExecutionService automationExecutionService;

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
        Specification<Lead> accessScope = recordAccessService.leadReadScope();
        if (accessScope != null) {
            specs.add(accessScope);
        }
        
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
    public LeadResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        recordAccessService.assertCanViewLead(lead);
        
        return leadMapper.toDto(lead);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public LeadResponseDTO create(LeadRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadMapper.toEntity(request);
        lead.setTenantId(tenantId);
        lead.setOwnerId(recordAccessService.resolveAssignableOwnerId(lead.getOwnerId()));

        applyLeadDefaults(tenantId, lead, request);
        lead = leadRepository.save(lead);
        lead = applyAutomationRuleEvent(tenantId, lead, AutomationEventType.LEAD_CREATED);
        if (lead.getCampaignId() != null) {
            lead = applyAutomationRuleEvent(tenantId, lead, AutomationEventType.CAMPAIGN_ATTRIBUTED_LEAD);
        }
        ensureLeadFollowUpTask(tenantId, lead);
        syncCampaignAttributionMetrics(tenantId, lead.getCampaignId());
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
        recordAccessService.assertCanWriteLead(lead);
        UUID previousCampaignId = lead.getCampaignId();
        
        leadMapper.updateEntity(request, lead);
        lead.setOwnerId(recordAccessService.resolveAssignableOwnerId(lead.getOwnerId()));
        applyLeadDefaults(tenantId, lead, request);
        lead = leadRepository.save(lead);
        lead = applyAutomationRuleEvent(tenantId, lead, AutomationEventType.LEAD_UPDATED);
        if (lead.getCampaignId() != null) {
            lead = applyAutomationRuleEvent(tenantId, lead, AutomationEventType.CAMPAIGN_ATTRIBUTED_LEAD);
        }
        ensureLeadFollowUpTask(tenantId, lead);
        syncCampaignAttributionMetrics(tenantId, previousCampaignId);
        syncCampaignAttributionMetrics(tenantId, lead.getCampaignId());
        hydrateLeadOwner(tenantId, lead);
        
        log.info("Updated lead: {} for tenant: {}", id, tenantId);
        
        return leadMapper.toDto(lead);
    }

    private Lead applyAutomationRuleEvent(UUID tenantId, Lead lead, AutomationEventType eventType) {
        var automationOutcome = automationExecutionService.executeRealTimeRules(
                tenantId,
                eventType,
                AutomationExecutionTargets.builder().lead(lead).build()
        );
        if (automationOutcome.isMutatedTarget()) {
            lead = leadRepository.save(lead);
        }
        return lead;
    }

    @Override
    @Transactional
    @CacheEvict(value = {"lead", "dashboard-metrics"}, key = "#id", allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Lead lead = leadRepository.findById(id)
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        recordAccessService.assertCanWriteLead(lead);
        
        lead.setArchived(true);
        leadRepository.save(lead);
        syncCampaignAttributionMetrics(tenantId, lead.getCampaignId());
        
        log.info("Deleted (archived) lead: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboard-metrics", allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Lead> leads = leadRepository.findAllById(ids).stream()
                .filter(l -> l.getTenantId().equals(tenantId) && !l.getArchived())
                .filter(recordAccessService::canWriteLead)
                .collect(Collectors.toList());
        
        if (leads.isEmpty()) {
            throw new BadRequestException("No valid leads found for deletion");
        }
        
        leads.forEach(lead -> lead.setArchived(true));
        leadRepository.saveAll(leads);
        leads.stream()
                .map(Lead::getCampaignId)
                .distinct()
                .forEach(campaignId -> syncCampaignAttributionMetrics(tenantId, campaignId));
        
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
        recordAccessService.assertCanWriteLead(lead);
        
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
        contact.setMarketingConsent(lead.getMarketingConsent());
        contact.setConsentCapturedAt(lead.getConsentCapturedAt());
        contact.setConsentSource(lead.getConsentSource());
        contact.setPrivacyStatus(lead.getPrivacyStatus());
        contact.setDataQualityScore(lead.getDataQualityScore());
        contact.setEnrichmentStatus(lead.getEnrichmentStatus());
        contact.setEnrichmentLastCheckedAt(lead.getEnrichmentLastCheckedAt());
        
        if (company != null) {
            contact.setCompany(company);
            contact.setCompanyId(company.getId());
        }
        
        contact = contactRepository.save(contact);
        
        // Update lead status to converted
        lead.setStatus(LeadStatus.CONVERTED);
        leadRepository.save(lead);
        syncCampaignAttributionMetrics(tenantId, lead.getCampaignId());
        
        log.info("Converted lead {} to contact {} for tenant: {}", leadId, contact.getId(), tenantId);
        
        return contact.getId();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadResponseDTO> findHighScoringLeads(Integer minScore) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Lead> leads = leadRepository.findHighScoringLeads(tenantId, minScore);
        return leads.stream()
                .filter(recordAccessService::canViewLead)
                .map(leadMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LeadStatsDTO getStatistics() {
        UUID tenantId = TenantContext.getTenantId();
        log.info("Getting lead statistics for tenant: {}", tenantId);
        
        List<Lead> allLeads = leadRepository.findByTenantIdAndArchivedFalse(tenantId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        allLeads = allLeads.stream()
                .filter(recordAccessService::canViewLead)
                .toList();
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
        WorkflowRule campaignWorkflow = workflowRuleService.resolveCampaignNurtureWorkflow(tenantId);
        Campaign campaign = resolveCampaign(tenantId, request.getCampaignId(), lead.getCampaignId());
        lead.setCampaignId(campaign != null ? campaign.getId() : null);
        lead.setCampaign(campaign);

        if (lead.getStatus() == null) {
            lead.setStatus(LeadStatus.NEW);
        }

        customerDataGovernancePolicy.applyLeadGovernance(lead, request);

        if (!hasText(lead.getTerritory())) {
            lead.setTerritory(inferLeadTerritory(lead));
        } else {
            lead.setTerritory(normalizeTerritory(lead.getTerritory()));
        }

        if (request.getScore() == null || lead.getScore() == null) {
            lead.setScore(calculateLeadScore(lead, campaignWorkflow, campaign));
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

    private int calculateLeadScore(Lead lead, WorkflowRule campaignWorkflow, Campaign campaign) {
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

        if (isCampaignNurtureEligible(campaignWorkflow, campaign)) {
            score += Math.max(0, campaignWorkflow.getCampaignScoreBoost());
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
        WorkflowRule campaignWorkflow = workflowRuleService.resolveCampaignNurtureWorkflow(tenantId);
        NurtureJourneyStep journeyStep = resolveFirstJourneyStep(tenantId, lead, campaignWorkflow);
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
                .title(buildFollowUpTaskTitle(lead, workflowRule, campaignWorkflow, journeyStep))
                .description(buildFollowUpTaskDescription(lead, journeyStep))
                .dueDate(resolveFollowUpDueDate(lead, workflowRule, campaignWorkflow, journeyStep))
                .priority(resolveTaskPriority(lead, workflowRule, campaignWorkflow, journeyStep))
                .status(TaskStatus.TODO)
                .assignedTo(lead.getOwnerId())
                .relatedEntityType("lead")
                .relatedEntityId(lead.getId())
                .tags(buildJourneyTaskTags(lead, journeyStep))
                .build();
        followUpTask.setTenantId(tenantId);
        taskRepository.save(followUpTask);
    }

    private String buildFollowUpTaskTitle(Lead lead, WorkflowRule workflowRule, WorkflowRule campaignWorkflow, NurtureJourneyStep journeyStep) {
        if (journeyStep != null) {
            if (hasText(journeyStep.getTaskTitleTemplate())) {
                return applyJourneyTemplate(journeyStep.getTaskTitleTemplate(), lead, journeyStep);
            }
            return journeyStep.getName() + " for " + lead.getFullName();
        }
        if (isCampaignNurtureEligible(campaignWorkflow, lead.getCampaign())) {
            return "Campaign nurture follow-up for " + lead.getFullName();
        }
        if (isFastTrackLead(lead, workflowRule)) {
            return "Fast-track follow-up for " + lead.getFullName();
        }
        return "Follow up with " + lead.getFullName();
    }

    private String buildFollowUpTaskDescription(Lead lead, NurtureJourneyStep journeyStep) {
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
        if (lead.getCampaign() != null) {
            description.append(" Campaign: ").append(lead.getCampaign().getName()).append(".");
            if (journeyStep != null) {
                description.append(" Journey step: ").append(journeyStep.getName()).append(".");
                if (journeyStep.getChannel() != null) {
                    description.append(" Channel: ").append(journeyStep.getChannel().name()).append(".");
                }
                if (hasText(journeyStep.getObjective())) {
                    description.append(" Objective: ").append(journeyStep.getObjective()).append(".");
                }
                if (hasText(journeyStep.getCallToAction())) {
                    description.append(" CTA: ").append(journeyStep.getCallToAction()).append(".");
                }
                if (hasText(journeyStep.getTaskDescriptionTemplate())) {
                    description.append(" ").append(applyJourneyTemplate(journeyStep.getTaskDescriptionTemplate(), lead, journeyStep));
                }
            }
            if (Boolean.TRUE.equals(lead.getCampaign().getAutoEnrollNewLeads())) {
                if (lead.getCampaign().getNurtureTouchCount() != null && lead.getCampaign().getNurtureCadenceDays() != null) {
                    description.append(" Journey: ")
                            .append(lead.getCampaign().getNurtureTouchCount())
                            .append(" touches every ")
                            .append(lead.getCampaign().getNurtureCadenceDays())
                            .append(" day(s).");
                }
                if (hasText(lead.getCampaign().getPrimaryCallToAction())) {
                    description.append(" CTA: ").append(lead.getCampaign().getPrimaryCallToAction()).append(".");
                }
            }
        }
        if (lead.getScore() != null) {
            description.append(" Score: ").append(lead.getScore()).append("/100.");
        }
        return description.toString();
    }

    private TaskPriority resolveTaskPriority(Lead lead, WorkflowRule workflowRule, WorkflowRule campaignWorkflow, NurtureJourneyStep journeyStep) {
        if (journeyStep != null && journeyStep.getTaskPriority() != null) {
            return journeyStep.getTaskPriority();
        }
        if (isCampaignNurtureEligible(campaignWorkflow, lead.getCampaign())) {
            return campaignWorkflow.getCampaignTaskPriority();
        }
        if (isFastTrackLead(lead, workflowRule)) {
            return workflowRule.getFastTrackTaskPriority();
        }
        return workflowRule.getDefaultTaskPriority();
    }

    private LocalDate resolveFollowUpDueDate(Lead lead, WorkflowRule workflowRule, WorkflowRule campaignWorkflow, NurtureJourneyStep journeyStep) {
        if (journeyStep != null) {
            return LocalDate.now().plusDays(Math.max(0, journeyStep.getWaitDays()));
        }
        if (isCampaignNurtureEligible(campaignWorkflow, lead.getCampaign())) {
            return LocalDate.now().plusDays(Math.max(0, campaignWorkflow.getCampaignFollowUpDays()));
        }
        if (isFastTrackLead(lead, workflowRule)) {
            return LocalDate.now().plusDays(Math.max(0, workflowRule.getFastTrackFollowUpDays()));
        }
        if (lead.getSource() == LeadSource.REFERRAL || lead.getSource() == LeadSource.EVENT) {
            return LocalDate.now().plusDays(Math.max(0, workflowRule.getReferralFollowUpDays()));
        }
        return LocalDate.now().plusDays(Math.max(0, workflowRule.getDefaultFollowUpDays()));
    }

    private NurtureJourneyStep resolveFirstJourneyStep(UUID tenantId, Lead lead, WorkflowRule campaignWorkflow) {
        Campaign campaign = lead.getCampaign();
        if (!isCampaignNurtureEligible(campaignWorkflow, campaign) || campaign == null || campaign.getJourneyId() == null) {
            return null;
        }
        return nurtureJourneyStepRepository.findFirstByJourneyIdAndTenantIdAndIsActiveTrueAndArchivedFalseOrderBySequenceOrderAsc(
                campaign.getJourneyId(),
                tenantId
        ).orElse(null);
    }

    private String[] buildJourneyTaskTags(Lead lead, NurtureJourneyStep journeyStep) {
        if (journeyStep == null || lead.getCampaign() == null || lead.getCampaign().getJourneyId() == null) {
            return null;
        }
        return new String[] {
                CAMPAIGN_NURTURE_TAG,
                JOURNEY_TAG_PREFIX + lead.getCampaign().getJourneyId(),
                JOURNEY_STEP_TAG_PREFIX + journeyStep.getId()
        };
    }

    private String applyJourneyTemplate(String template, Lead lead, NurtureJourneyStep journeyStep) {
        if (!hasText(template)) {
            return template;
        }
        Campaign campaign = lead.getCampaign();
        return template
                .replace("{leadName}", safeText(lead.getFullName(), "this lead"))
                .replace("{firstName}", safeText(lead.getFirstName(), "Lead"))
                .replace("{lastName}", safeText(lead.getLastName(), ""))
                .replace("{company}", safeText(lead.getCompany(), "their company"))
                .replace("{campaignName}", campaign != null ? safeText(campaign.getName(), "this campaign") : "this campaign")
                .replace("{stepName}", safeText(journeyStep.getName(), "journey step"))
                .replace("{objective}", safeText(journeyStep.getObjective(), "advance the opportunity"))
                .replace("{callToAction}", safeText(journeyStep.getCallToAction(), campaign != null ? safeText(campaign.getPrimaryCallToAction(), "reach out") : "reach out"))
                .replace("{channel}", journeyStep.getChannel() != null ? journeyStep.getChannel().name() : "OUTREACH")
                .replace("{source}", lead.getSource() != null ? lead.getSource().name() : "UNKNOWN")
                .trim();
    }

    private String safeText(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private void syncCampaignAttributionMetrics(UUID tenantId, UUID campaignId) {
        if (campaignId == null) {
            return;
        }
        campaignRepository.findById(campaignId)
                .filter(campaign -> tenantId.equals(campaign.getTenantId()) && !Boolean.TRUE.equals(campaign.getArchived()))
                .ifPresent(campaign -> {
                    List<Lead> attributedLeads = leadRepository.findByTenantIdAndCampaignIdAndArchivedFalse(tenantId, campaignId);
                    campaign.setLeadsGenerated(attributedLeads.size());
                    campaign.setOpportunitiesCreated((int) attributedLeads.stream()
                            .filter(lead -> lead.getStatus() == LeadStatus.QUALIFIED || lead.getStatus() == LeadStatus.CONVERTED)
                            .count());
                    campaign.setConversions((int) attributedLeads.stream()
                            .filter(lead -> lead.getStatus() == LeadStatus.CONVERTED)
                            .count());
                    campaignRepository.save(campaign);
                });
    }

    private boolean isFastTrackLead(Lead lead, WorkflowRule workflowRule) {
        Integer scoreThreshold = workflowRule.getFastTrackScoreThreshold();
        BigDecimal valueThreshold = workflowRule.getFastTrackValueThreshold();
        return (lead.getScore() != null && scoreThreshold != null && lead.getScore() >= scoreThreshold)
                || (lead.getEstimatedValue() != null && valueThreshold != null && lead.getEstimatedValue().compareTo(valueThreshold) >= 0);
    }

    private Campaign resolveCampaign(UUID tenantId, UUID requestCampaignId, UUID entityCampaignId) {
        UUID campaignId = requestCampaignId != null ? requestCampaignId : entityCampaignId;
        if (campaignId == null) {
            return null;
        }

        return campaignRepository.findById(campaignId)
                .filter(campaign -> tenantId.equals(campaign.getTenantId()) && !Boolean.TRUE.equals(campaign.getArchived()))
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", campaignId));
    }

    private boolean isCampaignNurtureEligible(WorkflowRule campaignWorkflow, Campaign campaign) {
        if (campaign == null || campaignWorkflow == null || !Boolean.TRUE.equals(campaignWorkflow.getIsActive())) {
            return false;
        }
        if (!Boolean.TRUE.equals(campaignWorkflow.getRequireActiveCampaign())) {
            return true;
        }
        return campaign.getStatus() == CampaignStatus.ACTIVE;
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
