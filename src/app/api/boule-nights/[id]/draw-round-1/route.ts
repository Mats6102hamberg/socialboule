import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  // .../api/boule-nights/[id]/draw-round-1
  const idx = segments.lastIndexOf("boule-nights");
  if (idx === -1 || idx + 1 >= segments.length) return null;
  return segments[idx + 1] ?? null;
}

export async function POST(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

    // Shuffle players
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
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

      const matchesCreated = [] as any[];
      let lane = 1;

      for (let i = 0; i < shuffled.length; i += 4) {
        const group = shuffled.slice(i, i + 4);
        if (group.length < 4) break;

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

        // first two players home, next two away
        for (let p = 0; p < 2; p++) {
          await tx.matchPlayer.create({
            data: {
              matchTeamId: homeTeam.id,
              playerId: group[p].id,
            },
          });
        }
        for (let p = 2; p < 4; p++) {
          await tx.matchPlayer.create({
            data: {
              matchTeamId: awayTeam.id,
              playerId: group[p].id,
            },
          });
        }

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
