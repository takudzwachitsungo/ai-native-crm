package com.crm.repository;

import com.crm.entity.Deal;
import com.crm.entity.enums.DealStage;
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

@Repository
public interface DealRepository extends JpaRepository<Deal, UUID>, JpaSpecificationExecutor<Deal> {
    
    Page<Deal> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Deal> findByTenantIdAndStageAndArchivedFalse(UUID tenantId, DealStage stage);
    
    @Query("SELECT d FROM Deal d WHERE d.tenantId = :tenantId AND d.ownerId = :ownerId AND d.archived = false")
    Page<Deal> findByOwner(@Param("tenantId") UUID tenantId, @Param("ownerId") UUID ownerId, Pageable pageable);
    
    @Query("SELECT SUM(d.value) FROM Deal d WHERE d.tenantId = :tenantId AND d.stage = :stage AND d.archived = false")
    BigDecimal sumValueByStage(@Param("tenantId") UUID tenantId, @Param("stage") DealStage stage);
    
    @Query("SELECT COUNT(d) FROM Deal d WHERE d.tenantId = :tenantId AND d.stage IN :stages AND d.archived = false")
    long countByStages(@Param("tenantId") UUID tenantId, @Param("stages") List<DealStage> stages);
    
    long countByTenantIdAndStageAndArchivedFalse(UUID tenantId, DealStage stage);
}
