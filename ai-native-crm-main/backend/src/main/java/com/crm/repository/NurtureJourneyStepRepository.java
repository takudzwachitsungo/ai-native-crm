package com.crm.repository;

import com.crm.entity.NurtureJourneyStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NurtureJourneyStepRepository extends JpaRepository<NurtureJourneyStep, UUID> {

    List<NurtureJourneyStep> findByJourneyIdAndTenantIdAndArchivedFalseOrderBySequenceOrderAsc(UUID journeyId, UUID tenantId);

    Optional<NurtureJourneyStep> findByIdAndJourneyIdAndTenantIdAndArchivedFalse(UUID id, UUID journeyId, UUID tenantId);

    Optional<NurtureJourneyStep> findFirstByJourneyIdAndTenantIdAndIsActiveTrueAndArchivedFalseOrderBySequenceOrderAsc(UUID journeyId, UUID tenantId);

    long countByJourneyIdAndTenantIdAndArchivedFalse(UUID journeyId, UUID tenantId);
}
