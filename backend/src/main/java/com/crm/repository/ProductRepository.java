package com.crm.repository;

import com.crm.entity.Product;
import com.crm.entity.enums.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {
    
    Page<Product> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Product> findByTenantIdAndStatusAndArchivedFalse(UUID tenantId, ProductStatus status);
    
    Optional<Product> findByTenantIdAndSkuAndArchivedFalse(UUID tenantId, String sku);
    
    boolean existsByTenantIdAndSku(UUID tenantId, String sku);
}
