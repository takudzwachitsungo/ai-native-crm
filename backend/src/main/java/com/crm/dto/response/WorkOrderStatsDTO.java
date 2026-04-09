package com.crm.dto.response;

import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderStatsDTO {

    private Long totalWorkOrders;
    private Long activeWorkOrders;
    private Long scheduledWorkOrders;
    private Long dispatchedWorkOrders;
    private Long completedWorkOrders;
    private Long overdueScheduledWorkOrders;
    private Map<WorkOrderStatus, Long> workOrdersByStatus;
    private Map<WorkOrderPriority, Long> workOrdersByPriority;
    private List<FieldTechnicianWorkloadDTO> technicianWorkloads;
}
