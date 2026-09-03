alter table public.profiles
alter column username drop not null;

drop trigger if exists create_profile_for_auth_user on auth.users;
drop function if exists private.handle_new_auth_user();
drop function if exists private.ensure_user_profile(uuid, text);

create or replace function public.get_leaderboard()
returns table (
    profile_id uuid,
    username text,
    rank bigint,
    settled_profit bigint,
    settled_count bigint,
    is_current_user boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    with scores as (
        select
            profiles.id as profile_id,
            coalesce(
                profiles.username,
                'student_' || right(replace(profiles.id::text, '-', ''), 6)
            ) as username,
            auth_users.created_at as account_created_at,
            coalesce(sum(positions.payout - positions.stake), 0)::bigint
                as settled_profit,
            count(positions.id) as settled_count
        from public.profiles
        join auth.users as auth_users
            on auth_users.id = profiles.id
        left join public.positions
            on positions.profile_id = profiles.id
           and positions.settled_at is not null
        group by
            profiles.id,
            profiles.username,
            auth_users.created_at
    ),
    ranked as (
        select
            scores.profile_id,
            scores.username,
            row_number() over (
                order by
                    scores.settled_profit desc,
                    scores.account_created_at asc,
                    scores.profile_id asc
            ) as rank,
            scores.settled_profit,
            scores.settled_count
        from scores
    )
    select
        ranked.profile_id,
        ranked.username,
        ranked.rank,
        ranked.settled_profit,
        ranked.settled_count,
        coalesce(ranked.profile_id = (select auth.uid()), false)
    from ranked
    where ranked.rank <= 50
       or ranked.profile_id = (select auth.uid())
    order by ranked.rank;
$$;

revoke all on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;
