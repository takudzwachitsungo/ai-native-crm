package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.TaskFilterDTO;
import com.crm.dto.request.TaskRequestDTO;
import com.crm.dto.response.TaskResponseDTO;
import com.crm.entity.Task;
import com.crm.entity.User;
import com.crm.entity.enums.TaskStatus;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.mapper.TaskMapper;
import com.crm.repository.TaskRepository;
import com.crm.repository.UserRepository;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TaskMapper taskMapper;

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
        
        log.info("Completed task: {} for tenant: {}", id, tenantId);
        
        return taskMapper.toDto(task);
    }
}
