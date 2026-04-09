package com.crm.repository;

import com.crm.entity.WorkspaceIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceIntegrationRepository extends JpaRepository<WorkspaceIntegration, UUID> {

    List<WorkspaceIntegration> findByTenantIdAndArchivedFalseOrderByNameAsc(UUID tenantId);

    List<WorkspaceIntegration> findByTenantIdAndArchivedFalse(UUID tenantId);

    Optional<WorkspaceIntegration> findByTenantIdAndProviderKeyAndArchivedFalse(UUID tenantId, String providerKey);
}
