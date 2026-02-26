package com.crm.repository;

import com.crm.entity.Lead;
import com.crm.entity.enums.LeadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {
    
    Page<Lead> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Lead> findByTenantIdAndStatusAndArchivedFalse(UUID tenantId, LeadStatus status);
    
    @Query("SELECT l FROM Lead l WHERE l.tenantId = :tenantId AND l.score >= :minScore AND l.archived = false")
    List<Lead> findHighScoringLeads(@Param("tenantId") UUID tenantId, @Param("minScore") Integer minScore);
    
    @Query("SELECT l FROM Lead l WHERE l.tenantId = :tenantId AND l.ownerId = :ownerId AND l.archived = false")
    Page<Lead> findByOwner(@Param("tenantId") UUID tenantId, @Param("ownerId") UUID ownerId, Pageable pageable);
    
    long countByTenantIdAndStatusAndArchivedFalse(UUID tenantId, LeadStatus status);
}
