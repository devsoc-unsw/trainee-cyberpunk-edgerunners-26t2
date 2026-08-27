create or replace view public.profile_balances as
select
    profiles.id as profile_id,
    greatest(coalesce(sum(ledger.delta), 0), 0) as balance
from public.profiles
left join public.ledger
on profiles.id = ledger.profile_id
group by profiles.id;