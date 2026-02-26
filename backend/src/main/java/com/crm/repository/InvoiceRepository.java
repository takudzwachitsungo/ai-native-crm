package com.crm.repository;

import com.crm.entity.Invoice;
import com.crm.entity.enums.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID>, JpaSpecificationExecutor<Invoice> {
    
    Page<Invoice> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    Optional<Invoice> findByTenantIdAndInvoiceNumberAndArchivedFalse(UUID tenantId, String invoiceNumber);
    
    @Query("SELECT i FROM Invoice i WHERE i.tenantId = :tenantId AND i.dueDate < :date AND i.status != 'PAID' AND i.archived = false")
    List<Invoice> findOverdueInvoices(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);
    
    long countByTenantIdAndStatusAndArchivedFalse(UUID tenantId, InvoiceStatus status);
    
    boolean existsByTenantIdAndInvoiceNumber(UUID tenantId, String invoiceNumber);
}
