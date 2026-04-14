package com.crm.repository;

import com.crm.entity.NurtureJourney;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NurtureJourneyRepository extends JpaRepository<NurtureJourney, UUID> {

    List<NurtureJourney> findByTenantIdAndArchivedFalseOrderByNameAsc(UUID tenantId);

    Optional<NurtureJourney> findByIdAndTenantIdAndArchivedFalse(UUID id, UUID tenantId);
}
