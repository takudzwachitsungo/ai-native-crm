package com.crm.dto.request;

import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import com.crm.entity.enums.WorkOrderType;
import lombok.Data;

import java.util.UUID;

@Data
public class WorkOrderFilterDTO {

    private String search;
    private WorkOrderStatus status;
    private WorkOrderPriority priority;
    private WorkOrderType workType;
    private UUID assignedTechnicianId;
}
