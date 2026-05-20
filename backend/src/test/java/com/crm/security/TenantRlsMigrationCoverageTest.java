package com.crm.security;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class TenantRlsMigrationCoverageTest {

    @Test
    void rlsCoverageMigrationIncludesTenantOwnedTables() throws IOException {
        String migration = Files.readString(Path.of("src/main/resources/db/migration/V55__tenant_rls_policy_coverage.sql"));
        List<String> expectedTables = List.of(
                "users",
                "leads",
                "companies",
                "contacts",
                "deals",
                "products",
                "tasks",
                "events",
                "quotes",
                "invoices",
                "documents",
                "emails",
                "campaigns",
                "support_cases",
                "contracts",
                "work_orders",
                "workspace_integrations",
                "standard_report_definitions"
        );

        List<String> missingTables = expectedTables.stream()
                .filter(table -> !migration.contains("'" + table + "'"))
                .toList();

        assertTrue(missingTables.isEmpty(), () -> "Missing tenant RLS coverage for: " + missingTables);
        assertTrue(migration.contains("ENABLE ROW LEVEL SECURITY"));
        assertTrue(migration.contains("app.current_tenant_id"));
    }
}
