import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

const CYPRESS_TEST_GAME_ID = Deno.env.get("CYPRESS_TEST_GAME_ID")?.toString() ??
    "";
const CYPRESS_TEST_USER_ID = Deno.env.get("CYPRESS_TEST_USER_ID")?.toString() ??
    "";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
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

        // delete test game (this also deletes the test players from the "players" table)
        const { error: deleteTestGameError } = await supabase.from("games")
            .delete()
            .eq("id", CYPRESS_TEST_GAME_ID);
        if (deleteTestGameError) throw deleteTestGameError;

        // delete any game the test user is hosting
        const { error: deleteHostGameError } = await supabase.from("games")
            .delete()
            .eq("host_id", CYPRESS_TEST_USER_ID);
        if (deleteHostGameError) throw deleteHostGameError;

        return new Response(
            JSON.stringify({
                message: "cypress delete game executed successfully",
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
