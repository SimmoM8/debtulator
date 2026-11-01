create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

-- Supabase's legacy new-table defaults. Flyway creates
-- public.flyway_schema_history before migrations run, so this is the grant
-- V13 has to remove. Application migrations revoke anon and authenticated
-- themselves; they do not clear service_role or this default.
alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
    grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
    grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;

create table if not exists auth.users (
    id uuid primary key,
    email text
);
