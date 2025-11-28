import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTeammateSet, pickBalancedPairs, splitIntoGroupsWithByes } from "@/lib/draw-helpers";
// TODO: restore admin auth after demo

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
        rounds: true,
        matches: {
          where: {
            round: { number: { in: [1, 2] } },
            status: { in: ["COMPLETED", "WALKOVER"] },
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

    const existingRound3 = night.rounds.find((r) => r.number === 3);
    if (existingRound3) {
      return NextResponse.json(
        { error: "Round 3 already drawn" },
        { status: 400 },
      );
    }

    if (night.matches.length === 0) {
      return NextResponse.json(
        { error: "No completed matches in round 1 or 2 to base round 3 on" },
        { status: 400 },
      );
    }

    // Aggregate per-player performance from rounds 1 and 2
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
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      return 0;
    });

    if (rankedPlayers.length < 4) {
      return NextResponse.json(
        { error: "Need at least 4 players with results to draw round 3" },
        { status: 400 },
      );
    }

    const teammateSet = buildTeammateSet(night.matches);
    const { groups, byes } = splitIntoGroupsWithByes(rankedPlayers, 4);

    if (groups.length === 0) {
      return NextResponse.json(
        { error: "Need at least 4 players with results to draw round 3" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Dubbelkolla inuti transaktionen för att undvika race conditions
      const existingRound = await tx.round.findFirst({
        where: { nightId: id, number: 3 },
      });
      if (existingRound) {
        throw new Error("Round 3 already exists");
      }

      const round = await tx.round.create({
        data: {
          nightId: id,
          number: 3,
        },
      });

      const matchesCreated: { matchId: string; lane: number }[] = [];
      let lane = 1;

      for (const group of groups) {
        if (group.length < 4) continue;

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

        const pairing = pickBalancedPairs(group, teammateSet);
        const [homePair, awayPair] = pairing;

        for (const pIndex of homePair) {
          const playerId = group[pIndex].playerId;
          await tx.matchPlayer.create({
            data: {
              matchTeamId: homeTeam.id,
              playerId,
            },
          });
        }
        for (const pIndex of awayPair) {
          const playerId = group[pIndex].playerId;
          await tx.matchPlayer.create({
            data: {
              matchTeamId: awayTeam.id,
              playerId,
            },
          });
        }

        matchesCreated.push({ matchId: match.id, lane });
        lane += 1;
      }

      if (byes.length > 0) {
        await tx.roundBye.createMany({
          data: byes.map((player) => ({
            roundId: round.id,
            playerId: player.playerId,
          })),
        });
      }

      return {
        roundId: round.id,
        matches: matchesCreated,
        byes: byes.map((player) => player.playerId),
      };
    });

    const referer = req.headers.get("referer");
    if (referer) {
      return NextResponse.redirect(referer, { status: 303 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error drawing round 3", error);
    return NextResponse.json(
      { error: "Failed to draw round 3" },
      { status: 500 },
    );
  }
}
