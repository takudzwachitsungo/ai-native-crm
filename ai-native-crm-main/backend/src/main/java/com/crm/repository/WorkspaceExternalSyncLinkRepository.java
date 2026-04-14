package com.crm.repository;

import com.crm.entity.WorkspaceExternalSyncLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WorkspaceExternalSyncLinkRepository extends JpaRepository<WorkspaceExternalSyncLink, UUID> {

    Optional<WorkspaceExternalSyncLink> findByTenantIdAndProviderKeyAndEntityTypeAndLocalEntityIdAndArchivedFalse(
            UUID tenantId,
            String providerKey,
            String entityType,
            UUID localEntityId
    );
}
