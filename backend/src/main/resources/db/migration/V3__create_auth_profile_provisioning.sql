-- ============================================================================
-- Auth profile provisioning
--
-- Every Supabase Auth user receives exactly one Debtulator profile row. Keeping
-- this at the database boundary makes account provisioning reliable regardless
-- of which first-party or future third-party authentication flow created the
-- auth.users record.
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        user_id,
        display_name,
        base_currency,
        created_at,
        updated_at
    )
    values (
        new.id,
        null,
        'SEK',
        now(),
        now()
    )
    on conflict (user_id) do nothing;

    return new;
end;
$$;

revoke all privileges
    on function public.handle_new_auth_user()
    from public, anon, authenticated;

insert into public.profiles (
    user_id,
    display_name,
    base_currency,
    created_at,
    updated_at
)
select
    users.id,
    null,
    'SEK',
    now(),
    now()
from auth.users users
where not exists (
    select 1
    from public.profiles profile
    where profile.user_id = users.id
);

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
