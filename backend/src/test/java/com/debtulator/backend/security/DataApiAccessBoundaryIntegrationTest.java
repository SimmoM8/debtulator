package com.debtulator.backend.security;

import com.debtulator.backend.config.TestDatabaseConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestDatabaseConfiguration.class)
@ActiveProfiles("test")
@SpringBootTest
class DataApiAccessBoundaryIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void enablesRowLevelSecurityOnEveryPublicTable() {
        List<String> tablesWithoutRls = jdbcTemplate.queryForList(
                """
                select class.relname
                from pg_class class
                join pg_namespace namespace
                    on namespace.oid = class.relnamespace
                where namespace.nspname = 'public'
                  and class.relkind = 'r'
                  and not class.relrowsecurity
                order by class.relname
                """,
                String.class
        );

        assertThat(tablesWithoutRls).isEmpty();
        assertThat(jdbcTemplate.queryForObject(
                """
                select count(*)
                from pg_class class
                join pg_namespace namespace
                    on namespace.oid = class.relnamespace
                where namespace.nspname = 'public'
                  and class.relkind = 'r'
                  and class.relname = 'flyway_schema_history'
                  and class.relrowsecurity
                """,
                Integer.class
        )).isEqualTo(1);
    }

    @Test
    void revokesDataApiGrantsAndLegacyDefaultPrivileges() {
        List<String> grantedRelations = jdbcTemplate.queryForList(
                """
                select class.relname
                from pg_class class
                join pg_namespace namespace
                    on namespace.oid = class.relnamespace
                cross join lateral aclexplode(class.relacl) as entry
                where namespace.nspname = 'public'
                  and (
                      entry.grantee = 0
                      or entry.grantee in (
                          select role.oid
                          from pg_roles role
                          where role.rolname in ('anon', 'authenticated', 'service_role')
                      )
                  )
                """,
                String.class
        );
        List<String> remainingDefaults = jdbcTemplate.queryForList(
                """
                select pg_get_userbyid(default_acl.defaclrole)
                    || ':'
                    || default_acl.defaclobjtype::text
                from pg_default_acl default_acl
                join pg_namespace namespace
                    on namespace.oid = default_acl.defaclnamespace
                where namespace.nspname = 'public'
                  and pg_get_userbyid(default_acl.defaclrole) in (current_user, 'postgres')
                  and default_acl.defaclacl::text ~ '(anon|authenticated|service_role)='
                """,
                String.class
        );

        assertThat(grantedRelations).isEmpty();
        assertThat(remainingDefaults).isEmpty();
        assertThat(jdbcTemplate.queryForObject(
                """
                select position('security_invoker=true' in array_to_string(class.reloptions, ',')) > 0
                from pg_class class
                join pg_namespace namespace
                    on namespace.oid = class.relnamespace
                where namespace.nspname = 'public'
                  and class.relname = 'user_discovery_auth_accounts'
                """,
                Boolean.class
        )).isTrue();
    }

    @Test
    void hidesExistingRowsFromAnonEvenWhenSelectIsGranted() {
        UUID userId = UUID.randomUUID();

        jdbcTemplate.execute((Connection connection) -> {
            try (Statement statement = connection.createStatement()) {
                statement.execute(
                        "insert into auth.users (id) values ('" + userId + "')"
                );
                try (ResultSet owned = statement.executeQuery(
                        "select count(*) from public.profiles where user_id = '"
                                + userId
                                + "'"
                )) {
                    assertThat(owned.next()).isTrue();
                    assertThat(owned.getLong(1)).isPositive();
                }

                statement.execute("grant select on public.profiles to anon");
                statement.execute("set role anon");
                try (ResultSet visible = statement.executeQuery(
                        "select count(*) from public.profiles where user_id = '"
                                + userId
                                + "'"
                )) {
                    assertThat(visible.next()).isTrue();
                    assertThat(visible.getLong(1)).isZero();
                }
            } finally {
                try (Statement cleanup = connection.createStatement()) {
                    cleanup.execute("reset role");
                    cleanup.execute(
                            "revoke all privileges on table public.profiles from anon"
                    );
                    cleanup.execute(
                            "delete from auth.users where id = '" + userId + "'"
                    );
                }
            }
            return null;
        });
    }

    @Test
    void enablesRowLevelSecurityOnPublicTablesCreatedLater() {
        jdbcTemplate.execute((Connection connection) -> {
            try (Statement statement = connection.createStatement()) {
                statement.execute(
                        "create table public.rls_trigger_probe (id integer)"
                );
                try (ResultSet flags = statement.executeQuery(
                        """
                        select class.relrowsecurity,
                               has_table_privilege('anon', 'public.rls_trigger_probe', 'SELECT')
                        from pg_class class
                        join pg_namespace namespace
                            on namespace.oid = class.relnamespace
                        where namespace.nspname = 'public'
                          and class.relname = 'rls_trigger_probe'
                        """
                )) {
                    assertThat(flags.next()).isTrue();
                    assertThat(flags.getBoolean(1)).isTrue();
                    assertThat(flags.getBoolean(2)).isFalse();
                }
            } finally {
                try (Statement cleanup = connection.createStatement()) {
                    cleanup.execute("drop table if exists public.rls_trigger_probe");
                }
            }
            return null;
        });
    }
}
