package com.crm.repository;

import com.crm.entity.Task;
import com.crm.entity.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {
    
    Page<Task> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Task> findByTenantIdAndAssignedToAndArchivedFalse(UUID tenantId, UUID assignedTo);
    
    @Query("SELECT t FROM Task t WHERE t.tenantId = :tenantId AND t.dueDate = :date AND t.status != 'COMPLETED' AND t.archived = false")
    List<Task> findTasksDueOn(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);
    
    @Query("SELECT t FROM Task t WHERE t.tenantId = :tenantId AND t.dueDate < :date AND t.status != 'COMPLETED' AND t.archived = false")
    List<Task> findOverdueTasks(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);
    
    long countByTenantIdAndStatusAndArchivedFalse(UUID tenantId, TaskStatus status);
}
