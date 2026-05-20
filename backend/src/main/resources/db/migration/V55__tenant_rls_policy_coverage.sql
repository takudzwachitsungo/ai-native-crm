-- V55: Refresh tenant RLS policy coverage for all tenant-aware tables.
--
-- Earlier RLS setup covered the original core tables only. This migration
-- catches newer enterprise modules and adds WITH CHECK clauses so writes are
-- constrained to the active tenant as well as reads.

DO $$
DECLARE
    table_identifier text;
    policy_identifier text;
    tenant_tables text[] := ARRAY[
        'users',
        'leads',
        'companies',
        'contacts',
        'deals',
        'products',
        'tasks',
        'events',
        'quotes',
        'invoices',
        'documents',
        'emails',
        'audit_logs',
        'embeddings',
        'territories',
        'workflow_rules',
        'automation_runs',
        'campaigns',
        'support_cases',
        'campaign_segments',
        'nurture_journeys',
        'nurture_journey_steps',
        'automation_rules',
        'contracts',
        'work_orders',
        'workspace_integrations',
        'workspace_external_sync_links',
        'user_notification_preferences',
        'user_sessions',
        'user_push_subscriptions',
        'user_push_notifications',
        'password_reset_tokens',
        'standard_report_definitions'
    ];
BEGIN
    FOREACH table_identifier IN ARRAY tenant_tables LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = table_identifier
              AND column_name = 'tenant_id'
        ) THEN
            policy_identifier := table_identifier || '_tenant_isolation';
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_identifier);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_identifier, table_identifier);
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
                policy_identifier,
                table_identifier
            );
        END IF;
    END LOOP;
END $$;
