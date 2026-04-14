package com.crm.tenancy;

import com.crm.service.TenantCredentialCipher;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

@Component
public class TenantDatabaseConfigRegistry {

    private final DataSource masterDataSource;
    private final TenantCredentialCipher tenantCredentialCipher;

    public TenantDatabaseConfigRegistry(
            @Qualifier("masterDataSource") DataSource masterDataSource,
            TenantCredentialCipher tenantCredentialCipher
    ) {
        this.masterDataSource = masterDataSource;
        this.tenantCredentialCipher = tenantCredentialCipher;
    }

    public Optional<TenantDatabaseConfig> findByTenantId(UUID tenantId) {
        String sql = """
                SELECT id, dedicated_database_enabled, database_url, database_username, database_password,
                       database_driver_class_name, database_last_validation_success
                FROM tenants
                WHERE id = ? AND archived = false
                """;

        try (
                Connection connection = masterDataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setObject(1, tenantId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(mapTenantDatabaseConfig(rs)) : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to resolve tenant database config for tenant " + tenantId, ex);
        }
    }

    private TenantDatabaseConfig mapTenantDatabaseConfig(ResultSet rs) throws SQLException {
        return TenantDatabaseConfig.builder()
                .tenantId(rs.getObject("id", UUID.class))
                .dedicatedDatabaseEnabled(rs.getBoolean("dedicated_database_enabled"))
                .databaseUrl(rs.getString("database_url"))
                .databaseUsername(rs.getString("database_username"))
                .databasePassword(tenantCredentialCipher.decrypt(rs.getString("database_password")))
                .databaseDriverClassName(rs.getString("database_driver_class_name"))
                .lastValidationSucceeded(rs.getBoolean("database_last_validation_success"))
                .build();
    }
}
