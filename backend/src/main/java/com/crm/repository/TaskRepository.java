package com.crm.repository;

import com.crm.entity.Task;
import com.crm.entity.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {
    
    Page<Task> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Task> findByTenantIdAndAssignedToAndArchivedFalse(UUID tenantId, UUID assignedTo);
    
    @Query("SELECT t FROM Task t WHERE t.tenantId = :tenantId AND t.dueDate = :date AND t.status != 'COMPLETED' AND t.archived = false")
    List<Task> findTasksDueOn(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);
    
    @Query("SELECT t FROM Task t WHERE t.tenantId = :tenantId AND t.dueDate < :date AND t.status != 'COMPLETED' AND t.archived = false")
    List<Task> findOverdueTasks(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);
    
    long countByTenantIdAndStatusAndArchivedFalse(UUID tenantId, TaskStatus status);

    List<Task> findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
            UUID tenantId,
            String relatedEntityType,
            UUID relatedEntityId
    );

    List<Task> findByTenantIdAndRelatedEntityTypeAndArchivedFalse(
            UUID tenantId,
            String relatedEntityType
    );

    List<Task> findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdInAndArchivedFalse(
            UUID tenantId,
            String relatedEntityType,
            Collection<UUID> relatedEntityIds
    );

    boolean existsByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalseAndStatusIn(
            UUID tenantId,
            String relatedEntityType,
            UUID relatedEntityId,
            Collection<TaskStatus> statuses
    );

    Optional<Task> findByIdAndTenantIdAndArchivedFalse(UUID id, UUID tenantId);

    @Modifying
    @Query("UPDATE Task t SET t.relatedEntityId = :targetId WHERE t.tenantId = :tenantId AND t.archived = false AND t.relatedEntityType = :relatedEntityType AND t.relatedEntityId = :sourceId")
    int reassignRelatedEntity(
            @Param("tenantId") UUID tenantId,
            @Param("relatedEntityType") String relatedEntityType,
            @Param("sourceId") UUID sourceId,
            @Param("targetId") UUID targetId
    );
}
