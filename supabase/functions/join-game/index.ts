import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { gameId, playerId, playerName }: {
            gameId: string;
            playerId: string;
            playerName: string;
        } = await req.json();

        if (!playerName) {
            throw new Error(
                "Please add a name to your account to join a game.",
            );
        }

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

        // get all players in game
        const { data: playerData, error: playerError } = await supabase.from(
            "players",
        ).select("profile_id")
            .eq("game_id", gameId);
        if (playerError) throw playerError;

        // see if game is already full
        if (playerData.length >= 15) {
            throw new Error("there are already 15 players");
        }

        // see if game has already started
        const { data: gameData, error: gameError } = await supabase.from(
            "games",
        ).select("phase").eq(
            "id",
            gameId,
        ).single();
        if (gameError) throw gameError;
        const { phase } = gameData;
        if (phase !== "lobby") throw new Error("game has already started");

        // finally add player to game
        const { data, error } = await supabase.from("players").insert({
            profile_id: playerId,
            game_id: gameId,
            name: playerName,
        });

        if (error) throw error;

        return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err?.message ?? err }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
