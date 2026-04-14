package com.crm.dto.request;

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
public class TaskFilterDTO {
    
    private String search;
    private TaskStatus status;
    private TaskPriority priority;
    private UUID assignedToId;
    private LocalDateTime dueDateFrom;
    private LocalDateTime dueDateTo;
    private Boolean overdueOnly;
    private String relatedEntityType;
    private UUID relatedEntityId;
}
