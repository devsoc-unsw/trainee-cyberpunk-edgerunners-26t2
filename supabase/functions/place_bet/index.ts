import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface PlaceBetRequest {
  outcome_id?: unknown;
  stake?: unknown;
}

interface PlaceBetDatabase {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      place_bet: {
        Args: {
          p_outcome_id: string;
          p_stake: number;
        };
        Returns: {
          position_id: string;
          stake: number;
          pool: number;
          balance: number;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export default {
  fetch: withSupabase<PlaceBetDatabase>(
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

      let body: PlaceBetRequest;

      try {
        body = await req.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON body" },
          { status: 400 },
        );
      }

      const { outcome_id, stake } = body;

      if (typeof outcome_id !== "string" || outcome_id.length === 0) {
        return Response.json(
          { error: "outcome_id is required" },
          { status: 400 },
        );
      }

      if (
        typeof stake !== "number" ||
        !Number.isSafeInteger(stake) ||
        stake <= 0
      ) {
        return Response.json(
          { error: "stake must be a positive integer" },
          { status: 400 },
        );
      }

      const { data, error } = await ctx.supabase.rpc("place_bet", {
        p_outcome_id: outcome_id,
        p_stake: stake,
      });

      if (error) {
        return Response.json(
          { error: error.message },
          { status: 400 },
        );
      }

      return Response.json(
        { data },
        { status: 200 },
      );
    },
  ),
};
