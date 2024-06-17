import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { gameId, playerId, playerName } = await req.json();

        if (!gameId) throw new Error("no gameId provided");
        if (!playerId) throw new Error("no playerId provided");
        if (!playerName) throw new Error("no playerName provided");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: {
                        Authorization: req.headers.get("Authorization")!,
                    },
                },
            },
        );

        const { data: gameData, error: gameError } = await supabase.from(gameId)
            .select();

        if (gameError) throw gameError;

        if (gameData.length >= 15) {
            throw new Error(`game ${gameId} already has 15 players`);
        }

        const gamePhase = gameData.find((row) => row.is_host === true).phase;

        if (gamePhase !== "lobby") {
            throw new Error(`game ${gameId} has already started`);
        }

        // add player to game, return response
        const { data, error } = await supabase.from(gameId).insert({
            player_id: playerId,
            name: playerName,
        });

        if (error) throw error;

        return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        return new Response(String(err?.message ?? err), {
            headers: { ...corsHeaders },
            status: 500,
        });
    }
});
