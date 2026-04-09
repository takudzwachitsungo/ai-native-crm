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
        name = "workspace_external_sync_links",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"tenant_id", "provider_key", "entity_type", "local_entity_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceExternalSyncLink extends AbstractEntity {

    @Column(name = "provider_key", nullable = false, length = 100)
    private String providerKey;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "local_entity_id", nullable = false)
    private UUID localEntityId;

    @Column(name = "external_id", nullable = false, length = 255)
    private String externalId;

    @Column(name = "external_name", length = 255)
    private String externalName;

    @Column(name = "last_synced_at", nullable = false)
    private LocalDateTime lastSyncedAt;
}
