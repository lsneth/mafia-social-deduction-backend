import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

const CYPRESS_TEST_USER_ID = Deno.env.get("CYPRESS_TEST_USER_ID")?.toString() ??
    "";
const CYPRESS_TEST_GAME_ID = Deno.env.get("CYPRESS_TEST_GAME_ID")?.toString() ??
    "";
const CYPRESS_TEST_HOST_USER_ID =
    Deno.env.get("CYPRESS_TEST_HOST_USER_ID")?.toString() ?? "";
const CYPRESS_TEST_USER_NAME = "test0";

const CYPRESS_TEST_USERS = [
    Deno.env.get("CYPRESS_TEST_USER_ID_1")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_2")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_3")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_4")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_5")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_6")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_7")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_8")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_9")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_10")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_11")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_12")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_13")?.toString() ?? "",
    Deno.env.get("CYPRESS_TEST_USER_ID_14")?.toString() ?? "",
];

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const {
            hostedByMe = true,
            addMe = false,
            numOtherPlayers = 0, // number of other players besides the test user and/or test host
            phase = "lobby",
            myRole = "innocent",
        }: {
            hostedByMe: boolean;
            addMe: boolean;
            numOtherPlayers:
                | 0
                | 1
                | 2
                | 3
                | 4
                | 5
                | 6
                | 7
                | 8
                | 9
                | 10
                | 11
                | 12
                | 13
                | 14
                | 15;
            phase:
                | "lobby"
                | "role"
                | "mafia"
                | "investigator"
                | "innocent"
                | "end";
            myRole: "innocent" | "mafia" | "investigator";
        } = await req.json();

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
        const { error: deleteGameError } = await supabase.from("games").delete()
            .eq("id", CYPRESS_TEST_GAME_ID);
        if (deleteGameError) throw deleteGameError;

        // create a new game
        const { error: createGameError } = await supabase
            .from("games")
            .insert({
                id: CYPRESS_TEST_GAME_ID,
                phase: "lobby",
                host_id: hostedByMe
                    ? CYPRESS_TEST_USER_ID
                    : CYPRESS_TEST_HOST_USER_ID,
            });
        if (createGameError) throw createGameError;

        if (hostedByMe) {
            // if hostedByMe is true, add the test user to the "players" table
            const { error: addMeAsHostError } = await supabase
                .from("players")
                .insert({
                    profile_id: CYPRESS_TEST_USER_ID,
                    game_id: CYPRESS_TEST_GAME_ID,
                    role: myRole,
                    name: CYPRESS_TEST_USER_NAME,
                });
            if (addMeAsHostError) throw addMeAsHostError;
        } else {
            // if hostedByMe is false, add the test host to the "players" table
            const { error: addOtherError } = await supabase
                .from("players")
                .insert({
                    profile_id: CYPRESS_TEST_HOST_USER_ID,
                    game_id: CYPRESS_TEST_GAME_ID,
                    role: "innocent",
                    name: "host",
                });
            if (addOtherError) throw addOtherError;

            if (addMe) {
                // if addMe is true, add the test user to the "players" table too
                const { error: addMeError } = await supabase
                    .from("players")
                    .insert({
                        profile_id: CYPRESS_TEST_USER_ID,
                        game_id: CYPRESS_TEST_GAME_ID,
                        role: myRole,
                        name: CYPRESS_TEST_USER_NAME,
                    });
                if (addMeError) throw addMeError;
            }
        }

        // create array of testPlayers with length equal to numOtherPlayers
        const testUsers = CYPRESS_TEST_USERS.slice(0, numOtherPlayers).map((
            id,
            index,
        ) => ({
            profile_id: id,
            game_id: CYPRESS_TEST_GAME_ID,
            role: "innocent",
            name: `test${index + 1}`,
        }));

        // add testPlayers to "players" table
        const { error: addPlayersError } = await supabase
            .from("players")
            .insert([...testUsers]);
        if (addPlayersError) throw addPlayersError;

        // if phase that was passed isn't "lobby", update the phase to the passed phase now that players are added
        if (phase !== "lobby") {
            const { error: updatePhaseError } = await supabase
                .from("games")
                .update({
                    phase,
                }).eq("id", CYPRESS_TEST_GAME_ID);

            console.log("updatePhaseError:", updatePhaseError);

            if (updatePhaseError) throw updatePhaseError;
        }

        return new Response(
            JSON.stringify({
                message: "cypress setup game executed successfully",
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
