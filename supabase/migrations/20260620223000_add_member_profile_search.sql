-- Additive deployment for signed-up member discovery. The profiles table stays
-- owner-only; authenticated users receive only bounded, query-matching rows.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists country text;

-- A profile must be created server-side because email-confirmation signups do
-- not have an authenticated session that can satisfy the profiles RLS policy.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_currency text := metadata ->> 'base_currency';
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    display_name,
    email,
    phone,
    country,
    base_currency
  )
  values (
    new.id,
    nullif(trim(metadata ->> 'first_name'), ''),
    nullif(trim(metadata ->> 'last_name'), ''),
    coalesce(
      nullif(trim(metadata ->> 'display_name'), ''),
      nullif(trim(concat_ws(' ', metadata ->> 'first_name', metadata ->> 'last_name')), ''),
      new.email,
      'Debtulator user'
    ),
    new.email,
    nullif(trim(metadata ->> 'phone'), ''),
    nullif(trim(metadata ->> 'country'), ''),
    case
      when requested_currency in ('SEK', 'AUD', 'EUR', 'USD', 'GBP') then requested_currency
      else 'SEK'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Populate profiles for accounts created before the trigger existed.
insert into public.profiles (
  id,
  first_name,
  last_name,
  display_name,
  email,
  phone,
  country,
  base_currency
)
select
  auth_user.id,
  nullif(trim(auth_user.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(auth_user.raw_user_meta_data ->> 'last_name'), ''),
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', auth_user.raw_user_meta_data ->> 'first_name', auth_user.raw_user_meta_data ->> 'last_name')), ''),
    auth_user.email,
    'Debtulator user'
  ),
  auth_user.email,
  nullif(trim(auth_user.raw_user_meta_data ->> 'phone'), ''),
  nullif(trim(auth_user.raw_user_meta_data ->> 'country'), ''),
  case
    when auth_user.raw_user_meta_data ->> 'base_currency' in ('SEK', 'AUD', 'EUR', 'USD', 'GBP')
      then auth_user.raw_user_meta_data ->> 'base_currency'
    else 'SEK'
  end
from auth.users auth_user
on conflict (id) do nothing;

create or replace function public.search_member_profiles(
  search_query text,
  result_limit integer default 8
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  base_currency text
)
language sql
security definer
set search_path = public
stable
as $$
  with query as (
    select trim(translate(search_query, '%_', '')) as value
  )
  select
    profile.id,
    profile.first_name,
    profile.last_name,
    profile.display_name,
    profile.email,
    profile.phone,
    profile.avatar_url,
    profile.base_currency
  from public.profiles profile
  cross join query
  where auth.uid() is not null
    and profile.id <> auth.uid()
    and length(query.value) >= 2
    and (
      profile.display_name ilike '%' || query.value || '%'
      or coalesce(profile.first_name, '') ilike '%' || query.value || '%'
      or coalesce(profile.last_name, '') ilike '%' || query.value || '%'
      or coalesce(profile.email, '') ilike '%' || query.value || '%'
      or coalesce(profile.phone, '') ilike '%' || query.value || '%'
    )
  order by
    case when lower(profile.display_name) = lower(query.value) then 0 else 1 end,
    profile.display_name
  limit least(greatest(coalesce(result_limit, 8), 1), 20);
$$;

revoke all on function public.search_member_profiles(text, integer) from public;
grant execute on function public.search_member_profiles(text, integer) to authenticated;
