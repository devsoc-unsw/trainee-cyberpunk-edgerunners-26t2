create or replace view public.leaderboard as
select
    profiles.id as profile_id,
    coalesce(
        nullif(profiles.username, ''),
        'Student ' || lpad(
            mod(abs(hashtext(profiles.id::text)::bigint), 100000)::text,
            5,
            '0'
        )
    ) as username,
    greatest(coalesce(sum(ledger.delta), 0), 0) as balance
from public.profiles
left join public.ledger
on profiles.id = ledger.profile_id
group by profiles.id, profiles.username;

revoke all on table public.leaderboard from anon, authenticated;
grant select on table public.leaderboard to authenticated;
