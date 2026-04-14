package com.crm.repository;

import com.crm.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID>, JpaSpecificationExecutor<Document> {
    
    Page<Document> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Document> findByTenantIdAndRelatedEntityTypeAndRelatedEntityIdAndArchivedFalse(
        UUID tenantId, String relatedEntityType, UUID relatedEntityId
    );
}
