package com.crm.service.impl;

import com.crm.config.TenantContext;
import com.crm.dto.request.TenantDatabaseSettingsUpdateRequestDTO;
import com.crm.dto.response.TenantDatabaseSettingsResponseDTO;
import com.crm.entity.enums.TenantTier;
import com.crm.exception.BadRequestException;
import com.crm.exception.ResourceNotFoundException;
import com.crm.service.TenantAdminService;
import com.crm.service.TenantCredentialCipher;
import com.crm.service.TenantProvisioningService;
import com.crm.tenancy.TenantRoutingDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Service
@Slf4j
public class TenantAdminServiceImpl implements TenantAdminService {

    private static final String DEFAULT_DRIVER_CLASS_NAME = "org.postgresql.Driver";

    @Qualifier("masterDataSource")
    private final DataSource masterDataSource;
    private final TenantRoutingDataSource tenantRoutingDataSource;
    private final TenantProvisioningService tenantProvisioningService;
    private final TenantCredentialCipher tenantCredentialCipher;

    public TenantAdminServiceImpl(
            @Qualifier("masterDataSource") DataSource masterDataSource,
            TenantRoutingDataSource tenantRoutingDataSource,
            TenantProvisioningService tenantProvisioningService,
            TenantCredentialCipher tenantCredentialCipher
    ) {
        this.masterDataSource = masterDataSource;
        this.tenantRoutingDataSource = tenantRoutingDataSource;
        this.tenantProvisioningService = tenantProvisioningService;
        this.tenantCredentialCipher = tenantCredentialCipher;
    }

    @Override
    public TenantDatabaseSettingsResponseDTO getCurrentTenantDatabaseSettings() {
        return loadTenantRecord(requireTenantId());
    }

    @Override
    public TenantDatabaseSettingsResponseDTO updateCurrentTenantDatabaseSettings(TenantDatabaseSettingsUpdateRequestDTO request) {
        UUID tenantId = requireTenantId();
        TenantDatabaseSettingsResponseDTO current = loadTenantRecord(tenantId);

        boolean dedicatedEnabled = request.getDedicatedDatabaseEnabled() != null
                ? request.getDedicatedDatabaseEnabled()
                : Boolean.TRUE.equals(current.getDedicatedDatabaseEnabled());

        String databaseUrl = firstNonNull(normalize(request.getDatabaseUrl()), emptyToNull(current.getDatabaseUrl()));
        String databaseUsername = firstNonNull(normalize(request.getDatabaseUsername()), emptyToNull(current.getDatabaseUsername()));
        String databasePassword = normalize(request.getDatabasePassword());
        boolean passwordUpdated = databasePassword != null;
        if (!passwordUpdated) {
            databasePassword = loadCurrentPassword(tenantId);
        }
        String driverClassName = firstNonNull(
                normalize(request.getDatabaseDriverClassName()),
                emptyToNull(current.getDatabaseDriverClassName()),
                DEFAULT_DRIVER_CLASS_NAME
        );

        boolean configChanged = !Objects.equals(Boolean.TRUE.equals(current.getDedicatedDatabaseEnabled()), dedicatedEnabled)
                || !Objects.equals(emptyToNull(current.getDatabaseUrl()), databaseUrl)
                || !Objects.equals(emptyToNull(current.getDatabaseUsername()), databaseUsername)
                || !Objects.equals(emptyToNull(current.getDatabaseDriverClassName()), driverClassName)
                || passwordUpdated;

        LocalDateTime validatedAt = configChanged ? null : current.getLastValidatedAt();
        Boolean validationSucceeded = configChanged ? Boolean.FALSE : current.getLastValidationSucceeded();
        String validationMessage = configChanged
                ? dedicatedEnabled
                    ? "Database settings saved. Validate the connection before dedicated routing can activate."
                    : "Dedicated database routing is disabled. Workspace traffic remains on the shared database."
                : current.getLastValidationMessage();

        String sql = """
                UPDATE tenants
                SET dedicated_database_enabled = ?,
                    database_url = ?,
                    database_username = ?,
                    database_password = ?,
                    database_driver_class_name = ?,
                    database_last_validated_at = ?,
                    database_last_validation_success = ?,
                    database_last_validation_message = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND archived = false
                """;

        try (
                Connection connection = masterDataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setBoolean(1, dedicatedEnabled);
            statement.setString(2, databaseUrl);
            statement.setString(3, databaseUsername);
            statement.setString(4, tenantCredentialCipher.encrypt(databasePassword));
            statement.setString(5, driverClassName);
            statement.setTimestamp(6, toTimestamp(validatedAt));
            statement.setObject(7, validationSucceeded);
            statement.setString(8, truncate(validationMessage));
            statement.setObject(9, tenantId);

            int updated = statement.executeUpdate();
            if (updated == 0) {
                throw new ResourceNotFoundException("Tenant", tenantId);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to update tenant database settings for tenant " + tenantId, ex);
        }

        tenantRoutingDataSource.evictTenantDataSource(tenantId);
        log.info("Updated workspace database settings for tenant {}", tenantId);
        return loadTenantRecord(tenantId);
    }

    @Override
    public TenantDatabaseSettingsResponseDTO validateCurrentTenantDatabaseSettings() {
        UUID tenantId = requireTenantId();
        TenantDatabaseSettingsResponseDTO current = loadTenantRecord(tenantId);

        if (!Boolean.TRUE.equals(current.getDedicatedDatabaseEnabled())) {
            throw new BadRequestException("Enable dedicated database routing before validating the connection");
        }

        String password = loadCurrentPassword(tenantId);
        if (!hasText(current.getDatabaseUrl()) || !hasText(current.getDatabaseUsername()) || !hasText(password)) {
            throw new BadRequestException("Database URL, username, and password are required before validation");
        }

        LocalDateTime validatedAt = LocalDateTime.now();
        boolean validationSucceeded = false;
        String validationMessage;

        try {
            String driverClassName = hasText(current.getDatabaseDriverClassName())
                    ? current.getDatabaseDriverClassName()
                    : DEFAULT_DRIVER_CLASS_NAME;
            Class.forName(driverClassName);
            try (Connection connection = java.sql.DriverManager.getConnection(
                    current.getDatabaseUrl(),
                    current.getDatabaseUsername(),
                    password
            )) {
                validationSucceeded = connection.isValid(5);
            }

            validationMessage = validationSucceeded
                    ? "Connection successful. Dedicated routing is ready for this workspace."
                    : "Connection check returned without a valid database connection.";
        } catch (Exception ex) {
            validationMessage = "Validation failed: " + ex.getMessage();
            log.warn("Workspace database validation failed for tenant {}: {}", tenantId, ex.getMessage());
        }

        persistValidationResult(tenantId, validatedAt, validationSucceeded, validationMessage);
        tenantRoutingDataSource.evictTenantDataSource(tenantId);

        if (validationSucceeded) {
            log.info("Validated dedicated workspace database for tenant {}", tenantId);
        }

        return loadTenantRecord(tenantId);
    }

    @Override
    public TenantDatabaseSettingsResponseDTO migrateCurrentTenantToDedicatedDatabase() {
        UUID tenantId = requireTenantId();
        tenantProvisioningService.migrateTenantToDedicatedDatabase(tenantId);
        tenantRoutingDataSource.evictTenantDataSource(tenantId);
        return loadTenantRecord(tenantId);
    }

    private UUID requireTenantId() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            throw new BadRequestException("Tenant context is missing");
        }
        return tenantId;
    }

    private TenantDatabaseSettingsResponseDTO loadTenantRecord(UUID tenantId) {
        String sql = """
                SELECT id, name, slug, tier, dedicated_database_enabled, database_url, database_username,
                       database_password, database_driver_class_name, database_last_validated_at,
                       database_last_validation_success, database_last_validation_message
                FROM tenants
                WHERE id = ? AND archived = false
                """;

        try (
                Connection connection = masterDataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setObject(1, tenantId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    throw new ResourceNotFoundException("Tenant", tenantId);
                }
                return mapResponse(rs);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to load tenant database settings for tenant " + tenantId, ex);
        }
    }

    private TenantDatabaseSettingsResponseDTO mapResponse(ResultSet rs) throws SQLException {
        boolean dedicatedEnabled = rs.getBoolean("dedicated_database_enabled");
        String databaseUrl = rs.getString("database_url");
        String databaseUsername = rs.getString("database_username");
        String databasePassword = rs.getString("database_password");
        Boolean lastValidationSucceeded = rs.getObject("database_last_validation_success") != null
                ? rs.getBoolean("database_last_validation_success")
                : null;
        boolean databaseConfigured = hasText(databaseUrl) && hasText(databaseUsername) && hasText(databasePassword);
        boolean databaseReady = dedicatedEnabled && databaseConfigured && Boolean.TRUE.equals(lastValidationSucceeded);

        return TenantDatabaseSettingsResponseDTO.builder()
                .tenantId(rs.getObject("id", UUID.class))
                .tenantName(rs.getString("name"))
                .tenantSlug(rs.getString("slug"))
                .tenantTier(TenantTier.valueOf(rs.getString("tier")))
                .dedicatedDatabaseEnabled(dedicatedEnabled)
                .databaseUrl(databaseUrl)
                .databaseUsername(databaseUsername)
                .databaseDriverClassName(rs.getString("database_driver_class_name"))
                .passwordConfigured(hasText(databasePassword))
                .databaseConfigured(databaseConfigured)
                .databaseReady(databaseReady)
                .routingMode(databaseReady ? "DEDICATED" : "SHARED")
                .lastValidatedAt(toLocalDateTime(rs.getTimestamp("database_last_validated_at")))
                .lastValidationSucceeded(lastValidationSucceeded)
                .lastValidationMessage(rs.getString("database_last_validation_message"))
                .build();
    }

    private void persistValidationResult(
            UUID tenantId,
            LocalDateTime validatedAt,
            boolean validationSucceeded,
            String validationMessage
    ) {
        String sql = """
                UPDATE tenants
                SET database_last_validated_at = ?,
                    database_last_validation_success = ?,
                    database_last_validation_message = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND archived = false
                """;

        try (
                Connection connection = masterDataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setTimestamp(1, toTimestamp(validatedAt));
            statement.setBoolean(2, validationSucceeded);
            statement.setString(3, truncate(validationMessage));
            statement.setObject(4, tenantId);

            int updated = statement.executeUpdate();
            if (updated == 0) {
                throw new ResourceNotFoundException("Tenant", tenantId);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to persist validation result for tenant " + tenantId, ex);
        }
    }

    private String loadCurrentPassword(UUID tenantId) {
        String sql = """
                SELECT database_password
                FROM tenants
                WHERE id = ? AND archived = false
                """;

        try (
                Connection connection = masterDataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setObject(1, tenantId);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    throw new ResourceNotFoundException("Tenant", tenantId);
                }
                return tenantCredentialCipher.decrypt(rs.getString("database_password"));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to read stored workspace database password for tenant " + tenantId, ex);
        }
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String emptyToNull(String value) {
        return hasText(value) ? value : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Timestamp toTimestamp(LocalDateTime value) {
        return value != null ? Timestamp.valueOf(value) : null;
    }

    private LocalDateTime toLocalDateTime(Timestamp value) {
        return value != null ? value.toLocalDateTime() : null;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 500 ? value : value.substring(0, 500);
    }
}
