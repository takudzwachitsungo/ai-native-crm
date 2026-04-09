package com.crm.repository;

import com.crm.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    Optional<UserSession> findByTenantIdAndUserIdAndIdAndArchivedFalse(UUID tenantId, UUID userId, UUID id);

    List<UserSession> findByTenantIdAndUserIdAndArchivedFalseOrderByLastUsedAtDesc(UUID tenantId, UUID userId);

    List<UserSession> findByTenantIdAndArchivedFalse(UUID tenantId);

    long countByTenantIdAndArchivedFalseAndRevokedAtIsNull(UUID tenantId);

    long countByTenantIdAndArchivedFalseAndRevokedAtIsNullAndLastUsedAtBefore(UUID tenantId, LocalDateTime cutoff);
}
