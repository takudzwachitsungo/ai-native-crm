package com.crm.repository;

import com.crm.entity.CampaignSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CampaignSegmentRepository extends JpaRepository<CampaignSegment, UUID> {

    List<CampaignSegment> findByTenantIdAndArchivedFalseOrderByNameAsc(UUID tenantId);

    Optional<CampaignSegment> findByIdAndTenantIdAndArchivedFalse(UUID id, UUID tenantId);
}
