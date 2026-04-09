package com.crm.repository;

import com.crm.entity.SupportCase;
import com.crm.entity.enums.SupportCasePriority;
import com.crm.entity.enums.SupportCaseQueue;
import com.crm.entity.enums.SupportCaseStatus;
import com.crm.entity.enums.SupportCaseType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupportCaseRepository extends JpaRepository<SupportCase, UUID>, JpaSpecificationExecutor<SupportCase> {

    Page<SupportCase> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);

    List<SupportCase> findByTenantIdAndArchivedFalse(UUID tenantId);

    Optional<SupportCase> findByTenantIdAndCaseNumberAndArchivedFalse(UUID tenantId, String caseNumber);

    long countByTenantIdAndArchivedFalse(UUID tenantId);

    long countByTenantIdAndStatusInAndArchivedFalse(UUID tenantId, List<SupportCaseStatus> statuses);

    long countByTenantIdAndOwnerIdAndStatusInAndArchivedFalse(UUID tenantId, UUID ownerId, List<SupportCaseStatus> statuses);

    long countByTenantIdAndOwnerIdAndSupportQueueAndStatusInAndArchivedFalse(
            UUID tenantId,
            UUID ownerId,
            SupportCaseQueue supportQueue,
            List<SupportCaseStatus> statuses
    );

    long countByTenantIdAndPriorityAndArchivedFalse(UUID tenantId, SupportCasePriority priority);

    long countByTenantIdAndSupportQueueAndArchivedFalse(UUID tenantId, SupportCaseQueue supportQueue);

    long countByTenantIdAndCaseTypeAndArchivedFalse(UUID tenantId, SupportCaseType caseType);

    @Modifying
    @Query("UPDATE SupportCase c SET c.contactId = :targetId WHERE c.tenantId = :tenantId AND c.archived = false AND c.contactId = :sourceId")
    int reassignContact(@Param("tenantId") UUID tenantId, @Param("sourceId") UUID sourceId, @Param("targetId") UUID targetId);
}
