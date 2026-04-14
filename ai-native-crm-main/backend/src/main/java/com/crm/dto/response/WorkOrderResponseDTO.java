package com.crm.dto.response;

import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import com.crm.entity.enums.WorkOrderType;
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
public class WorkOrderResponseDTO {

    private UUID id;
    private String orderNumber;
    private String title;
    private WorkOrderStatus status;
    private WorkOrderPriority priority;
    private WorkOrderType workType;
    private UUID companyId;
    private String companyName;
    private UUID contactId;
    private String contactName;
    private UUID supportCaseId;
    private String supportCaseNumber;
    private UUID assignedTechnicianId;
    private String assignedTechnicianName;
    private String territory;
    private String serviceAddress;
    private LocalDateTime scheduledStartAt;
    private LocalDateTime scheduledEndAt;
    private LocalDateTime dispatchedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String description;
    private String completionNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
