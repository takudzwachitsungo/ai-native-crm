package com.crm.repository;

import com.crm.entity.WorkOrder;
import com.crm.entity.enums.WorkOrderPriority;
import com.crm.entity.enums.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, UUID>, JpaSpecificationExecutor<WorkOrder> {

    List<WorkOrder> findByTenantIdAndArchivedFalse(UUID tenantId);

    long countByTenantIdAndAssignedTechnicianIdAndStatusInAndArchivedFalse(
            UUID tenantId,
            UUID technicianId,
            List<WorkOrderStatus> statuses
    );

    long countByTenantIdAndAssignedTechnicianIdAndPriorityAndStatusInAndArchivedFalse(
            UUID tenantId,
            UUID technicianId,
            WorkOrderPriority priority,
            List<WorkOrderStatus> statuses
    );
}
