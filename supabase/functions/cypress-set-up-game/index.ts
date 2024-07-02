import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";
import { corsHeaders } from "../_shared/cors.ts";

const CYPRESS_TEST_USER_ID = Deno.env.get("CYPRESS_TEST_USER_ID")?.toString() ??
    "";
const CYPRESS_TEST_GAME_ID = Deno.env.get("CYPRESS_TEST_GAME_ID")?.toString() ??
    "";
const CYPRESS_TEST_HOST_USER_ID =
    Deno.env.get("CYPRESS_TEST_HOST_USER_ID")?.toString() ?? "";

const CYPRESS_TEST_USER_IDS = [
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
            myRole,
            ready = "",
            selectedPlayerId,
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
            ready: string;
            selectedPlayerId: string;
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

        // create game and player rows
        const gameObj = {
            id: CYPRESS_TEST_GAME_ID,
            phase: "lobby", // can't pass in phase from arg here because then we can't add players because of an RLS policy
            host_id: hostedByMe
                ? CYPRESS_TEST_USER_ID
                : CYPRESS_TEST_HOST_USER_ID,
        };

        const playersArray = [
            !hostedByMe
                ? {
                    game_id: CYPRESS_TEST_GAME_ID,
                    profile_id: CYPRESS_TEST_HOST_USER_ID,
                    name: "host",
                    ready: ready === "all" || ready == CYPRESS_TEST_HOST_USER_ID
                        ? true
                        : false,
                }
                : null,
            hostedByMe || addMe
                ? {
                    game_id: CYPRESS_TEST_GAME_ID,
                    profile_id: CYPRESS_TEST_USER_ID,
                    selected_player_id: selectedPlayerId,
                    name: "test0",
                    ready: ready === "all" || ready == CYPRESS_TEST_USER_ID
                        ? true
                        : false,
                }
                : null,
            ...CYPRESS_TEST_USER_IDS.map((id, index) => {
                return {
                    game_id: CYPRESS_TEST_GAME_ID,
                    profile_id: id,
                    name: `test${index + 1}`,
                    ready: ready === "all" || ready == id ? true : false,
                };
            }).slice(0, numOtherPlayers),
        ].filter((player) => player !== null);

        // delete test game (this also deletes the test players from the "players" table)
        const { error: deleteGameError } = await supabase.from("games").delete()
            .eq("id", CYPRESS_TEST_GAME_ID);
        if (deleteGameError) throw deleteGameError;

        // create a new game
        const { error: createGameError } = await supabase
            .from("games")
            .insert(gameObj);
        if (createGameError) throw createGameError;

        // add playersArray to "players" table
        const { error: addPlayersError } = await supabase
            .from("players")
            .insert([...playersArray]);

        if (addPlayersError) throw addPlayersError;

        // assign roles
        const { error: assignRolesError } = await supabase.functions.invoke(
            "assign-roles",
            {
                body: {
                    gameId: CYPRESS_TEST_GAME_ID,
                    playerCount: playersArray.length,
                },
            },
        );
        if (assignRolesError) throw assignRolesError;

        if (phase !== "lobby") {
            const { error: phaseError } = await supabase
                .from("games")
                .update({ phase })
                .eq("id", CYPRESS_TEST_GAME_ID);
            if (phaseError) throw phaseError;
        }

        if (myRole) {
            const { error: myRoleError } = await supabase
                .from("players")
                .update({ role: myRole })
                .eq("profile_id", CYPRESS_TEST_USER_ID);
            if (myRoleError) throw myRoleError;
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
