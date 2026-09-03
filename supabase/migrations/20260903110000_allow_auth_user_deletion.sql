create or replace function public.prevent_ledger_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'DELETE'
        and not exists (
            select 1
            from public.profiles
            where id = old.profile_id
        )
    then
        return old;
    end if;

    raise exception 'Ledger entries cannot be changed or deleted';
end;
$$;
