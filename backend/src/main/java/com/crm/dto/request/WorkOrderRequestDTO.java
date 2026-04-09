package com.crm.dto.request;

import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import com.crm.entity.enums.WorkOrderType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class WorkOrderRequestDTO {

    @NotBlank
    private String title;
    private WorkOrderStatus status;
    private WorkOrderPriority priority;
    private WorkOrderType workType;
    private UUID companyId;
    private UUID contactId;
    private UUID supportCaseId;
    private UUID assignedTechnicianId;
    private String territory;
    private String serviceAddress;
    private LocalDateTime scheduledStartAt;
    private LocalDateTime scheduledEndAt;
    private String description;
}
