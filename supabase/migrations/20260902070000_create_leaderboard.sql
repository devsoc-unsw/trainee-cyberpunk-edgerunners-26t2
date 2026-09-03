alter table public.positions
add column settled_at timestamptz,
add column payout bigint;

alter table public.positions
add constraint positions_payout_non_negative
check (payout is null or payout >= 0),
add constraint positions_settlement_complete
check (
    (settled_at is null and payout is null)
    or (settled_at is not null and payout is not null)
);

create index positions_settled_profile_id_idx
on public.positions(profile_id)
where settled_at is not null;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create or replace function private.ensure_user_profile(
    p_id uuid,
    p_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_base_username text;
    v_username text;
begin
    v_base_username := lower(split_part(coalesce(p_email, ''), '@', 1));

    if v_base_username = '' then
        v_base_username := 'student';
    end if;

    v_username := v_base_username;

    if exists (
        select 1
        from public.profiles
        where username = v_username
          and id <> p_id
    ) then
        v_username := v_base_username || '-' || left(replace(p_id::text, '-', ''), 6);
    end if;

    insert into public.profiles (id, username)
    values (p_id, v_username)
    on conflict (id) do update
    set username = coalesce(public.profiles.username, excluded.username);

    insert into public.ledger (profile_id, delta, reason)
    select p_id, 1000, 'initial_credit'
    where not exists (
        select 1
        from public.ledger
        where profile_id = p_id
          and reason = 'initial_credit'
    );
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform private.ensure_user_profile(new.id, new.email);
    return new;
end;
$$;

drop trigger if exists create_profile_for_auth_user on auth.users;

create trigger create_profile_for_auth_user
after insert on auth.users
for each row
execute function private.handle_new_auth_user();

select private.ensure_user_profile(id, email)
from auth.users;

alter table public.profiles
alter column username set not null;

revoke all on function private.ensure_user_profile(uuid, text) from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

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
            profiles.username,
            auth_users.created_at as account_created_at,
            coalesce(
                sum(positions.payout - positions.stake),
                0
            )::bigint as settled_profit,
            count(positions.id) as settled_count
        from public.profiles
        join auth.users as auth_users
            on auth_users.id = profiles.id
        left join public.positions
            on positions.profile_id = profiles.id
           and positions.settled_at is not null
        group by profiles.id, profiles.username, auth_users.created_at
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
