import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// TODO: restore admin auth after demo
import { createBalancedMatches, createDiverseMatches, createRandomMatches } from "@/lib/matchmaking";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const night = await prisma.bouleNight.findUnique({
      where: { id },
      include: {
        attendance: {
          where: { present: true },
          include: { player: true },
          orderBy: { player: { name: "asc" } },
        },
        rounds: true,
      },
    });

    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingRound1 = night.rounds.find((r) => r.number === 1);
    if (existingRound1) {
      return NextResponse.json(
        { error: "Round 1 already drawn" },
        { status: 400 }
      );
    }

    const players = night.attendance.map((a) => a.player);

    if (players.length < 4) {
      return NextResponse.json(
        { error: "Need at least 4 players to draw round 1" },
        { status: 400 }
      );
    }

    if (players.length % 2 !== 0 || players.length % 4 !== 0) {
      // For now keep it simple: require multiples of 4 so we can form clean doubles matches
      return NextResponse.json(
        { error: "Player count must be a multiple of 4 for round 1 draw (e.g. 4, 8, 12)" },
        { status: 400 }
      );
    }

    // Get matchmaking mode from request body (default: balanced)
    const body = await req.json().catch(() => ({}));
    const matchmakingMode = body.mode || "balanced"; // balanced, diverse, or random

    // Create matches using smart matchmaking
    let matchPairings: Array<[string, string, string, string]>;

    try {
      if (matchmakingMode === "balanced") {
        matchPairings = await createBalancedMatches(players, id);
      } else if (matchmakingMode === "diverse") {
        matchPairings = await createDiverseMatches(players, id);
      } else {
        matchPairings = createRandomMatches(players);
      }
    } catch (error) {
      console.error("Matchmaking error, falling back to random:", error);
      matchPairings = createRandomMatches(players);
    }

    // Create round, matches, teams, and match players in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Dubbelkolla inuti transaktionen för att undvika race conditions
      const existingRound = await tx.round.findFirst({
        where: { nightId: id, number: 1 },
      });
      if (existingRound) {
        throw new Error("Round 1 already exists");
      }

      const round = await tx.round.create({
        data: {
          nightId: id,
          number: 1,
        },
      });

      const matchesCreated: { matchId: string; lane: number }[] = [];
      let lane = 1;

      // Create matches from smart matchmaking pairings
      for (const [p1Id, p2Id, p3Id, p4Id] of matchPairings) {
        const match = await tx.match.create({
          data: {
            nightId: id,
            roundId: round.id,
            lane,
          },
        });

        const homeTeam = await tx.matchTeam.create({
          data: {
            matchId: match.id,
            side: "HOME",
          },
        });

        const awayTeam = await tx.matchTeam.create({
          data: {
            matchId: match.id,
            side: "AWAY",
          },
        });

        // Team 1 (HOME): player1 + player2
        await tx.matchPlayer.create({
          data: {
            matchTeamId: homeTeam.id,
            playerId: p1Id,
          },
        });
        await tx.matchPlayer.create({
          data: {
            matchTeamId: homeTeam.id,
            playerId: p2Id,
          },
        });

        // Team 2 (AWAY): player3 + player4
        await tx.matchPlayer.create({
          data: {
            matchTeamId: awayTeam.id,
            playerId: p3Id,
          },
        });
        await tx.matchPlayer.create({
          data: {
            matchTeamId: awayTeam.id,
            playerId: p4Id,
          },
        });

        matchesCreated.push({ matchId: match.id, lane });
        lane += 1;
      }

      return { roundId: round.id, matches: matchesCreated };
    });
    // If called from a browser form, redirect back to the night edit page
    const referer = req.headers.get("referer");
    if (referer) {
      return NextResponse.redirect(referer, { status: 303 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error drawing round 1", error);
    return NextResponse.json(
      { error: "Failed to draw round 1" },
      { status: 500 }
    );
  }
}
