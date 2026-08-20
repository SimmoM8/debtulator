-- Service-role-only primitive used by the allowlisted development reset Edge
-- Function. Never grant this function to a mobile-client role.
create or replace function public.reset_development_test_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_list text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  select string_agg(
    format('%I.%I', schemaname, tablename),
    ', '
    order by tablename
  )
  into table_list
  from pg_catalog.pg_tables
  where schemaname = 'public';

  if table_list is not null then
    execute 'truncate table ' || table_list || ' restart identity cascade';
  end if;
end;
$$;

revoke all on function public.reset_development_test_data() from public, anon, authenticated;
grant execute on function public.reset_development_test_data() to service_role;

notify pgrst, 'reload schema';
