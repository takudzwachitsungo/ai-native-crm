package com.crm.repository;

import com.crm.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID>, JpaSpecificationExecutor<Contract> {

    boolean existsByTenantIdAndContractNumber(UUID tenantId, String contractNumber);

    boolean existsByTenantIdAndQuoteIdAndArchivedFalse(UUID tenantId, UUID quoteId);

    boolean existsByTenantIdAndContractNumberAndArchivedFalse(UUID tenantId, String contractNumber);

    Optional<Contract> findByTenantIdAndContractNumberAndArchivedFalse(UUID tenantId, String contractNumber);

    @Modifying
    @Query("UPDATE Contract c SET c.contactId = :targetId WHERE c.tenantId = :tenantId AND c.archived = false AND c.contactId = :sourceId")
    int reassignContact(@Param("tenantId") UUID tenantId, @Param("sourceId") UUID sourceId, @Param("targetId") UUID targetId);
}
