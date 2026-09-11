-- ============================================================================
-- Currency catalogue foundation
--
-- Keeps public.currencies as Debtulator's authoritative application catalogue
-- while adding product-level availability and presentation ordering.
--
-- Joda-Money is used by the backend as a monetary/currency standards library;
-- it does not replace this table or become a second application catalogue.
--
-- Also widens debt amount storage so currencies with more than two fractional
-- digits can be represented. Currency-specific fractional-digit rules remain
-- application business rules driven by public.currencies.decimal_places.
-- ============================================================================


-- ============================================================================
-- Currency catalogue configuration
-- ============================================================================

alter table public.currencies
    add column enabled boolean not null default false;

alter table public.currencies
    add column display_order integer;


-- Existing V1 catalogue entries remain available. Future catalogue rows are
-- disabled by default until deliberately enabled by application/admin policy.
update public.currencies
set enabled = true;


with ordered_currencies as (
    select
        code,
        (row_number() over (order by code) * 10)::integer as display_order
    from public.currencies
)
update public.currencies currency
set display_order = ordered.display_order
from ordered_currencies ordered
where ordered.code = currency.code;


alter table public.currencies
    alter column display_order set not null;


alter table public.currencies
    drop constraint currencies_decimal_places_range;

alter table public.currencies
    add constraint currencies_decimal_places_range
        check (
            decimal_places between 0 and 8
        );

alter table public.currencies
    add constraint currencies_display_order_non_negative
        check (
            display_order >= 0
        );


create index currencies_enabled_display_order_idx
    on public.currencies (
        display_order,
        code
    )
    where enabled = true;


-- ============================================================================
-- Monetary amount storage
--
-- numeric(38, 8) is storage capacity, not a declaration that every currency
-- has eight decimal places. DebtService validates each new/updated amount
-- against currencies.decimal_places.
-- ============================================================================

alter table public.debts
    alter column amount type numeric(38, 8)
    using amount::numeric(38, 8);
