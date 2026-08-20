begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select is(
  (
    select count(*)
    from supabase_migrations.schema_migrations
    where version = '20260820000000'
  ),
  1::bigint,
  'the forward-only RLS hardening migration is in the applied chain'
);

select ok(
  (
    select bool_and(class.relrowsecurity)
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'shared_debt_records',
        'debt_verifications',
        'payments',
        'activity_logs',
        'group_activity_logs',
        'audit_logs'
      )
  ),
  'RLS remains enabled on every hardened table'
);

select ok(
  not has_table_privilege('anon', 'public.shared_debt_records', 'select')
    and not has_table_privilege('anon', 'public.payments', 'select')
    and not has_table_privilege('anon', 'public.activity_logs', 'select')
    and not has_table_privilege('anon', 'public.audit_logs', 'select'),
  'anon has no direct read grants on private financial and activity tables'
);

select ok(
  has_table_privilege('authenticated', 'public.shared_debt_records', 'select')
    and has_table_privilege('authenticated', 'public.shared_debt_records', 'insert')
    and has_table_privilege('authenticated', 'public.shared_debt_records', 'update'),
  'authenticated sync keeps its shared-debt table grants'
);

select ok(
  has_table_privilege('authenticated', 'public.debt_verifications', 'select')
    and not has_table_privilege('authenticated', 'public.debt_verifications', 'insert')
    and not has_table_privilege('authenticated', 'public.debt_verifications', 'update')
    and not has_table_privilege('authenticated', 'public.debt_verifications', 'delete'),
  'debt proposals are readable but writable only through RPCs'
);

select ok(
  has_table_privilege('authenticated', 'public.payments', 'select')
    and has_table_privilege('authenticated', 'public.payments', 'insert')
    and has_table_privilege('authenticated', 'public.payments', 'update'),
  'authenticated sync keeps its payment table grants'
);

select ok(
  (
    select bool_and(procedure.prosecdef)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.oid in (
        'public.request_debt_verification(uuid,uuid,text,jsonb)'::regprocedure,
        'public.counter_debt_verification(uuid,jsonb,text)'::regprocedure,
        'public.respond_to_debt_verification(uuid,text,text,jsonb)'::regprocedure,
        'public.respond_to_payment_confirmation(uuid,text)'::regprocedure
      )
  ),
  'validated financial mutation RPCs execute with migration-owner privileges'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.request_debt_verification(uuid,uuid,text,jsonb)',
    'execute'
  )
    and has_function_privilege(
      'authenticated',
      'public.respond_to_debt_verification(uuid,text,text,jsonb)',
      'execute'
    )
    and has_function_privilege(
      'authenticated',
      'public.respond_to_payment_confirmation(uuid,text)',
      'execute'
    ),
  'authenticated users can execute the guarded financial workflows'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.request_debt_verification(uuid,uuid,text,jsonb)',
    'execute'
  )
    and not has_function_privilege(
      'anon',
      'public.respond_to_debt_verification(uuid,text,text,jsonb)',
      'execute'
    )
    and not has_function_privilege(
      'anon',
      'public.respond_to_payment_confirmation(uuid,text)',
      'execute'
    ),
  'anonymous users cannot execute financial mutation RPCs'
);

select is(
  (
    select count(*)
    from pg_trigger trigger
    join pg_class class on class.oid = trigger.tgrelid
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'shared_debt_records'
      and trigger.tgname = 'guard_shared_debt_direct_update'
      and trigger.tgenabled = 'O'
      and not trigger.tgisinternal
  ),
  1::bigint,
  'shared debt direct-update guard is enabled'
);

select is(
  (
    select count(*)
    from pg_trigger trigger
    join pg_class class on class.oid = trigger.tgrelid
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'payments'
      and trigger.tgname = 'guard_payment_direct_update'
      and trigger.tgenabled = 'O'
      and not trigger.tgisinternal
  ),
  1::bigint,
  'payment direct-update guard is enabled'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'activity_logs'
      and policyname in ('activity_actor_select', 'activity_actor_insert')
      and roles = array['authenticated']::name[]
  ),
  2::bigint,
  'activity policies are authenticated-only and operation-specific'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname in ('audit_logs_actor_select', 'audit_logs_actor_insert')
      and roles = array['authenticated']::name[]
  ),
  2::bigint,
  'audit policies are authenticated-only and operation-specific'
);

select ok(
  (
    select not index.indpred is null
    from pg_index index
    join pg_class class on class.oid = index.indexrelid
    where class.relname = 'shared_debt_records_creator_client_generated_idx'
  ),
  'shared-debt client id remains a partial idempotency key'
);

select ok(
  (
    select index.indisunique and index.indpred is null
    from pg_index index
    join pg_class class on class.oid = index.indexrelid
    where class.relname = 'payments_creator_client_id_idx'
  ),
  'payment retry key remains a non-partial unique index usable by ON CONFLICT'
);

select * from finish();
rollback;
