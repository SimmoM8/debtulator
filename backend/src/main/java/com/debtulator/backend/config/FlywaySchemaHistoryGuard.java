package com.debtulator.backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Enables row-level security on Flyway's history table after migrate() returns.
 * Doing that inside a migration deadlocks: Flyway holds AccessShareLock on
 * public.flyway_schema_history from another connection until the migration
 * finishes, and ENABLE ROW LEVEL SECURITY needs AccessExclusiveLock.
 * V13 already revokes Data API grants on the table.
 */
@Component
public class FlywaySchemaHistoryGuard implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public FlywaySchemaHistoryGuard(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute(
                """
                do $$
                begin
                    if to_regclass('public.flyway_schema_history') is null then
                        return;
                    end if;

                    execute 'alter table public.flyway_schema_history enable row level security';
                    execute 'revoke all privileges on table public.flyway_schema_history from anon, authenticated';

                    if exists (select 1 from pg_roles where rolname = 'service_role') then
                        execute 'revoke all privileges on table public.flyway_schema_history from service_role';
                    end if;
                end
                $$
                """
        );
    }
}
