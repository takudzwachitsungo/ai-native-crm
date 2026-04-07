package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.TaskFilterDTO;
import com.crm.dto.request.TaskRequestDTO;
import com.crm.dto.response.TaskResponseDTO;
import com.crm.entity.Campaign;
import com.crm.entity.Lead;
import com.crm.entity.NurtureJourneyStep;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.WorkflowRule;
import com.crm.entity.enums.CampaignStatus;
import com.crm.entity.enums.LeadStatus;
import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.TaskMapper;
import com.crm.repository.LeadRepository;
import com.crm.repository.NurtureJourneyStepRepository;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
import com.crm.service.WorkflowRuleService;
import com.crm.service.TaskService;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskServiceImpl implements TaskService {

    private static final String CAMPAIGN_NURTURE_TAG = "campaign-nurture";
    private static final String JOURNEY_TAG_PREFIX = "journey:";
    private static final String JOURNEY_STEP_TAG_PREFIX = "journey-step:";

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final NurtureJourneyStepRepository nurtureJourneyStepRepository;
    private final TaskMapper taskMapper;
    private final WorkflowRuleService workflowRuleService;

    @Override
    @Transactional(readOnly = true)
    public Page<TaskResponseDTO> findAll(Pageable pageable, TaskFilterDTO filter) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Specification<Task>> specs = new ArrayList<>();
        specs.add(SpecificationBuilder.tenantEquals(tenantId));
        specs.add(SpecificationBuilder.notArchived());
        
        if (filter != null) {
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                String search = "%" + filter.getSearch().toLowerCase() + "%";
                specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), search),
                    cb.like(cb.lower(root.get("description")), search)
                ));
            }
            
            if (filter.getStatus() != null) {
                specs.add(SpecificationBuilder.equal("status", filter.getStatus()));
            }
            
            if (filter.getPriority() != null) {
                specs.add(SpecificationBuilder.equal("priority", filter.getPriority()));
            }
            
            if (filter.getAssignedToId() != null) {
                specs.add((root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), filter.getAssignedToId()));
            }
            
            if (filter.getDueDateFrom() != null && filter.getDueDateTo() != null) {
                specs.add(SpecificationBuilder.between("dueDate", filter.getDueDateFrom(), filter.getDueDateTo()));
            }
            
            if (Boolean.TRUE.equals(filter.getOverdueOnly())) {
                specs.add((root, query, cb) -> cb.and(
                    cb.lessThan(root.get("dueDate"), LocalDateTime.now()),
                    cb.notEqual(root.get("status"), TaskStatus.COMPLETED)
                ));
            }
            
            if (filter.getRelatedEntityType() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityType", filter.getRelatedEntityType()));
            }
            
            if (filter.getRelatedEntityId() != null) {
                specs.add(SpecificationBuilder.equal("relatedEntityId", filter.getRelatedEntityId()));
            }
        }
        
        Specification<Task> spec = SpecificationBuilder.combineWithAnd(specs);
        Page<Task> tasks = taskRepository.findAll(spec, pageable);
        
        return tasks.map(taskMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "tasks", key = "#id")
    public TaskResponseDTO findById(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Task task = taskRepository.findById(id)
                .filter(t -> t.getTenantId().equals(tenantId) && !t.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        
        return taskMapper.toDto(task);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"tasks", "dashboard-metrics"}, allEntries = true)
    public TaskResponseDTO create(TaskRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Task task = taskMapper.toEntity(request);
        task.setTenantId(tenantId);
        
        // Set assigned user if provided
        if (request.getAssignedToId() != null) {
            User user = userRepository.findById(request.getAssignedToId())
                    .filter(u -> u.getTenantId().equals(tenantId) && u.getIsActive())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getAssignedToId()));
            task.setAssignedTo(request.getAssignedToId());
        }
        
        task = taskRepository.save(task);
        log.info("Created task: {} for tenant: {}", task.getId(), tenantId);
        
        return taskMapper.toDto(task);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"tasks", "dashboard-metrics"}, allEntries = true)
    public TaskResponseDTO update(UUID id, TaskRequestDTO request) {
        UUID tenantId = TenantContext.getTenantId();
        
        Task task = taskRepository.findById(id)
                .filter(t -> t.getTenantId().equals(tenantId) && !t.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        
        // Update assigned user if changed
        if (request.getAssignedToId() != null && !request.getAssignedToId().equals(task.getAssignedTo())) {
            User user = userRepository.findById(request.getAssignedToId())
                    .filter(u -> u.getTenantId().equals(tenantId) && u.getIsActive())
                    .orElseThrow(() -> new ResourceNotFoundException("User", request.getAssignedToId()));
            task.setAssignedTo(request.getAssignedToId());
        }
        
        taskMapper.updateEntity(request, task);
        task = taskRepository.save(task);
        
        log.info("Updated task: {} for tenant: {}", id, tenantId);
        
        return taskMapper.toDto(task);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"tasks", "dashboard-metrics"}, allEntries = true)
    public void delete(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Task task = taskRepository.findById(id)
                .filter(t -> t.getTenantId().equals(tenantId) && !t.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        
        task.setArchived(true);
        taskRepository.save(task);
        
        log.info("Deleted (archived) task: {} for tenant: {}", id, tenantId);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"tasks", "dashboard-metrics"}, allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Task> tasks = taskRepository.findAllById(ids).stream()
                .filter(t -> t.getTenantId().equals(tenantId) && !t.getArchived())
                .collect(Collectors.toList());
        
        if (tasks.isEmpty()) {
            throw new BadRequestException("No valid tasks found for deletion");
        }
        
        tasks.forEach(task -> task.setArchived(true));
        taskRepository.saveAll(tasks);
        
        log.info("Bulk deleted {} tasks for tenant: {}", tasks.size(), tenantId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponseDTO> findOverdueTasks() {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Task> tasks = taskRepository.findOverdueTasks(tenantId, java.time.LocalDate.now());
        return tasks.stream()
                .map(taskMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponseDTO> findByAssignedTo(UUID userId) {
        UUID tenantId = TenantContext.getTenantId();
        
        List<Task> tasks = taskRepository.findByTenantIdAndAssignedToAndArchivedFalse(tenantId, userId);
        return tasks.stream()
                .map(taskMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = {"tasks", "dashboard-metrics"}, allEntries = true)
    public TaskResponseDTO completeTask(UUID id) {
        UUID tenantId = TenantContext.getTenantId();
        
        Task task = taskRepository.findById(id)
                .filter(t -> t.getTenantId().equals(tenantId) && !t.getArchived())
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        
        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new BadRequestException("Task is already completed");
        }
        
        task.setStatus(TaskStatus.COMPLETED);
        task = taskRepository.save(task);
        triggerJourneyProgressionIfNeeded(tenantId, task);

        log.info("Completed task: {} for tenant: {}", id, tenantId);
        
        return taskMapper.toDto(task);
    }

    private void triggerJourneyProgressionIfNeeded(UUID tenantId, Task task) {
        if (!"lead".equalsIgnoreCase(task.getRelatedEntityType()) || task.getRelatedEntityId() == null) {
            return;
        }
        if (!hasTag(task, CAMPAIGN_NURTURE_TAG)) {
            return;
        }
        UUID journeyId = extractTaggedUuid(task, JOURNEY_TAG_PREFIX);
        UUID currentStepId = extractTaggedUuid(task, JOURNEY_STEP_TAG_PREFIX);
        if (journeyId == null || currentStepId == null) {
            return;
        }

        Lead lead = leadRepository.findById(task.getRelatedEntityId())
                .filter(record -> tenantId.equals(record.getTenantId()) && !Boolean.TRUE.equals(record.getArchived()))
                .orElse(null);
        if (lead == null || lead.getCampaign() == null || lead.getCampaign().getJourneyId() == null) {
            return;
        }
        if (lead.getStatus() == LeadStatus.CONVERTED || lead.getStatus() == LeadStatus.LOST || lead.getStatus() == LeadStatus.UNQUALIFIED) {
            return;
        }

        WorkflowRule campaignWorkflow = workflowRuleService.resolveCampaignNurtureWorkflow(tenantId);
        if (!isCampaignNurtureEligible(campaignWorkflow, lead.getCampaign())) {
            return;
        }

        List<NurtureJourneyStep> steps = nurtureJourneyStepRepository.findByJourneyIdAndTenantIdAndArchivedFalseOrderBySequenceOrderAsc(journeyId, tenantId);
        int currentIndex = -1;
        for (int index = 0; index < steps.size(); index++) {
            if (currentStepId.equals(steps.get(index).getId())) {
                currentIndex = index;
                break;
            }
        }
        if (currentIndex < 0) {
            return;
        }

        NurtureJourneyStep nextStep = steps.stream()
                .skip(currentIndex + 1L)
                .filter(step -> Boolean.TRUE.equals(step.getIsActive()))
                .findFirst()
                .orElse(null);
        if (nextStep == null) {
            return;
        }

        List<Task> relatedTasks = taskRepository.findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
                tenantId,
                "lead",
                lead.getId()
        );
        boolean nextTaskExists = relatedTasks.stream().anyMatch(existing -> {
            UUID existingStepId = extractTaggedUuid(existing, JOURNEY_STEP_TAG_PREFIX);
            return nextStep.getId().equals(existingStepId) && existing.getStatus() != TaskStatus.COMPLETED;
        });
        if (nextTaskExists) {
            return;
        }

        Task nextTask = Task.builder()
                .title(buildJourneyTaskTitle(lead, nextStep))
                .description(buildJourneyTaskDescription(lead, nextStep))
                .dueDate(java.time.LocalDate.now().plusDays(Math.max(0, nextStep.getWaitDays())))
                .priority(nextStep.getTaskPriority() != null ? nextStep.getTaskPriority() : TaskPriority.MEDIUM)
                .status(TaskStatus.TODO)
                .assignedTo(lead.getOwnerId())
                .relatedEntityType("lead")
                .relatedEntityId(lead.getId())
                .tags(new String[] {
                        CAMPAIGN_NURTURE_TAG,
                        JOURNEY_TAG_PREFIX + journeyId,
                        JOURNEY_STEP_TAG_PREFIX + nextStep.getId()
                })
                .build();
        nextTask.setTenantId(tenantId);
        taskRepository.save(nextTask);
    }

    private String buildJourneyTaskTitle(Lead lead, NurtureJourneyStep step) {
        if (hasText(step.getTaskTitleTemplate())) {
            return applyJourneyTemplate(step.getTaskTitleTemplate(), lead, step);
        }
        return step.getName() + " for " + lead.getFullName();
    }

    private String buildJourneyTaskDescription(Lead lead, NurtureJourneyStep step) {
        StringBuilder description = new StringBuilder("Continue the nurture journey for this lead.");
        if (lead.getCampaign() != null) {
            description.append(" Campaign: ").append(lead.getCampaign().getName()).append(".");
        }
        description.append(" Journey step: ").append(step.getName()).append(".");
        if (step.getChannel() != null) {
            description.append(" Channel: ").append(step.getChannel().name()).append(".");
        }
        if (hasText(step.getObjective())) {
            description.append(" Objective: ").append(step.getObjective()).append(".");
        }
        if (hasText(step.getCallToAction())) {
            description.append(" CTA: ").append(step.getCallToAction()).append(".");
        }
        if (hasText(step.getTaskDescriptionTemplate())) {
            description.append(" ").append(applyJourneyTemplate(step.getTaskDescriptionTemplate(), lead, step));
        }
        return description.toString();
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

    private boolean hasTag(Task task, String tag) {
        return task.getTags() != null && Arrays.stream(task.getTags()).anyMatch(tag::equalsIgnoreCase);
    }

    private UUID extractTaggedUuid(Task task, String prefix) {
        if (task.getTags() == null) {
            return null;
        }
        Optional<String> match = Arrays.stream(task.getTags())
                .filter(this::hasText)
                .filter(tag -> tag.startsWith(prefix))
                .findFirst();
        if (match.isEmpty()) {
            return null;
        }
        try {
            return UUID.fromString(match.get().substring(prefix.length()));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String applyJourneyTemplate(String template, Lead lead, NurtureJourneyStep step) {
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
                .replace("{stepName}", safeText(step.getName(), "journey step"))
                .replace("{objective}", safeText(step.getObjective(), "advance the opportunity"))
                .replace("{callToAction}", safeText(step.getCallToAction(), campaign != null ? safeText(campaign.getPrimaryCallToAction(), "reach out") : "reach out"))
                .replace("{channel}", step.getChannel() != null ? step.getChannel().name() : "OUTREACH")
                .trim();
    }

    private String safeText(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
