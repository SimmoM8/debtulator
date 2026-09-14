-- ============================================================================
-- Debt collaboration model
--
-- A debt remains a private, owner-scoped ledger record. When two linked users
-- agree on a debt, their two private debt rows are connected by one durable
-- collaboration that stores the last mutually agreed snapshot. Either user may
-- continue editing their private debt without waiting for the other user.
-- ============================================================================

alter table public.debts
    add column agreement_status text not null default 'private',
    add column collaboration_id uuid,
    add column agreed_revision bigint;

alter table public.debts
    add constraint debts_agreement_status_valid
        check (agreement_status in ('private', 'pending', 'agreed', 'disagreed')),
    add constraint debts_agreed_revision_valid
        check (agreed_revision is null or agreed_revision > 0);

create table public.debt_collaborations (
    id uuid primary key,

    first_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    first_debt_id uuid not null
        references public.debts(id)
        on delete restrict,

    second_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    second_debt_id uuid not null
        references public.debts(id)
        on delete restrict,

    agreed_revision bigint not null,
    agreed_deleted boolean not null default false,

    agreed_debtor_user_id uuid not null
        references auth.users(id)
        on delete restrict,

    agreed_creditor_user_id uuid not null
        references auth.users(id)
        on delete restrict,

    agreed_amount numeric(38, 8) not null,

    agreed_currency text not null
        references public.currencies(code)
        on update cascade
        on delete restrict,

    agreed_title text not null,
    agreed_due_date date,

    last_agreed_request_id uuid
        references public.agreement_requests(id)
        on delete set null,

    created_at timestamptz not null,
    updated_at timestamptz not null,

    constraint debt_collaborations_users_different
        check (first_user_id <> second_user_id),

    constraint debt_collaborations_debts_different
        check (first_debt_id <> second_debt_id),

    constraint debt_collaborations_revision_positive
        check (agreed_revision > 0),

    constraint debt_collaborations_amount_positive
        check (agreed_amount > 0),

    constraint debt_collaborations_title_length
        check (char_length(agreed_title) <= 120),

    constraint debt_collaborations_parties_valid
        check (
            agreed_debtor_user_id <> agreed_creditor_user_id
            and agreed_debtor_user_id in (first_user_id, second_user_id)
            and agreed_creditor_user_id in (first_user_id, second_user_id)
        )
);

create unique index debt_collaborations_first_debt_unique_idx
    on public.debt_collaborations (first_debt_id);

create unique index debt_collaborations_second_debt_unique_idx
    on public.debt_collaborations (second_debt_id);

create index debt_collaborations_first_user_idx
    on public.debt_collaborations (first_user_id, updated_at desc);

create index debt_collaborations_second_user_idx
    on public.debt_collaborations (second_user_id, updated_at desc);

alter table public.debts
    add constraint debts_collaboration_fk
        foreign key (collaboration_id)
        references public.debt_collaborations(id)
        on delete set null;

alter table public.agreement_requests
    add column collaboration_id uuid
        references public.debt_collaborations(id)
        on delete set null,
    add column base_agreed_revision bigint;

alter table public.agreement_requests
    add constraint agreement_requests_base_agreed_revision_valid
        check (base_agreed_revision is null or base_agreed_revision > 0);

alter table public.agreement_entity_states
    add column collaboration_id uuid
        references public.debt_collaborations(id)
        on delete set null,
    add column agreed_revision bigint;

alter table public.agreement_entity_states
    drop constraint agreement_entity_states_status_valid;

update public.agreement_entity_states
set status = 'disagreed'
where entity_type = 'debt'
  and status in ('agreed', 'rejected');

alter table public.agreement_entity_states
    add constraint agreement_entity_states_status_valid
        check (status in ('private', 'pending', 'agreed', 'disagreed')),
    add constraint agreement_entity_states_agreed_revision_valid
        check (agreed_revision is null or agreed_revision > 0);

-- Accepted debt requests created before this migration did not create the
-- recipient's private debt, so they cannot truthfully be represented as a
-- complete shared agreement. Keep the request history but expose the owner's
-- debt as disagreed until a new proposal establishes a complete collaboration.
update public.debts debt
set agreement_status = state.status
from public.agreement_entity_states state
where state.owner_user_id = debt.owner_user_id
  and state.entity_type = 'debt'
  and state.entity_id = debt.id;

-- Realtime delivery now uses authenticated HTTP polling over durable events.
-- Connection tickets and WebSocket session infrastructure are no longer part
-- of the persistence model.
drop table if exists public.realtime_connection_tickets;

revoke all privileges
    on table public.debt_collaborations
    from anon, authenticated;
