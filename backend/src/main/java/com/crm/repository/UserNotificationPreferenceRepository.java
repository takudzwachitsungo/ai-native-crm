package com.crm.repository;

import com.crm.entity.UserNotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserNotificationPreferenceRepository extends JpaRepository<UserNotificationPreference, UUID> {

    Optional<UserNotificationPreference> findByTenantIdAndUserIdAndArchivedFalse(UUID tenantId, UUID userId);
}
