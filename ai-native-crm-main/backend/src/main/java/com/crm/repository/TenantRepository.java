package com.crm.repository;

import com.crm.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    
    Optional<Tenant> findByIdAndArchivedFalse(UUID id);
    
    Optional<Tenant> findByNameAndArchivedFalse(String name);

    Optional<Tenant> findBySlugAndArchivedFalse(String slug);

    boolean existsBySlugAndArchivedFalse(String slug);

    List<Tenant> findAllByDedicatedDatabaseEnabledTrueAndArchivedFalse();
}
