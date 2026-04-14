package com.crm.config;

import com.crm.tenancy.TenantDatabaseConfigRegistry;
import com.crm.tenancy.TenantRoutingDataSource;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties masterDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean(name = "masterDataSource")
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource masterDataSource(
            @Qualifier("masterDataSourceProperties") DataSourceProperties masterDataSourceProperties
    ) {
        return masterDataSourceProperties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
    }

    @Bean
    @Primary
    public TenantRoutingDataSource dataSource(
            @Qualifier("masterDataSource") DataSource masterDataSource,
            TenantDatabaseConfigRegistry tenantDatabaseConfigRegistry
    ) {
        return new TenantRoutingDataSource(masterDataSource, tenantDatabaseConfigRegistry);
    }
}
