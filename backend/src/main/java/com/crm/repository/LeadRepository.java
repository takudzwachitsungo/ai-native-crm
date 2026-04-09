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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Collection;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {
    
    Page<Lead> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Lead> findByTenantIdAndStatusAndArchivedFalse(UUID tenantId, LeadStatus status);

    List<Lead> findByTenantIdAndCampaignIdAndArchivedFalse(UUID tenantId, UUID campaignId);
    
    @Query("SELECT l FROM Lead l WHERE l.tenantId = :tenantId AND l.score >= :minScore AND l.archived = false")
    List<Lead> findHighScoringLeads(@Param("tenantId") UUID tenantId, @Param("minScore") Integer minScore);
    
    @Query("SELECT l FROM Lead l WHERE l.tenantId = :tenantId AND l.ownerId = :ownerId AND l.archived = false")
    Page<Lead> findByOwner(@Param("tenantId") UUID tenantId, @Param("ownerId") UUID ownerId, Pageable pageable);
    
    long countByTenantIdAndStatusAndArchivedFalse(UUID tenantId, LeadStatus status);

    long countByTenantIdAndOwnerIdAndArchivedFalseAndStatusNotIn(UUID tenantId, UUID ownerId, Collection<LeadStatus> statuses);

    long countByTenantIdAndCampaignIdAndArchivedFalse(UUID tenantId, UUID campaignId);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM Lead l WHERE l.tenantId = :tenantId AND l.campaignId = :campaignId AND l.archived = false")
    BigDecimal sumEstimatedValueByTenantIdAndCampaignId(@Param("tenantId") UUID tenantId, @Param("campaignId") UUID campaignId);

    @Query("SELECT COALESCE(SUM(l.estimatedValue), 0) FROM Lead l WHERE l.tenantId = :tenantId AND l.campaignId IS NOT NULL AND l.archived = false")
    BigDecimal sumEstimatedValueByTenantIdForAttributedCampaigns(@Param("tenantId") UUID tenantId);

    long countByTenantIdAndCampaignIdIsNotNullAndArchivedFalse(UUID tenantId);
}
