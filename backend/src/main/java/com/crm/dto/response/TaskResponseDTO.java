package com.crm.dto.response;

import com.crm.entity.enums.TaskPriority;
import com.crm.entity.enums.TaskStatus;
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
public class TaskResponseDTO {
    
    private UUID id;
    private UUID tenantId;
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private TaskPriority priority;
    private TaskStatus status;
    private UUID assignedToId;
    private String assignedToName;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private LocalDateTime completedAt;
    private Boolean isOverdue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;
}
