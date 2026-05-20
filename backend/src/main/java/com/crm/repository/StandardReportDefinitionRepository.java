package com.crm.repository;

import com.crm.entity.StandardReportDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StandardReportDefinitionRepository extends JpaRepository<StandardReportDefinition, UUID> {

    List<StandardReportDefinition> findByTenantIdAndArchivedFalseOrderByUpdatedAtDesc(UUID tenantId);

    Optional<StandardReportDefinition> findByTenantIdAndIdAndArchivedFalse(UUID tenantId, UUID id);

    long countByTenantIdAndArchivedFalse(UUID tenantId);
}
