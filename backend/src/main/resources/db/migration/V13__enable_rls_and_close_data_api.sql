-- Close the Supabase Data API off every public table.
--
-- The phone never reads or writes these tables. It calls the Spring Boot API,
-- and that API connects with JDBC as the table owner (the Supabase `postgres`
-- role). Table owners bypass row-level security unless it is forced, so the
-- API keeps working with no policies defined.
--
-- anon and authenticated do not. With row-level security enabled and no
-- policy, a grant would still return zero rows. service_role bypasses
-- row-level security, so leftover grants to that role are revoked as well.
-- The backend does not use the service-role key for table access.
--
-- Supabase used to grant every new public table, sequence, and function to
-- anon, authenticated, and service_role ("new table grants"). Flyway creates
-- public.flyway_schema_history itself, before any migration can revoke it,
-- and that was the table the security advisor reported. Its grants are
-- revoked here. Enabling row-level security on it takes an exclusive lock,
-- and Flyway holds a shared lock on that table until migrate() returns, so
-- the API enables row-level security in FlywaySchemaHistoryGuard after
-- startup. Default privileges for the migration role are revoked so the next
-- object created by postgres is not auto-exposed. An event trigger enables
-- row-level security on public tables created after this migration. New
-- migrations should still revoke Data API grants themselves; the trigger
-- does not grant or revoke privileges.


-- ============================================================================
-- Existing public tables, views, and sequences
-- ============================================================================

do $$
declare
    relation record;
    routine record;
    data_api_roles text := 'anon, authenticated';
begin
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        data_api_roles := data_api_roles || ', service_role';
    end if;

    for relation in
        select class.relname, class.relkind
        from pg_class class
        join pg_namespace namespace
            on namespace.oid = class.relnamespace
        where namespace.nspname = 'public'
          and class.relkind in ('r', 'p', 'v', 'S')
    loop
        if relation.relkind = 'S' then
            execute format(
                'revoke all privileges on sequence public.%I from %s',
                relation.relname,
                data_api_roles
            );
        elsif relation.relkind = 'v' then
            -- security_invoker stops a later grant on the view from running
            -- the view as its owner and reading auth.users behind the caller.
            execute format(
                'alter view public.%I set (security_invoker = true)',
                relation.relname
            );
            execute format(
                'revoke all privileges on table public.%I from public, %s',
                relation.relname,
                data_api_roles
            );
        elsif relation.relname = 'flyway_schema_history' then
            -- ENABLE ROW LEVEL SECURITY takes AccessExclusiveLock. Flyway
            -- holds AccessShareLock on this table from another connection
            -- until migrate() returns, so altering it here waits forever.
            -- Grants are revoked now. The API enables row-level security
            -- on this table after Flyway releases that lock.
            execute format(
                'revoke all privileges on table public.%I from %s',
                relation.relname,
                data_api_roles
            );
        else
            execute format(
                'alter table public.%I enable row level security',
                relation.relname
            );
            execute format(
                'revoke all privileges on table public.%I from %s',
                relation.relname,
                data_api_roles
            );
        end if;
    end loop;

    -- Extension functions (for example pg_trgm) stay as the extension
    -- installed them. Application functions in public are not callable
    -- through the Data API.
    for routine in
        select procedure.oid::regprocedure as signature
        from pg_proc procedure
        join pg_namespace namespace
            on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'public'
          and not exists (
              select 1
              from pg_depend dependency
              where dependency.objid = procedure.oid
                and dependency.deptype = 'e'
          )
    loop
        execute format(
            'revoke all privileges on function %s from public, %s',
            routine.signature,
            data_api_roles
        );
    end loop;
end
$$;


-- ============================================================================
-- Default privileges for objects created later
-- ============================================================================

do $$
declare
    data_api_roles text := 'anon, authenticated';
begin
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        data_api_roles := data_api_roles || ', service_role';
    end if;

    execute format(
        'alter default privileges in schema public revoke all on tables from %s',
        data_api_roles
    );
    execute format(
        'alter default privileges in schema public revoke all on sequences from %s',
        data_api_roles
    );
    execute format(
        'alter default privileges in schema public revoke all on functions from %s, public',
        data_api_roles
    );

    -- Hosted Flyway connects as postgres, so the statements above already
    -- cover that role. A superuser running this migration under another name
    -- (the test database) must clear postgres as well when that role exists.
    if exists (select 1 from pg_roles where rolname = 'postgres')
       and current_user is distinct from 'postgres' then
        execute format(
            'alter default privileges for role postgres in schema public revoke all on tables from %s',
            data_api_roles
        );
        execute format(
            'alter default privileges for role postgres in schema public revoke all on sequences from %s',
            data_api_roles
        );
        execute format(
            'alter default privileges for role postgres in schema public revoke all on functions from %s, public',
            data_api_roles
        );
    end if;
end
$$;

-- supabase_admin still carries the legacy defaults on existing projects.
-- postgres is not a member of that role, and Supabase does not allow changing
-- its default privileges from this migration. Objects created by postgres
-- (Flyway and the SQL editor) are covered above. Dashboard objects created
-- as supabase_admin are not.
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
        begin
            execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated, service_role';
            execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated, service_role';
            execute 'alter default privileges for role supabase_admin in schema public revoke all on functions from anon, authenticated, service_role, public';
        exception
            when insufficient_privilege then
                raise notice
                    'supabase_admin default privileges were left unchanged: %',
                    sqlerrm;
        end;
    end if;
end
$$;


-- ============================================================================
-- Row-level security for public tables created after this migration
-- ============================================================================

create schema if not exists debtulator_private;

revoke all privileges on schema debtulator_private from public;
revoke all privileges on schema debtulator_private from anon, authenticated;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        execute 'revoke all privileges on schema debtulator_private from service_role';
    end if;
end
$$;

create or replace function debtulator_private.enable_rls_on_new_public_table()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
    command record;
begin
    for command in
        select *
        from pg_event_trigger_ddl_commands()
        where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          and object_type in ('table', 'partitioned table')
          and schema_name = 'public'
    loop
        execute format(
            'alter table if exists %s enable row level security',
            command.object_identity
        );
    end loop;
end;
$$;

revoke all privileges
    on function debtulator_private.enable_rls_on_new_public_table()
    from public, anon, authenticated;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        execute 'revoke all privileges on function debtulator_private.enable_rls_on_new_public_table() from service_role';
    end if;
end
$$;

drop event trigger if exists debtulator_enable_rls_on_new_public_table;

create event trigger debtulator_enable_rls_on_new_public_table
    on ddl_command_end
    when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    execute function debtulator_private.enable_rls_on_new_public_table();


-- ============================================================================
-- Fail the migration if a public object is still exposed
-- ============================================================================

do $$
declare
    missing_rls text;
    still_granted text;
    still_executable text;
    remaining_defaults text;
    invoker_views text;
begin
    select string_agg(class.relname, ', ' order by class.relname)
    into missing_rls
    from pg_class class
    join pg_namespace namespace
        on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relkind = 'r'
      and class.relname <> 'flyway_schema_history'
      and not class.relrowsecurity;

    if missing_rls is not null then
        raise exception
            'public tables without row level security: %',
            missing_rls;
    end if;

    select string_agg(distinct class.relname, ', ' order by class.relname)
    into still_granted
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
      );

    if still_granted is not null then
        raise exception
            'public relations still granted to Data API roles: %',
            still_granted;
    end if;

    select string_agg(procedure.proname, ', ' order by procedure.proname)
    into still_executable
    from pg_proc procedure
    join pg_namespace namespace
        on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and not exists (
          select 1
          from pg_depend dependency
          where dependency.objid = procedure.oid
            and dependency.deptype = 'e'
      )
      and (
          procedure.proacl is null
          or exists (
              select 1
              from aclexplode(procedure.proacl) as entry
              where entry.grantee = 0
                 or entry.grantee in (
                     select role.oid
                     from pg_roles role
                     where role.rolname in ('anon', 'authenticated', 'service_role')
                 )
          )
      );

    if still_executable is not null then
        raise exception
            'public functions still executable by Data API roles: %',
            still_executable;
    end if;

    select string_agg(class.relname, ', ' order by class.relname)
    into invoker_views
    from pg_class class
    join pg_namespace namespace
        on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relkind = 'v'
      and not exists (
          select 1
          from unnest(coalesce(class.reloptions, array[]::text[])) as option
          where option = 'security_invoker=true'
      );

    if invoker_views is not null then
        raise exception
            'public views without security_invoker: %',
            invoker_views;
    end if;

    select string_agg(
        pg_get_userbyid(default_acl.defaclrole) || ':' || default_acl.defaclobjtype::text,
        ', '
    )
    into remaining_defaults
    from pg_default_acl default_acl
    join pg_namespace namespace
        on namespace.oid = default_acl.defaclnamespace
    where namespace.nspname = 'public'
      and pg_get_userbyid(default_acl.defaclrole) in (current_user, 'postgres')
      and default_acl.defaclacl::text ~ '(anon|authenticated|service_role)=';

    if remaining_defaults is not null then
        raise exception
            'public default privileges still grant Data API roles: %',
            remaining_defaults;
    end if;
end
$$;
