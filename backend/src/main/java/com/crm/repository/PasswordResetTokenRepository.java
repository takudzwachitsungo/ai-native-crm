package com.crm.repository;

import com.crm.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    List<PasswordResetToken> findByTenantIdAndUserIdAndUsedAtIsNullAndArchivedFalse(UUID tenantId, UUID userId);

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNullAndArchivedFalse(String tokenHash);
}
