import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";

function getGameLengthInHours(utcStartTime: string): number {
    const startUTC = new Date(utcStartTime);
    const now = new Date();
    const nowUTC = new Date(now.toUTCString()); // Convert now to UTC
    const diffInMilliseconds = nowUTC.getTime() - startUTC.getTime();
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    return Math.floor(diffInHours);
}

Deno.serve(async () => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // get all games
        const { data, error } = await supabase.schema("public").from("games")
            .select(
                "id, start_time",
            );

        if (error) throw error;

        // delete each game that has been going on for 12 hours or more
        data.forEach(async (game) => {
            const gameLengthInHours = getGameLengthInHours(game.start_time);
            // 1000000 because I set my test games to really old dates so they don't get deleted
            if (gameLengthInHours >= 6 && gameLengthInHours <= 1000000) {
                const { error } = await supabase.from("games").delete().eq(
                    "id",
                    game.id,
                );
                if (error) throw error;
            }
        });

        return new Response(
            JSON.stringify({
                message: "old game cleanup executed successfully",
            }),
            { headers: { "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: "old game cleanup failed to execute" }),
            { headers: { "Content-Type": "application/json" } },
        );
    }
});
