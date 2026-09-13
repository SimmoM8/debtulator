-- Add account usernames and phone numbers, reserve complete profile data during
-- registration, and expand user discovery to username/name/email/phone.

alter table public.profiles
    add column username text,
    add column phone_number text,
    add column discoverable_by_username boolean not null default true,
    add column discoverable_by_phone boolean not null default false;

-- Existing accounts predate usernames. Give each one a deterministic,
-- collision-free internal username derived from its UUID. Users can later
-- replace this through the normal profile update flow.
update public.profiles
set username = 'user_' || replace(user_id::text, '-', '')
where username is null;

alter table public.profiles
    alter column username set not null;

alter table public.profiles
    add constraint profiles_username_format
        check (
            username = lower(username)
            and username ~ '^[a-z0-9_]{3,40}$'
        ),
    add constraint profiles_phone_number_format
        check (
            phone_number is null
            or phone_number ~ '^\+[1-9][0-9]{7,14}$'
        );

create unique index profiles_username_lower_unique_idx
    on public.profiles (lower(username));

create index profiles_discovery_username_trgm_idx
    on public.profiles
    using gin (lower(username) gin_trgm_ops)
    where member_discovery_enabled = true
      and discoverable_by_username = true;

create index profiles_discovery_phone_idx
    on public.profiles (phone_number)
    where member_discovery_enabled = true
      and discoverable_by_phone = true
      and phone_number is not null;

-- The backend writes a short-lived reservation before calling Supabase Auth.
-- The auth.users trigger consumes it inside the auth-user transaction. This
-- keeps profile setup atomic from the application's point of view even when
-- email verification is required and signup returns no authenticated session.
create table public.pending_account_registrations (
    normalized_email text primary key,
    username text not null unique,
    name text not null,
    phone_number text,
    base_currency text not null
        references public.currencies(code)
        on update cascade
        on delete restrict,
    created_at timestamptz not null,
    expires_at timestamptz not null,

    constraint pending_account_registrations_email_normalized
        check (
            normalized_email = lower(trim(normalized_email))
            and char_length(normalized_email) between 3 and 320
        ),

    constraint pending_account_registrations_username_format
        check (
            username = lower(username)
            and username ~ '^[a-z0-9_]{3,40}$'
        ),

    constraint pending_account_registrations_name_valid
        check (char_length(trim(name)) between 1 and 120),

    constraint pending_account_registrations_phone_format
        check (
            phone_number is null
            or phone_number ~ '^\+[1-9][0-9]{7,14}$'
        ),

    constraint pending_account_registrations_expiry_valid
        check (expires_at > created_at)
);

create index pending_account_registrations_expires_at_idx
    on public.pending_account_registrations (expires_at);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    registration public.pending_account_registrations%rowtype;
begin
    select pending.*
    into registration
    from public.pending_account_registrations pending
    where pending.normalized_email = lower(trim(new.email))
      and pending.expires_at > now()
    limit 1;

    if registration.normalized_email is not null then
        insert into public.profiles (
            user_id,
            username,
            name,
            phone_number,
            base_currency,
            created_at,
            updated_at,
            member_discovery_enabled,
            discoverable_by_username,
            discoverable_by_name,
            discoverable_by_email,
            discoverable_by_phone,
            incoming_member_link_requests_enabled
        )
        values (
            new.id,
            registration.username,
            registration.name,
            registration.phone_number,
            registration.base_currency,
            now(),
            now(),
            true,
            true,
            true,
            true,
            registration.phone_number is not null,
            true
        )
        on conflict (user_id) do nothing;

        delete from public.pending_account_registrations
        where normalized_email = registration.normalized_email;
    else
        -- Preserve safe provisioning for auth users created outside the
        -- Debtulator registration endpoint. Such profiles remain undiscoverable
        -- until they are completed through the backend profile flow.
        insert into public.profiles (
            user_id,
            username,
            name,
            base_currency,
            created_at,
            updated_at
        )
        values (
            new.id,
            'user_' || replace(new.id::text, '-', ''),
            null,
            'SEK',
            now(),
            now()
        )
        on conflict (user_id) do nothing;
    end if;

    return new;
end;
$$;

revoke all privileges
    on function public.handle_new_auth_user()
    from public, anon, authenticated;

revoke all privileges
    on table public.pending_account_registrations
    from anon, authenticated;
