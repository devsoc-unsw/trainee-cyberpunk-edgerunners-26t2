import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          {
            status: 405,
            headers: { Allow: "POST" },
          },
        );
      }

      const { data: userData, error: userError } = await ctx.supabase.auth.getUser();

      if (userError || !userData.user) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      const userId = userData.user.id;

      // admin_actions.admin_id and markets.deleted_by both reference
      // profiles(id) on delete restrict, so an account that ever acted as an
      // admin would otherwise fail deletion with an opaque database error.
      // Checked here to return a message that actually explains why.
      const [adminActions, deletedMarkets] = await Promise.all([
        ctx.supabaseAdmin
          .from("admin_actions")
          .select("id", { count: "exact", head: true })
          .eq("admin_id", userId),
        ctx.supabaseAdmin
          .from("markets")
          .select("id", { count: "exact", head: true })
          .eq("deleted_by", userId),
      ]);

      if ((adminActions.count ?? 0) > 0 || (deletedMarkets.count ?? 0) > 0) {
        return Response.json(
          {
            error:
              "This account has an admin action history and can't be self-deleted. Contact support to close it.",
          },
          { status: 409 },
        );
      }

      const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(
        userId,
        false,
      );

      if (deleteError) {
        return Response.json(
          { error: deleteError.message },
          { status: 400 },
        );
      }

      return Response.json(
        { data: { deleted: true } },
        { status: 200 },
      );
    },
  ),
};
