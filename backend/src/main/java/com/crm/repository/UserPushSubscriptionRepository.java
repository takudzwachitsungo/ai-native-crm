package com.crm.repository;

import com.crm.entity.UserPushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPushSubscriptionRepository extends JpaRepository<UserPushSubscription, UUID> {

    List<UserPushSubscription> findByTenantIdAndUserIdAndArchivedFalse(UUID tenantId, UUID userId);

    Optional<UserPushSubscription> findByTenantIdAndUserIdAndEndpointAndArchivedFalse(UUID tenantId, UUID userId, String endpoint);

    Optional<UserPushSubscription> findByDeviceTokenAndArchivedFalse(String deviceToken);
}
