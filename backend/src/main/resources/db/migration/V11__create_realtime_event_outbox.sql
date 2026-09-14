-- ============================================================================
-- Realtime event delivery foundation
--
-- Domain records such as member-link requests remain the source of truth.
-- This migration adds only transport/reliability infrastructure:
--   - a transactional event outbox for live delivery and future channels; and
--   - short-lived, one-time WebSocket connection tickets.
-- ============================================================================


-- ============================================================================
-- Transactional event outbox
--
-- sequence is a monotonically increasing event-stream cursor. Each backend
-- instance consumes new rows independently and publishes them only to sessions
-- connected to that instance. Future delivery channels (for example push)
-- can consume the same stream using their own durable cursor without changing
-- the domain services that created the event.
-- ============================================================================

create table public.outbox_events (
    sequence bigint generated always as identity primary key,

    id uuid not null unique,

    recipient_user_id uuid not null
        references auth.users(id)
        on delete cascade,

    event_type text not null,

    payload jsonb not null,

    occurred_at timestamptz not null,

    constraint outbox_events_event_type_valid
        check (
            char_length(trim(event_type)) between 1 and 100
        ),

    constraint outbox_events_payload_object
        check (
            jsonb_typeof(payload) = 'object'
        )
);

create index outbox_events_recipient_sequence_idx
    on public.outbox_events (
        recipient_user_id,
        sequence
    );


-- ============================================================================
-- One-time realtime connection tickets
--
-- Mobile clients authenticate the normal HTTPS ticket endpoint with their
-- bearer token, then use the short-lived opaque ticket during the WebSocket
-- upgrade. This keeps access tokens out of WebSocket URLs and works correctly
-- when the backend is horizontally scaled.
-- ============================================================================

create table public.realtime_connection_tickets (
    id uuid primary key,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    created_at timestamptz not null,

    expires_at timestamptz not null,

    resume_after_sequence bigint not null,

    consumed_at timestamptz,

    constraint realtime_connection_tickets_expiry_valid
        check (
            expires_at > created_at
        ),

    constraint realtime_connection_tickets_resume_sequence_valid
        check (
            resume_after_sequence >= 0
        ),

    constraint realtime_connection_tickets_consumed_valid
        check (
            consumed_at is null
            or consumed_at >= created_at
        )
);

create index realtime_connection_tickets_expires_at_idx
    on public.realtime_connection_tickets (
        expires_at
    );


-- ============================================================================
-- Remote access boundary
-- ============================================================================

revoke all privileges
    on table public.outbox_events
    from anon, authenticated;

revoke all privileges
    on sequence public.outbox_events_sequence_seq
    from anon, authenticated;

revoke all privileges
    on table public.realtime_connection_tickets
    from anon, authenticated;
