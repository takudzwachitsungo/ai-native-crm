package com.crm.repository;

import com.crm.entity.Quote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, UUID>, JpaSpecificationExecutor<Quote> {
    
    Page<Quote> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    Optional<Quote> findByTenantIdAndQuoteNumberAndArchivedFalse(UUID tenantId, String quoteNumber);
    
    boolean existsByTenantIdAndQuoteNumber(UUID tenantId, String quoteNumber);

    @Modifying
    @Query("UPDATE Quote q SET q.contactId = :targetId WHERE q.tenantId = :tenantId AND q.archived = false AND q.contactId = :sourceId")
    int reassignContact(@Param("tenantId") UUID tenantId, @Param("sourceId") UUID sourceId, @Param("targetId") UUID targetId);
}
