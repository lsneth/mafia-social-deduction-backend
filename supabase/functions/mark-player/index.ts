import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { markType, playerId }: {
            markType: "killed" | "investigated";
            playerId: string;
        } = await req
            .json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                },
            },
        );

        const updateObj = markType === "killed"
            ? { has_been_killed: true }
            : { has_been_investigated: true };

        await supabase.from("players").update(updateObj).eq(
            "profile_id",
            playerId,
        );

        return new Response(
            JSON.stringify({
                message: "player state cleared successfully",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (err) {
        return new Response(JSON.stringify({ error: err?.message ?? err }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
