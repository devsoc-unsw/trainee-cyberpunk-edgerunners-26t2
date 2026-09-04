SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "service_role";

REVOKE ALL ON FUNCTION "public"."enforce_profile_privileges"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."enforce_profile_privileges"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."enforce_profile_privileges"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."get_leaderboard"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."place_bet"(uuid, bigint) FROM "anon";

REVOKE ALL ON FUNCTION "public"."place_bet"(uuid, bigint) FROM "service_role";

REVOKE ALL ON FUNCTION "public"."prevent_ledger_changes"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."prevent_ledger_changes"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."prevent_ledger_changes"() FROM "service_role";

REVOKE ALL ON SCHEMA "public" FROM PUBLIC;

REVOKE ALL ON SCHEMA "public" FROM "pg_database_owner";

REVOKE ALL ON TABLE "public"."admin_actions" FROM "service_role";

REVOKE ALL ON TABLE "public"."ledger" FROM "service_role";

REVOKE ALL ON TABLE "public"."markets" FROM "service_role";

REVOKE ALL ON TABLE "public"."outcomes" FROM "service_role";

REVOKE ALL ON TABLE "public"."positions" FROM "service_role";

REVOKE ALL ON TABLE "public"."profiles" FROM "service_role";

REVOKE ALL ON TABLE "public"."profile_balances" FROM "service_role";

COMMENT ON SCHEMA "public" IS NULL;

REVOKE ALL ON SCHEMA "public" FROM "anon";

GRANT CREATE, USAGE ON SCHEMA "public" TO "anon";

REVOKE ALL ON SCHEMA "public" FROM "authenticated";

GRANT CREATE, USAGE ON SCHEMA "public" TO "authenticated";

REVOKE ALL ON SCHEMA "public" FROM "postgres";

GRANT CREATE, USAGE ON SCHEMA "public" TO "postgres";

REVOKE ALL ON SCHEMA "public" FROM "service_role";

GRANT CREATE, USAGE ON SCHEMA "public" TO "service_role";

