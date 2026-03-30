package com.crm.service.impl;

import com.crm.entity.Tenant;
import com.crm.repository.TenantRepository;
import com.crm.service.TenantCredentialCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DedicatedDatabaseMigrationService implements ApplicationRunner {

    private final TenantRepository tenantRepository;
    private final TenantCredentialCipher tenantCredentialCipher;

    @Override
    public void run(ApplicationArguments args) {
        List<Tenant> tenants = tenantRepository.findAllByDedicatedDatabaseEnabledTrueAndArchivedFalse();
        if (tenants.isEmpty()) {
            return;
        }

        Set<String> migratedUrls = new HashSet<>();
        for (Tenant tenant : tenants) {
            if (!hasText(tenant.getDatabaseUrl())
                    || !hasText(tenant.getDatabaseUsername())
                    || !hasText(tenant.getDatabasePassword())) {
                log.warn("Skipping dedicated migration for tenant {} because database credentials are incomplete", tenant.getId());
                continue;
            }

            if (!migratedUrls.add(tenant.getDatabaseUrl())) {
                continue;
            }

            try {
                Flyway.configure()
                        .dataSource(
                                tenant.getDatabaseUrl(),
                                tenant.getDatabaseUsername(),
                                tenantCredentialCipher.decrypt(tenant.getDatabasePassword())
                        )
                        .locations("classpath:db/migration")
                        .baselineOnMigrate(true)
                        .validateOnMigrate(true)
                        .load()
                        .migrate();

                log.info("Applied Flyway migrations to dedicated database for tenant {}", tenant.getId());
            } catch (Exception ex) {
                log.error("Failed to migrate dedicated database for tenant {}: {}", tenant.getId(), ex.getMessage(), ex);
            }
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
