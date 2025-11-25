import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
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
        rounds: true,
        matches: {
          where: {
            round: { number: 1 },
            status: "COMPLETED",
          },
          include: {
            teams: {
              include: {
                players: true,
              },
            },
          },
        },
      },
    });

    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingRound2 = night.rounds.find((r) => r.number === 2);
    if (existingRound2) {
      return NextResponse.json(
        { error: "Round 2 already drawn" },
        { status: 400 },
      );
    }

    if (night.matches.length === 0) {
      return NextResponse.json(
        { error: "No completed matches in round 1 to base round 2 on" },
        { status: 400 },
      );
    }

    // Aggregate per-player performance from round 1
    const playerStats = new Map<
      string,
      { playerId: string; wins: number; pointsDiff: number; matches: number }
    >();

    for (const match of night.matches) {
      for (const team of match.teams) {
        for (const mp of team.players) {
          const existing = playerStats.get(mp.playerId) ?? {
            playerId: mp.playerId,
            wins: 0,
            pointsDiff: 0,
            matches: 0,
          };

          const diff = (mp.pointsFor ?? 0) - (mp.pointsAgainst ?? 0);
          const won = mp.won ?? false;

          existing.wins += won ? 1 : 0;
          existing.pointsDiff += diff;
          existing.matches += 1;

          playerStats.set(mp.playerId, existing);
        }
      }
    }

    const rankedPlayers = Array.from(playerStats.values()).sort((a, b) => {
      // Sort by wins desc, then points diff desc
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      return 0;
    });

    if (rankedPlayers.length < 4) {
      return NextResponse.json(
        { error: "Need at least 4 players with results to draw round 2" },
        { status: 400 },
      );
    }

    if (rankedPlayers.length % 4 !== 0) {
      return NextResponse.json(
        {
          error:
            "Player count with results must be a multiple of 4 for round 2 draw (e.g. 4, 8, 12)",
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Dubbelkolla inuti transaktionen för att undvika race conditions
      const existingRound = await tx.round.findFirst({
        where: { nightId: id, number: 2 },
      });
      if (existingRound) {
        throw new Error("Round 2 already exists");
      }

      const round = await tx.round.create({
        data: {
          nightId: id,
          number: 2,
        },
      });

      const matchesCreated: { matchId: string; lane: number }[] = [];
      let lane = 1;

      for (let i = 0; i < rankedPlayers.length; i += 4) {
        const group = rankedPlayers.slice(i, i + 4);
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

        // Simple pairing: top 2 in group vs next 2
        for (let p = 0; p < 2; p++) {
          await tx.matchPlayer.create({
            data: {
              matchTeamId: homeTeam.id,
              playerId: group[p].playerId,
            },
          });
        }
        for (let p = 2; p < 4; p++) {
          await tx.matchPlayer.create({
            data: {
              matchTeamId: awayTeam.id,
              playerId: group[p].playerId,
            },
          });
        }

        matchesCreated.push({ matchId: match.id, lane });
        lane += 1;
      }

      return { roundId: round.id, matches: matchesCreated };
    });

    const referer = req.headers.get("referer");
    if (referer) {
      return NextResponse.redirect(referer, { status: 303 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error drawing round 2", error);
    return NextResponse.json(
      { error: "Failed to draw round 2" },
      { status: 500 },
    );
  }
}
