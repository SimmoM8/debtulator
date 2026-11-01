-- V13 revoked the existing Data API grants and schema-local defaults.
-- PostgreSQL still grants EXECUTE on newly created functions to PUBLIC through
-- its global defaults. A schema-local REVOKE cannot cancel a global grant.
--
-- Revoke the default EXECUTE privilege for functions created by the Flyway
-- connection role. This affects future functions in all schemas for that role,
-- not existing functions or functions created by unrelated roles. Functions
-- requiring direct execution by another role must be granted explicitly.

do $$
declare
    data_api_roles text := 'public, anon, authenticated';
begin
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        data_api_roles := data_api_roles || ', service_role';
    end if;

    execute format(
        'alter default privileges revoke execute on functions from %s',
        data_api_roles
    );

    -- Hosted Flyway runs as postgres. Testcontainers runs Flyway under a
    -- separate superuser, so cover postgres explicitly in that environment.
    if exists (select 1 from pg_roles where rolname = 'postgres')
       and current_user is distinct from 'postgres' then
        execute format(
            'alter default privileges for role postgres revoke execute on functions from %s',
            data_api_roles
        );
    end if;
end
$$;
