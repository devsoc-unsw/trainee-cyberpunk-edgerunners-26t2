set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

drop view "public"."profile_balances";

alter table "public"."ledger"
  drop constraint "ledger_delta_check";

alter table "public"."outcomes"
  drop constraint "outcomes_pool_check";

alter table "public"."positions"
  drop constraint "positions_stake_check";

alter table "public"."ledger"
  enable row level security;

alter table "public"."markets"
  enable row level security;

alter table "public"."outcomes"
  enable row level security;

alter table "public"."positions"
  enable row level security;

alter table "public"."profiles"
  enable row level security;

alter table "public"."ledger"
  alter column "delta" drop default;

alter table "public"."ledger"
  alter column "delta" type numeric(12,2) using "delta"::numeric(12,2);

alter table "public"."outcomes"
  alter column "pool" drop default;

alter table "public"."outcomes"
  alter column "pool" type numeric(12,2) using "pool"::numeric(12,2);

alter table "public"."outcomes"
  alter column "pool" set default 0;

alter table "public"."positions"
  alter column "stake" drop default;

alter table "public"."positions"
  alter column "stake" type numeric(12,2) using "stake"::numeric(12,2);

create or replace function public.prevent_ledger_changes()
  returns trigger
  language plpgsql
  AS $function$
begin
  raise exception 'Ledger entries are append-only';
end;
$function$;

create or replace function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path to 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

alter table "public"."ledger"
  add constraint "ledger_delta_check" check ((delta <> (0)::numeric));

alter table "public"."outcomes"
  add constraint "outcomes_pool_check" check ((pool >= (0)::numeric));

alter table "public"."positions"
  add constraint "positions_stake_check" check ((stake > (0)::numeric));

create view "public"."profile_balances" AS  SELECT p.id AS profile_id,
    (COALESCE(sum(l.delta), (0)::numeric))::numeric(12,2) AS balance
   FROM (public.profiles p
     LEFT JOIN public.ledger l ON ((l.profile_id = p.id)))
  GROUP BY p.id;

create event trigger "ensure_rls"
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function "public"."rls_auto_enable"();

revoke all on function "public"."prevent_ledger_changes"() from "anon";

grant execute on function "public"."prevent_ledger_changes"() to "anon";

revoke all on function "public"."prevent_ledger_changes"() from "authenticated";

grant execute on function "public"."prevent_ledger_changes"() to "authenticated";

revoke all on function "public"."prevent_ledger_changes"() from "service_role";

grant execute on function "public"."prevent_ledger_changes"() to "service_role";

grant execute on function "public"."rls_auto_enable"() to public, "anon", "authenticated", "postgres", "service_role";

revoke all on table "public"."ledger" from "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."ledger" to "anon";

revoke all on table "public"."ledger" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."ledger" to "authenticated";

revoke all on table "public"."ledger" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."ledger" to "service_role";

revoke all on table "public"."markets" from "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."markets" to "anon";

revoke all on table "public"."markets" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."markets" to "authenticated";

revoke all on table "public"."markets" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."markets" to "service_role";

revoke all on table "public"."outcomes" from "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."outcomes" to "anon";

revoke all on table "public"."outcomes" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."outcomes" to "authenticated";

revoke all on table "public"."outcomes" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."outcomes" to "service_role";

revoke all on table "public"."positions" from "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."positions" to "anon";

revoke all on table "public"."positions" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."positions" to "authenticated";

revoke all on table "public"."positions" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."positions" to "service_role";

revoke all on table "public"."profiles" from "anon";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "anon";

revoke all on table "public"."profiles" from "authenticated";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "authenticated";

revoke all on table "public"."profiles" from "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profile_balances" to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

