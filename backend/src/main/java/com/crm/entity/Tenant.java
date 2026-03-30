package com.crm.entity;

import com.crm.entity.enums.TenantTier;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TenantTier tier = TenantTier.FREE;

    @Column(name = "rate_limit_per_minute", nullable = false)
    @Builder.Default
    private Integer rateLimitPerMinute = 100;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "dedicated_database_enabled", nullable = false)
    @Builder.Default
    private Boolean dedicatedDatabaseEnabled = false;

    @Column(name = "database_url", length = 500)
    private String databaseUrl;

    @Column(name = "database_username")
    private String databaseUsername;

    @Column(name = "database_password")
    private String databasePassword;

    @Column(name = "database_driver_class_name", nullable = false)
    @Builder.Default
    private String databaseDriverClassName = "org.postgresql.Driver";

    @Column(name = "database_last_validated_at")
    private LocalDateTime databaseLastValidatedAt;

    @Column(name = "database_last_validation_success")
    private Boolean databaseLastValidationSuccess;

    @Column(name = "database_last_validation_message", length = 500)
    private String databaseLastValidationMessage;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean archived = false;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
