import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

function getRoleArray(playerCount: number) {
    const mafiaCount = playerCount <= 4
        ? 0
        : playerCount <= 6
        ? 1
        : playerCount <= 11
        ? 2
        : 3;
    const investigatorCount = playerCount <= 4 ? 0 : playerCount <= 11 ? 1 : 2;
    const innocentCount = playerCount - mafiaCount - investigatorCount;

    const roles: string[] = [];
    for (let i = 0; i < mafiaCount; i++) roles.push("mafia");
    for (let i = 0; i < investigatorCount; i++) roles.push("investigator");
    for (let i = 0; i < innocentCount; i++) roles.push("innocent");

    return roles;
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array: string[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { gameId, playerCount }: { gameId: string; playerCount: number } =
            await req.json();

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

        // get profile ids of all players in the game
        const { data: players, error: playersError } = await supabase
            .from("players")
            .select("profile_id")
            .eq("game_id", gameId);
        if (playersError) throw playersError;

        // create an array of roles with the right counts and shuffle them
        const rolesArray = getRoleArray(playerCount);
        shuffleArray(rolesArray);

        // for each profile id, pop a role off the array and assign it to the player
        players?.forEach(async (player) => {
            const role = rolesArray.pop();

            const { error } = await supabase.from("players").update({
                role,
            }).eq("profile_id", player.profile_id);
            if (error) throw error;
        });

        return new Response(
            JSON.stringify({
                message: "assign-roles executed successfully",
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
