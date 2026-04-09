package com.crm.repository;

import com.crm.entity.Email;
import com.crm.entity.enums.EmailFolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailRepository extends JpaRepository<Email, UUID>, JpaSpecificationExecutor<Email> {
    
    Page<Email> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);
    
    List<Email> findByTenantIdAndFolderAndArchivedFalse(UUID tenantId, EmailFolder folder);
    
    List<Email> findByTenantIdAndIsDraftTrueAndArchivedFalse(UUID tenantId);

    Optional<Email> findByTenantIdAndExternalProviderAndExternalMessageIdAndArchivedFalse(
            UUID tenantId,
            String externalProvider,
            String externalMessageId
    );
}
