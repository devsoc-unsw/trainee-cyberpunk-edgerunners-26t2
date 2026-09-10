import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const AD_DOMAIN = "ad.unsw.edu.au";

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

      // Reads the caller's own already-committed zID rather than trusting
      // anything in the request body -- this endpoint only ever turns an
      // already-linked zID into an email, it never accepts one directly.
      const { data: profile, error: profileError } = await ctx.supabase
        .from("profiles")
        .select("zid, email")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        return Response.json({ error: "Profile not found" }, { status: 404 });
      }

      if (!profile.zid) {
        return Response.json(
          { error: "Link your zID before requesting a UNSW email." },
          { status: 400 },
        );
      }

      const derivedEmail = `${profile.zid}@${AD_DOMAIN}`;

      if (profile.email === derivedEmail) {
        return Response.json(
          { data: { email: derivedEmail, linked: true } },
          { status: 200 },
        );
      }

      // Best-effort from here down: the zID is self-reported and never
      // verified against a real UNSW system, so it can collide with an email
      // a different, legitimate account already registered (or already has
      // pending on auth.users). That must never break the zID-linking flow
      // itself -- it just means this account keeps whatever email it had.
      const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: derivedEmail, email_confirm: true },
      );

      if (updateError) {
        return Response.json(
          { data: { email: profile.email, linked: false, reason: updateError.message } },
          { status: 200 },
        );
      }

      // auth.users.email has no trigger keeping profiles.email in sync on
      // update (only on insert), so it is set here in the same request.
      const { error: syncError } = await ctx.supabaseAdmin
        .from("profiles")
        .update({ email: derivedEmail })
        .eq("id", userId);

      if (syncError) {
        return Response.json(
          { data: { email: derivedEmail, linked: true, profileSyncFailed: true } },
          { status: 200 },
        );
      }

      return Response.json(
        { data: { email: derivedEmail, linked: true } },
        { status: 200 },
      );
    },
  ),
};
