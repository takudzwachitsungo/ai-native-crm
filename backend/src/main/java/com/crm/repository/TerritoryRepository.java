package com.crm.repository;

import com.crm.entity.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TerritoryRepository extends JpaRepository<Territory, UUID> {

    List<Territory> findByTenantIdAndArchivedFalseOrderByNameAsc(UUID tenantId);

    List<Territory> findByTenantIdAndIsActiveTrueAndArchivedFalseOrderByNameAsc(UUID tenantId);

    Optional<Territory> findByIdAndTenantIdAndArchivedFalse(UUID id, UUID tenantId);

    Optional<Territory> findByTenantIdAndNormalizedNameAndArchivedFalse(UUID tenantId, String normalizedName);

    Optional<Territory> findByTenantIdAndNormalizedNameAndIsActiveTrueAndArchivedFalse(UUID tenantId, String normalizedName);
}
