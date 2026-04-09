package com.crm.repository;

import com.crm.entity.AutomationRun;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AutomationRunRepository extends JpaRepository<AutomationRun, UUID> {

    List<AutomationRun> findByTenantIdAndArchivedFalseOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    long countByTenantIdAndArchivedFalseAndCreatedAtAfter(UUID tenantId, LocalDateTime createdAt);

    long countByTenantIdAndArchivedFalseAndRunStatusIgnoreCaseAndCreatedAtAfter(
            UUID tenantId,
            String runStatus,
            LocalDateTime createdAt
    );
}
