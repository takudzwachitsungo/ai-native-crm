package com.crm.repository;

import com.crm.entity.Contact;
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
public interface ContactRepository extends JpaRepository<Contact, UUID>, JpaSpecificationExecutor<Contact> {
    
    Page<Contact> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Contact> findByTenantIdAndCompanyIdAndArchivedFalse(UUID tenantId, UUID companyId);
    
    @Query("SELECT c FROM Contact c WHERE c.tenantId = :tenantId AND (LOWER(c.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))) AND c.archived = false")
    List<Contact> searchContacts(@Param("tenantId") UUID tenantId, @Param("search") String search);
    
    long countByTenantIdAndArchivedFalse(UUID tenantId);
}
