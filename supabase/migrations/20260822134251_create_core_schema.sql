create extension if not exists pgcrypto;

create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    created_at timestamptz not null default now()
);

create table markets (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    category text not null,
    closes_at timestamptz not null,
    status text not null default 'open',
    created_at timestamptz not null default now(),

    check (status in ('open', 'closed', 'resolved'))
);

create table outcomes (
    id uuid primary key default gen_random_uuid(),
    market_id uuid not null references markets(id) on delete cascade,
    name text not null,
    pool numeric(12, 2) not null default 0,
    created_at timestamptz not null default now(),

    check (pool >= 0),
    unique (market_id, name)
);

create table positions (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references profiles(id) on delete cascade,
    market_id uuid not null references markets(id) on delete cascade,
    outcome_id uuid not null references outcomes(id) on delete cascade,
    stake numeric(12, 2) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    check (stake > 0),
    unique (profile_id, market_id, outcome_id)
);

create table ledger (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references profiles(id) on delete cascade,
    delta numeric(12, 2) not null,
    reason text not null,
    ref_id uuid,
    created_at timestamptz not null default now(),

    check (delta <> 0),
    check (
        reason in (
            'initial_credit',
            'bet_placed',
            'market_settlement',
            'refund'
        )
    )
);

create index ledger_profile_id_created_at_idx
on ledger(profile_id, created_at desc);

create index outcomes_market_id_idx
on outcomes(market_id);

create index positions_profile_id_idx
on positions(profile_id);

create index positions_market_id_idx
on positions(market_id);

create function prevent_ledger_changes()
returns trigger
language plpgsql
as $$
begin
    raise exception 'Ledger entries cannot be changed or deleted';
end;
$$;

create trigger ledger_no_update
before update on ledger
for each row
execute function prevent_ledger_changes();

create trigger ledger_no_delete
before delete on ledger
for each row
execute function prevent_ledger_changes();

create view profile_balances as
select
    profiles.id as profile_id,
    coalesce(sum(ledger.delta), 0) as balance
from profiles
left join ledger
on profiles.id = ledger.profile_id
group by profiles.id;