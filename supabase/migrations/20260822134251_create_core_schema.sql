create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now()
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  closes_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  name text not null,
  pool numeric(12, 2) not null default 0 check (pool >= 0),
  created_at timestamptz not null default now(),

  unique (market_id, name)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id uuid not null references public.outcomes(id) on delete cascade,
  stake numeric(12, 2) not null check (stake > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (profile_id, market_id, outcome_id)
);

create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delta numeric(12, 2) not null check (delta <> 0),
  reason text not null check (
    reason in ('initial_credit', 'bet_placed', 'market_settlement', 'refund')
  ),
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index ledger_profile_id_created_at_idx
  on public.ledger (profile_id, created_at desc);

create index outcomes_market_id_idx
  on public.outcomes (market_id);

create index positions_profile_id_idx
  on public.positions (profile_id);

create index positions_market_id_idx
  on public.positions (market_id);

create or replace function public.prevent_ledger_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger entries are append-only';
end;
$$;

create trigger ledger_no_update
before update on public.ledger
for each row
execute function public.prevent_ledger_changes();

create trigger ledger_no_delete
before delete on public.ledger
for each row
execute function public.prevent_ledger_changes();

create or replace view public.profile_balances as
select
  p.id as profile_id,
  coalesce(sum(l.delta), 0)::numeric(12, 2) as balance
from public.profiles p
left join public.ledger l on l.profile_id = p.id
group by p.id;