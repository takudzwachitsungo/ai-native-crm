package com.crm.repository;

import com.crm.entity.Campaign;
import com.crm.entity.enums.CampaignStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, UUID>, JpaSpecificationExecutor<Campaign> {

    Page<Campaign> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);

    List<Campaign> findByTenantIdAndArchivedFalse(UUID tenantId);

    long countByTenantIdAndArchivedFalse(UUID tenantId);

    long countByTenantIdAndStatusAndArchivedFalse(UUID tenantId, CampaignStatus status);

    long countByTenantIdAndSegmentIdAndArchivedFalse(UUID tenantId, UUID segmentId);

    long countByTenantIdAndJourneyIdAndArchivedFalse(UUID tenantId, UUID journeyId);
}
