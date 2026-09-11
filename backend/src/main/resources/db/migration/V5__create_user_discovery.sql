-- ============================================================================
-- User discovery
--
-- Adds privacy-controlled discovery preferences, efficient display-name search,
-- an exact-email lookup boundary over Supabase Auth, and a durable per-user
-- search rate-limit counter.
--
-- Privacy defaults are fail-closed:
--   - member discovery is disabled by default;
--   - display-name discovery is the default channel once discovery is enabled;
--   - email discovery remains opt-in.
-- ============================================================================


-- ============================================================================
-- Search support
-- ============================================================================

create extension if not exists pg_trgm;


-- ============================================================================
-- Profile discoverability preferences
-- ============================================================================

alter table public.profiles
    add column member_discovery_enabled boolean not null default false;

alter table public.profiles
    add column discoverable_by_display_name boolean not null default true;

alter table public.profiles
    add column discoverable_by_email boolean not null default false;


create index profiles_discovery_display_name_trgm_idx
    on public.profiles
    using gin (
        lower(display_name) gin_trgm_ops
    )
    where member_discovery_enabled = true
      and discoverable_by_display_name = true
      and display_name is not null;


-- ============================================================================
-- Auth identity boundary
--
-- The application needs exact email lookup for users who explicitly allow
-- email discovery. Expose only the two fields discovery needs rather than
-- coupling application queries to the full Supabase auth.users schema.
--
-- Mobile roles cannot access this view.
-- ============================================================================

create view public.user_discovery_auth_accounts
with (security_barrier = true)
as
select
    users.id as user_id,
    users.email
from auth.users users;


revoke all privileges
    on table public.user_discovery_auth_accounts
    from public, anon, authenticated;


-- ============================================================================
-- Durable discovery rate limiting
--
-- One row per authenticated requester provides a fixed one-minute window that
-- works consistently across multiple backend instances.
-- ============================================================================

create table public.user_discovery_rate_limits (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    window_started_at timestamptz not null,

    request_count integer not null,

    constraint user_discovery_rate_limits_request_count_positive
        check (
            request_count > 0
        )
);


revoke all privileges
    on table public.user_discovery_rate_limits
    from anon, authenticated;
