package com.crm.service.impl;

import com.crm.entity.Tenant;
import com.crm.entity.User;
import com.crm.exception.BadRequestException;
import com.crm.service.TenantCredentialCipher;
import com.crm.service.TenantProvisioningService;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Array;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
public class TenantProvisioningServiceImpl implements TenantProvisioningService {

    private static final List<String> TENANT_SCOPED_TABLES = List.of(
            "users",
            "companies",
            "contacts",
            "leads",
            "products",
            "deals",
            "tasks",
            "events",
            "quotes",
            "invoices",
            "documents",
            "emails",
            "audit_logs",
            "embeddings"
    );

    private final DataSource masterDataSource;
    private final String masterJdbcUrl;
    private final String masterUsername;
    private final String masterPassword;
    private final boolean provisioningEnabled;
    private final String databaseNamePrefix;
    private final String adminDatabaseName;
    private final TenantCredentialCipher tenantCredentialCipher;

    public TenantProvisioningServiceImpl(
            @Qualifier("masterDataSource") DataSource masterDataSource,
            @Value("${spring.datasource.url}") String masterJdbcUrl,
            @Value("${spring.datasource.username}") String masterUsername,
            @Value("${spring.datasource.password}") String masterPassword,
            @Value("${tenancy.provisioning.enabled:true}") boolean provisioningEnabled,
            @Value("${tenancy.provisioning.database-name-prefix:crm_tenant}") String databaseNamePrefix,
            @Value("${tenancy.provisioning.admin-database-name:postgres}") String adminDatabaseName,
            TenantCredentialCipher tenantCredentialCipher
    ) {
        this.masterDataSource = masterDataSource;
        this.masterJdbcUrl = masterJdbcUrl;
        this.masterUsername = masterUsername;
        this.masterPassword = masterPassword;
        this.provisioningEnabled = provisioningEnabled;
        this.databaseNamePrefix = databaseNamePrefix;
        this.adminDatabaseName = adminDatabaseName;
        this.tenantCredentialCipher = tenantCredentialCipher;
    }

    @Override
    public void provisionTenantDatabase(Tenant tenant, User adminUser) {
        if (!provisioningEnabled) {
            log.info("Automatic tenant database provisioning is disabled; tenant {} will remain on the shared database", tenant.getId());
            return;
        }

        String databaseName = buildDatabaseName(tenant);
        String tenantJdbcUrl = replaceDatabaseName(masterJdbcUrl, databaseName);
        String adminJdbcUrl = replaceDatabaseName(masterJdbcUrl, adminDatabaseName);
        boolean databaseCreated = false;

        try {
            createDatabase(adminJdbcUrl, databaseName);
            databaseCreated = true;

            tenant.setDedicatedDatabaseEnabled(true);
            tenant.setDatabaseUrl(tenantJdbcUrl);
            tenant.setDatabaseUsername(masterUsername);
            tenant.setDatabasePassword(masterPassword);
            tenant.setDatabaseDriverClassName("org.postgresql.Driver");
            tenant.setDatabaseLastValidatedAt(LocalDateTime.now());
            tenant.setDatabaseLastValidationSuccess(true);
            tenant.setDatabaseLastValidationMessage("Dedicated workspace database was provisioned automatically during signup.");

            migrateTenantDatabase(tenantJdbcUrl);
            seedTenantDatabase(tenantJdbcUrl, tenant, adminUser);

            log.info("Provisioned dedicated database {} for tenant {}", databaseName, tenant.getId());
        } catch (Exception ex) {
            if (databaseCreated) {
                try {
                    dropDatabase(adminJdbcUrl, databaseName);
                } catch (Exception cleanupEx) {
                    log.error("Failed to clean up tenant database {} after provisioning error: {}", databaseName, cleanupEx.getMessage());
                }
            }
            throw new BadRequestException("Could not provision a dedicated workspace database: " + ex.getMessage());
        }
    }

    @Override
    public void migrateTenantToDedicatedDatabase(UUID tenantId) {
        if (!provisioningEnabled) {
            throw new BadRequestException("Automatic tenant database provisioning is disabled");
        }

        Tenant tenant = loadTenantFromMaster(tenantId);
        if (Boolean.TRUE.equals(tenant.getDedicatedDatabaseEnabled()) || hasText(tenant.getDatabaseUrl())) {
            throw new BadRequestException("This workspace is already configured for dedicated database routing");
        }

        String databaseName = buildDatabaseName(tenant);
        String tenantJdbcUrl = replaceDatabaseName(masterJdbcUrl, databaseName);
        String adminJdbcUrl = replaceDatabaseName(masterJdbcUrl, adminDatabaseName);
        boolean databaseCreated = false;

        try {
            createDatabase(adminJdbcUrl, databaseName);
            databaseCreated = true;

            tenant.setDedicatedDatabaseEnabled(true);
            tenant.setDatabaseUrl(tenantJdbcUrl);
            tenant.setDatabaseUsername(masterUsername);
            tenant.setDatabasePassword(masterPassword);
            tenant.setDatabaseDriverClassName("org.postgresql.Driver");
            tenant.setDatabaseLastValidatedAt(LocalDateTime.now());
            tenant.setDatabaseLastValidationSuccess(true);
            tenant.setDatabaseLastValidationMessage("Workspace data was migrated from the shared database into a dedicated database.");

            migrateTenantDatabase(tenantJdbcUrl);
            copySharedTenantDataToDedicatedDatabase(tenant, tenantJdbcUrl);
            persistDedicatedTenantSettings(tenant);

            log.info("Migrated tenant {} from shared database into dedicated database {}", tenantId, databaseName);
        } catch (Exception ex) {
            if (databaseCreated) {
                try {
                    dropDatabase(adminJdbcUrl, databaseName);
                } catch (Exception cleanupEx) {
                    log.error("Failed to clean up tenant database {} after migration error: {}", databaseName, cleanupEx.getMessage());
                }
            }
            throw new BadRequestException("Could not migrate workspace to a dedicated database: " + ex.getMessage());
        }
    }

    private void createDatabase(String adminJdbcUrl, String databaseName) throws SQLException {
        try (
                Connection connection = DriverManager.getConnection(adminJdbcUrl, masterUsername, masterPassword);
                Statement statement = connection.createStatement()
        ) {
            if (databaseExists(connection, databaseName)) {
                throw new BadRequestException("Provisioned database name already exists: " + databaseName);
            }
            statement.execute("CREATE DATABASE \"" + databaseName + "\"");
        }
    }

    private boolean databaseExists(Connection connection, String databaseName) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
            statement.setString(1, databaseName);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        }
    }

    private void migrateTenantDatabase(String tenantJdbcUrl) {
        Flyway.configure()
                .dataSource(tenantJdbcUrl, masterUsername, masterPassword)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .validateOnMigrate(true)
                .load()
                .migrate();
    }

    private void seedTenantDatabase(String tenantJdbcUrl, Tenant tenant, User adminUser) throws SQLException {
        try (Connection connection = DriverManager.getConnection(tenantJdbcUrl, masterUsername, masterPassword)) {
            connection.setAutoCommit(false);
            try {
                insertTenant(connection, tenant);
                insertAdminUser(connection, tenant, adminUser);
                connection.commit();
            } catch (Exception ex) {
                connection.rollback();
                throw ex;
            } finally {
                connection.setAutoCommit(true);
            }
        }
    }

    private void insertTenant(Connection connection, Tenant tenant) throws SQLException {
        String sql = """
                INSERT INTO tenants (
                    id, name, slug, tier, rate_limit_per_minute, is_active,
                    dedicated_database_enabled, database_url, database_username, database_password,
                    database_driver_class_name, database_last_validated_at, database_last_validation_success,
                    database_last_validation_message, created_at, updated_at, archived
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, tenant.getId());
            statement.setString(2, tenant.getName());
            statement.setString(3, tenant.getSlug());
            statement.setString(4, tenant.getTier().name());
            statement.setInt(5, tenant.getRateLimitPerMinute());
            statement.setBoolean(6, Boolean.TRUE.equals(tenant.getIsActive()));
            statement.setBoolean(7, true);
            statement.setString(8, tenant.getDatabaseUrl());
            statement.setString(9, masterUsername);
            statement.setString(10, tenantCredentialCipher.encrypt(masterPassword));
            statement.setString(11, "org.postgresql.Driver");
            statement.setTimestamp(12, toTimestamp(LocalDateTime.now()));
            statement.setObject(13, true);
            statement.setString(14, "Dedicated workspace database was provisioned automatically during signup.");
            statement.setTimestamp(15, toTimestamp(nowOrDefault(tenant.getCreatedAt())));
            statement.setTimestamp(16, toTimestamp(nowOrDefault(tenant.getUpdatedAt())));
            statement.setBoolean(17, Boolean.TRUE.equals(tenant.getArchived()));
            statement.executeUpdate();
        }
    }

    private void insertAdminUser(Connection connection, Tenant tenant, User adminUser) throws SQLException {
        String sql = """
                INSERT INTO users (
                    id, tenant_id, first_name, last_name, email, password, role, avatar,
                    is_active, last_login_at, created_at, updated_at, created_by, updated_by, archived
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, adminUser.getId());
            statement.setObject(2, tenant.getId());
            statement.setString(3, adminUser.getFirstName());
            statement.setString(4, adminUser.getLastName());
            statement.setString(5, adminUser.getEmail());
            statement.setString(6, adminUser.getPassword());
            statement.setString(7, adminUser.getRole().name());
            statement.setString(8, adminUser.getAvatar());
            statement.setBoolean(9, Boolean.TRUE.equals(adminUser.getIsActive()));
            statement.setTimestamp(10, toTimestamp(adminUser.getLastLoginAt()));
            statement.setTimestamp(11, toTimestamp(nowOrDefault(adminUser.getCreatedAt())));
            statement.setTimestamp(12, toTimestamp(nowOrDefault(adminUser.getUpdatedAt())));
            statement.setObject(13, adminUser.getCreatedBy());
            statement.setObject(14, adminUser.getUpdatedBy());
            statement.setBoolean(15, Boolean.TRUE.equals(adminUser.getArchived()));
            statement.executeUpdate();
        }
    }

    private void dropDatabase(String adminJdbcUrl, String databaseName) throws SQLException {
        try (
                Connection connection = DriverManager.getConnection(adminJdbcUrl, masterUsername, masterPassword);
                Statement statement = connection.createStatement()
        ) {
            statement.execute("DROP DATABASE IF EXISTS \"" + databaseName + "\"");
        }
    }

    private Tenant loadTenantFromMaster(UUID tenantId) {
        String sql = """
                SELECT id, name, slug, tier, rate_limit_per_minute, is_active,
                       dedicated_database_enabled, database_url, database_username, database_password,
                       database_driver_class_name, database_last_validated_at, database_last_validation_success,
                       database_last_validation_message, created_at, updated_at, archived
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
                    throw new BadRequestException("Workspace not found");
                }
                return mapTenant(rs);
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to load workspace from master database", ex);
        }
    }

    private Tenant mapTenant(ResultSet rs) throws SQLException {
        Tenant tenant = new Tenant();
        tenant.setId(rs.getObject("id", UUID.class));
        tenant.setName(rs.getString("name"));
        tenant.setSlug(rs.getString("slug"));
        tenant.setTier(com.crm.entity.enums.TenantTier.valueOf(rs.getString("tier")));
        tenant.setRateLimitPerMinute(rs.getInt("rate_limit_per_minute"));
        tenant.setIsActive(rs.getBoolean("is_active"));
        tenant.setDedicatedDatabaseEnabled(rs.getBoolean("dedicated_database_enabled"));
        tenant.setDatabaseUrl(rs.getString("database_url"));
        tenant.setDatabaseUsername(rs.getString("database_username"));
        tenant.setDatabasePassword(tenantCredentialCipher.decrypt(rs.getString("database_password")));
        tenant.setDatabaseDriverClassName(rs.getString("database_driver_class_name"));
        tenant.setDatabaseLastValidatedAt(toLocalDateTime(rs.getTimestamp("database_last_validated_at")));
        tenant.setDatabaseLastValidationSuccess((Boolean) rs.getObject("database_last_validation_success"));
        tenant.setDatabaseLastValidationMessage(rs.getString("database_last_validation_message"));
        tenant.setCreatedAt(toLocalDateTime(rs.getTimestamp("created_at")));
        tenant.setUpdatedAt(toLocalDateTime(rs.getTimestamp("updated_at")));
        tenant.setArchived(rs.getBoolean("archived"));
        return tenant;
    }

    private void copySharedTenantDataToDedicatedDatabase(Tenant tenant, String tenantJdbcUrl) throws SQLException {
        try (
                Connection sourceConnection = masterDataSource.getConnection();
                Connection targetConnection = DriverManager.getConnection(tenantJdbcUrl, masterUsername, masterPassword)
        ) {
            targetConnection.setAutoCommit(false);
            try {
                insertTenant(targetConnection, tenant);
                for (String tableName : TENANT_SCOPED_TABLES) {
                    copyTableRowsByTenant(sourceConnection, targetConnection, tableName, tenant.getId());
                }
                copyQuoteLineItems(sourceConnection, targetConnection, tenant.getId());
                copyInvoiceLineItems(sourceConnection, targetConnection, tenant.getId());
                targetConnection.commit();
            } catch (Exception ex) {
                targetConnection.rollback();
                throw ex;
            } finally {
                targetConnection.setAutoCommit(true);
            }
        }
    }

    private void copyTableRowsByTenant(Connection sourceConnection, Connection targetConnection, String tableName, UUID tenantId)
            throws SQLException {
        copyRows(
                sourceConnection,
                targetConnection,
                "SELECT * FROM " + tableName + " WHERE tenant_id = ?",
                tableName,
                tenantId
        );
    }

    private void copyQuoteLineItems(Connection sourceConnection, Connection targetConnection, UUID tenantId) throws SQLException {
        copyRows(
                sourceConnection,
                targetConnection,
                """
                SELECT qli.*
                FROM quote_line_items qli
                INNER JOIN quotes q ON q.id = qli.quote_id
                WHERE q.tenant_id = ?
                ORDER BY q.issue_date ASC, qli.id ASC
                """,
                "quote_line_items",
                tenantId
        );
    }

    private void copyInvoiceLineItems(Connection sourceConnection, Connection targetConnection, UUID tenantId) throws SQLException {
        copyRows(
                sourceConnection,
                targetConnection,
                """
                SELECT ili.*
                FROM invoice_line_items ili
                INNER JOIN invoices i ON i.id = ili.invoice_id
                WHERE i.tenant_id = ?
                ORDER BY i.issue_date ASC, ili.id ASC
                """,
                "invoice_line_items",
                tenantId
        );
    }

    private void copyRows(
            Connection sourceConnection,
            Connection targetConnection,
            String selectSql,
            String targetTable,
            UUID tenantId
    ) throws SQLException {
        try (PreparedStatement select = sourceConnection.prepareStatement(selectSql)) {
            select.setObject(1, tenantId);
            try (ResultSet rs = select.executeQuery()) {
                ResultSetMetaData metaData = rs.getMetaData();
                int columnCount = metaData.getColumnCount();
                List<String> columns = new ArrayList<>(columnCount);
                for (int i = 1; i <= columnCount; i++) {
                    columns.add(metaData.getColumnName(i));
                }

                String insertSql = "INSERT INTO " + targetTable + " (" + String.join(", ", columns) + ") VALUES ("
                        + String.join(", ", java.util.Collections.nCopies(columnCount, "?")) + ")";

                try (PreparedStatement insert = targetConnection.prepareStatement(insertSql)) {
                    int batchSize = 0;
                    while (rs.next()) {
                        bindRowValues(targetConnection, insert, rs, metaData, columnCount);
                        insert.addBatch();
                        batchSize++;

                        if (batchSize % 100 == 0) {
                            insert.executeBatch();
                        }
                    }

                    if (batchSize > 0) {
                        insert.executeBatch();
                    }
                }
            }
        }
    }

    private void bindRowValues(
            Connection targetConnection,
            PreparedStatement insert,
            ResultSet rs,
            ResultSetMetaData metaData,
            int columnCount
    ) throws SQLException {
        for (int i = 1; i <= columnCount; i++) {
            Object value = rs.getObject(i);
            if (value == null) {
                insert.setObject(i, null);
                continue;
            }

            if (value instanceof Array sourceArray) {
                Object rawArray = sourceArray.getArray();
                if (rawArray instanceof Object[] values) {
                    Array targetArray = targetConnection.createArrayOf(normalizeArrayType(sourceArray.getBaseTypeName()), values);
                    insert.setArray(i, targetArray);
                } else {
                    insert.setObject(i, rawArray);
                }
                continue;
            }

            insert.setObject(i, value);
        }
    }

    private String normalizeArrayType(String baseTypeName) {
        if (baseTypeName == null) {
            return "text";
        }

        return switch (baseTypeName.toLowerCase(Locale.ROOT)) {
            case "varchar", "text", "bpchar" -> "text";
            case "uuid" -> "uuid";
            default -> baseTypeName;
        };
    }

    private void persistDedicatedTenantSettings(Tenant tenant) throws SQLException {
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
                WHERE id = ?
                """;

        try (
                Connection connection = masterDataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)
        ) {
            statement.setBoolean(1, Boolean.TRUE.equals(tenant.getDedicatedDatabaseEnabled()));
            statement.setString(2, tenant.getDatabaseUrl());
            statement.setString(3, tenant.getDatabaseUsername());
            statement.setString(4, tenantCredentialCipher.encrypt(tenant.getDatabasePassword()));
            statement.setString(5, tenant.getDatabaseDriverClassName());
            statement.setTimestamp(6, toTimestamp(tenant.getDatabaseLastValidatedAt()));
            statement.setObject(7, tenant.getDatabaseLastValidationSuccess());
            statement.setString(8, tenant.getDatabaseLastValidationMessage());
            statement.setObject(9, tenant.getId());
            statement.executeUpdate();
        }
    }

    private String buildDatabaseName(Tenant tenant) {
        String tenantSlug = tenant.getSlug() != null ? tenant.getSlug() : "tenant";
        String sanitizedSlug = tenantSlug.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_");
        String suffix = tenant.getId().toString().replace("-", "").substring(0, 8);
        String candidate = databaseNamePrefix + "_" + sanitizedSlug + "_" + suffix;
        return candidate.length() <= 63 ? candidate : candidate.substring(0, 63);
    }

    private String replaceDatabaseName(String jdbcUrl, String databaseName) {
        int queryIndex = jdbcUrl.indexOf('?');
        String querySuffix = queryIndex >= 0 ? jdbcUrl.substring(queryIndex) : "";
        String base = queryIndex >= 0 ? jdbcUrl.substring(0, queryIndex) : jdbcUrl;
        int slashIndex = base.lastIndexOf('/');
        if (slashIndex < 0) {
            throw new BadRequestException("Unsupported JDBC URL for tenant provisioning");
        }
        return base.substring(0, slashIndex + 1) + databaseName + querySuffix;
    }

    private LocalDateTime nowOrDefault(LocalDateTime value) {
        return value != null ? value : LocalDateTime.now();
    }

    private LocalDateTime toLocalDateTime(Timestamp value) {
        return value != null ? value.toLocalDateTime() : null;
    }

    private Timestamp toTimestamp(LocalDateTime value) {
        return value != null ? Timestamp.valueOf(value) : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
