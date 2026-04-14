package com.crm.repository;

import com.crm.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {
    
    Page<Event> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    @Query("SELECT e FROM Event e WHERE e.tenantId = :tenantId AND e.startDateTime BETWEEN :start AND :end AND e.archived = false ORDER BY e.startDateTime")
    List<Event> findEventsBetween(@Param("tenantId") UUID tenantId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    @Query("SELECT e FROM Event e WHERE e.tenantId = :tenantId AND DATE(e.startDateTime) = DATE(:date) AND e.archived = false")
    List<Event> findEventsOnDate(@Param("tenantId") UUID tenantId, @Param("date") LocalDateTime date);

    Optional<Event> findByTenantIdAndExternalProviderAndExternalEventIdAndArchivedFalse(
            UUID tenantId,
            String externalProvider,
            String externalEventId
    );
}
