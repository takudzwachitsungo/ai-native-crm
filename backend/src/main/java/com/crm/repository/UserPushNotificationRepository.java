package com.crm.repository;

import com.crm.entity.UserPushNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface UserPushNotificationRepository extends JpaRepository<UserPushNotification, UUID> {

    @Query("""
            SELECT notification
            FROM UserPushNotification notification
            WHERE notification.tenantId = :tenantId
              AND notification.deviceToken = :deviceToken
              AND notification.archived = false
              AND notification.fetchedAt IS NULL
              AND (notification.expiresAt IS NULL OR notification.expiresAt > :now)
            ORDER BY notification.createdAt ASC
            """)
    List<UserPushNotification> findPendingNotifications(
            @Param("tenantId") UUID tenantId,
            @Param("deviceToken") String deviceToken,
            @Param("now") LocalDateTime now
    );
}
