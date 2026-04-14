package com.crm.controller;

import com.crm.dto.request.TaskFilterDTO;
import com.crm.dto.request.TaskRequestDTO;
import com.crm.dto.response.TaskResponseDTO;
import com.crm.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Tasks", description = "Task management endpoints")
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    @Operation(summary = "Get all tasks", description = "Get paginated list of tasks with optional filtering")
    public ResponseEntity<Page<TaskResponseDTO>> getAllTasks(
            @PageableDefault(size = 20, sort = "dueDate", direction = Sort.Direction.ASC) Pageable pageable,
            @ModelAttribute TaskFilterDTO filter
    ) {
        return ResponseEntity.ok(taskService.findAll(pageable, filter));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get task by ID", description = "Get detailed information about a specific task")
    public ResponseEntity<TaskResponseDTO> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Create new task", description = "Create a new task")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<TaskResponseDTO> createTask(@Valid @RequestBody TaskRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update task", description = "Update an existing task")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable UUID id,
            @Valid @RequestBody TaskRequestDTO request
    ) {
        return ResponseEntity.ok(taskService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete task", description = "Delete a task (soft delete)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Bulk delete tasks", description = "Delete multiple tasks at once")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ResponseEntity<Void> bulkDeleteTasks(@RequestBody List<UUID> ids) {
        taskService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/overdue")
    @Operation(summary = "Get overdue tasks", description = "Get all tasks that are overdue")
    public ResponseEntity<List<TaskResponseDTO>> getOverdueTasks() {
        return ResponseEntity.ok(taskService.findOverdueTasks());
    }

    @GetMapping("/assigned-to/{userId}")
    @Operation(summary = "Get tasks by assignee", description = "Get all tasks assigned to a specific user")
    public ResponseEntity<List<TaskResponseDTO>> getTasksByAssignee(@PathVariable UUID userId) {
        return ResponseEntity.ok(taskService.findByAssignedTo(userId));
    }

    @PatchMapping("/{id}/complete")
    @Operation(summary = "Complete task", description = "Mark a task as completed")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES_REP')")
    public ResponseEntity<TaskResponseDTO> completeTask(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.completeTask(id));
    }
}
