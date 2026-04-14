package com.crm.repository;

import com.crm.entity.Company;
import com.crm.entity.enums.CompanyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID>, JpaSpecificationExecutor<Company> {
    
    Page<Company> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Company> findByTenantIdAndStatusAndArchivedFalse(UUID tenantId, CompanyStatus status);
    
    @Query("SELECT c FROM Company c WHERE c.tenantId = :tenantId AND LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%')) AND c.archived = false")
    List<Company> searchByName(@Param("tenantId") UUID tenantId, @Param("name") String name);
    
    long countByTenantIdAndArchivedFalse(UUID tenantId);

    long countByTenantIdAndParentCompanyIdAndArchivedFalse(UUID tenantId, UUID parentCompanyId);

    long countByTenantIdAndOwnerIdAndArchivedFalse(UUID tenantId, UUID ownerId);
}
