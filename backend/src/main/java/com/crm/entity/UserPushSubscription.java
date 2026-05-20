package com.crm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "user_push_subscriptions",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"tenant_id", "user_id", "endpoint"}),
                @UniqueConstraint(columnNames = {"device_token"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPushSubscription extends AbstractEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "device_token", nullable = false, length = 120)
    private String deviceToken;

    @Column(name = "endpoint", nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    @Column(name = "expiration_time")
    private LocalDateTime expirationTime;

    @Column(name = "p256dh_key", columnDefinition = "TEXT")
    private String p256dhKey;

    @Column(name = "auth_key", columnDefinition = "TEXT")
    private String authKey;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "last_push_attempt_at")
    private LocalDateTime lastPushAttemptAt;

    @Column(name = "last_push_succeeded")
    private Boolean lastPushSucceeded;

    @Column(name = "last_push_status", length = 255)
    private String lastPushStatus;
}
