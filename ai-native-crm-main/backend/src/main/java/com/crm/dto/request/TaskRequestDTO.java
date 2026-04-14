package com.crm.dto.request;

import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequestDTO {
    
    @NotBlank(message = "Task title is required")
    @Size(max = 200, message = "Title must be less than 200 characters")
    private String title;
    
    private String description;
    
    @NotNull(message = "Due date is required")
    private LocalDateTime dueDate;
    
    @NotNull(message = "Priority is required")
    private TaskPriority priority;
    
    @NotNull(message = "Status is required")
    private TaskStatus status;
    
    private UUID assignedToId;
    
    private String relatedEntityType;
    
    private UUID relatedEntityId;
    
    private LocalDateTime completedAt;
}
