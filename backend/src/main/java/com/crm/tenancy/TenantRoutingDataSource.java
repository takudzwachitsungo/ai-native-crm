package com.crm.tenancy;

import com.crm.config.TenantContext;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.jdbc.datasource.AbstractDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class TenantRoutingDataSource extends AbstractDataSource implements DisposableBean {

    private final DataSource defaultDataSource;
    private final TenantDatabaseConfigRegistry tenantDatabaseConfigRegistry;
    private final Map<UUID, DataSource> dedicatedDataSources = new ConcurrentHashMap<>();

    public TenantRoutingDataSource(
            DataSource defaultDataSource,
            TenantDatabaseConfigRegistry tenantDatabaseConfigRegistry
    ) {
        this.defaultDataSource = defaultDataSource;
        this.tenantDatabaseConfigRegistry = tenantDatabaseConfigRegistry;
    }

    @Override
    public Connection getConnection() throws SQLException {
        return resolveDataSource().getConnection();
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return resolveDataSource().getConnection(username, password);
    }

    @Override
    public void destroy() {
        dedicatedDataSources.values().forEach(dataSource -> {
            if (dataSource instanceof HikariDataSource hikariDataSource) {
                hikariDataSource.close();
            }
        });
    }

    public void evictTenantDataSource(UUID tenantId) {
        DataSource dataSource = dedicatedDataSources.remove(tenantId);
        if (dataSource instanceof HikariDataSource hikariDataSource) {
            hikariDataSource.close();
        }
    }

    private DataSource resolveDataSource() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            return defaultDataSource;
        }

        return tenantDatabaseConfigRegistry.findByTenantId(tenantId)
                .filter(this::isDedicatedDatabaseConfigured)
                .map(config -> dedicatedDataSources.computeIfAbsent(tenantId, ignored -> buildDedicatedDataSource(config)))
                .orElse(defaultDataSource);
    }

    private boolean isDedicatedDatabaseConfigured(TenantDatabaseConfig config) {
        return config.isDedicatedDatabaseEnabled()
                && hasText(config.getDatabaseUrl())
                && hasText(config.getDatabaseUsername())
                && hasText(config.getDatabasePassword())
                && config.isLastValidationSucceeded();
    }

    private DataSource buildDedicatedDataSource(TenantDatabaseConfig config) {
        log.info("Creating dedicated datasource for tenant {}", config.getTenantId());

        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setJdbcUrl(config.getDatabaseUrl());
        hikariConfig.setUsername(config.getDatabaseUsername());
        hikariConfig.setPassword(config.getDatabasePassword());
        hikariConfig.setDriverClassName(
                hasText(config.getDatabaseDriverClassName()) ? config.getDatabaseDriverClassName() : "org.postgresql.Driver"
        );
        hikariConfig.setPoolName("tenant-" + config.getTenantId());
        hikariConfig.setMaximumPoolSize(5);
        hikariConfig.setMinimumIdle(1);
        hikariConfig.setConnectionTimeout(30000);
        hikariConfig.setIdleTimeout(600000);
        hikariConfig.setMaxLifetime(1800000);

        return new HikariDataSource(hikariConfig);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
