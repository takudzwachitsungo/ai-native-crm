package com.crm.repository;

import com.crm.entity.User;
import com.crm.entity.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    
    Optional<User> findByEmailAndArchivedFalse(String email);

    List<User> findAllByEmailAndArchivedFalse(String email);
    
    Optional<User> findByTenantIdAndEmailAndArchivedFalse(UUID tenantId, String email);
    
    List<User> findByTenantIdAndArchivedFalse(UUID tenantId);

    List<User> findByTenantIdAndIsActiveTrueAndArchivedFalse(UUID tenantId);

    List<User> findByTenantIdAndRoleInAndIsActiveTrueAndArchivedFalse(UUID tenantId, Collection<UserRole> roles);

    Page<User> findByTenantIdAndArchivedFalse(UUID tenantId, Pageable pageable);

    Optional<User> findByIdAndTenantIdAndArchivedFalse(UUID id, UUID tenantId);

    long countByTenantIdAndTerritoryAndArchivedFalse(UUID tenantId, String territory);
    
    boolean existsByTenantIdAndEmail(UUID tenantId, String email);

    boolean existsByEmailAndArchivedFalse(String email);
}
