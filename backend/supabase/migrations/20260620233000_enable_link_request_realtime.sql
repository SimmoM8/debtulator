-- Deliver link request inserts and status changes to active authenticated
-- clients. Existing RLS policies continue to restrict which rows each client
-- can receive.
do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'link_requests'
  ) then
    alter publication supabase_realtime add table public.link_requests;
  end if;
end;
$$;
