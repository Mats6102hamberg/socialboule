import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth";

/**
 * POST /api/boule-nights/[id]/draw-team-round
 *
 * Lottar en ny omgång med laglottning.
 * Kräver att kvällen har drawMode = TEAM.
 * Tar emot teamIds i body för vilka lag som ska delta.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await requireAdmin();
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { teamIds } = body as { teamIds?: string[] };

    const night = await prisma.bouleNight.findUnique({
      where: { id },
      include: {
        rounds: true,
      },
    });

    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (night.drawMode !== "TEAM") {
      return NextResponse.json(
        { error: "This night uses individual draw mode, not team mode" },
        { status: 400 }
      );
    }

    // Hämta lag som ska delta
    if (!teamIds || teamIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 teams are required for team draw" },
        { status: 400 }
      );
    }

    if (teamIds.length % 2 !== 0) {
      return NextResponse.json(
        { error: "Number of teams must be even for team draw" },
        { status: 400 }
      );
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
    });

    if (teams.length !== teamIds.length) {
      return NextResponse.json(
        { error: "Some teams were not found" },
        { status: 400 }
      );
    }

    // Kontrollera att alla lag har minst 1 spelare
    const emptyTeams = teams.filter((t) => t.members.length === 0);
    if (emptyTeams.length > 0) {
      return NextResponse.json(
        { error: `Teams without players: ${emptyTeams.map((t) => t.name).join(", ")}` },
        { status: 400 }
      );
    }

    // Beräkna nästa omgångsnummer
    const nextRoundNumber = night.rounds.length + 1;

    // Shuffla lagen
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Skapa omgång och matcher i en transaktion
    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.round.create({
        data: {
          nightId: id,
          number: nextRoundNumber,
        },
      });

      const matchesCreated = [] as { matchId: string; lane: number; homeTeam: string; awayTeam: string }[];
      let lane = 1;

      // Skapa matcher parvis
      for (let i = 0; i < shuffled.length; i += 2) {
        const homeTeamData = shuffled[i];
        const awayTeamData = shuffled[i + 1];

        const match = await tx.match.create({
          data: {
            nightId: id,
            roundId: round.id,
            lane,
          },
        });

        // Skapa hemmalag med koppling till Team
        const homeMatchTeam = await tx.matchTeam.create({
          data: {
            matchId: match.id,
            side: "HOME",
            teamId: homeTeamData.id,
          },
        });

        // Skapa bortlag med koppling till Team
        const awayMatchTeam = await tx.matchTeam.create({
          data: {
            matchId: match.id,
            side: "AWAY",
            teamId: awayTeamData.id,
          },
        });

        // Lägg till spelare från hemmalaget
        for (const member of homeTeamData.members) {
          await tx.matchPlayer.create({
            data: {
              matchTeamId: homeMatchTeam.id,
              playerId: member.player.id,
            },
          });
        }

        // Lägg till spelare från bortalaget
        for (const member of awayTeamData.members) {
          await tx.matchPlayer.create({
            data: {
              matchTeamId: awayMatchTeam.id,
              playerId: member.player.id,
            },
          });
        }

        matchesCreated.push({
          matchId: match.id,
          lane,
          homeTeam: homeTeamData.name,
          awayTeam: awayTeamData.name,
        });
        lane += 1;
      }

      return { roundId: round.id, roundNumber: nextRoundNumber, matches: matchesCreated };
    });

    // Redirect tillbaka om det är en form-submit
    const referer = req.headers.get("referer");
    if (referer) {
      return NextResponse.redirect(referer, { status: 303 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error drawing team round", error);
    return NextResponse.json(
      { error: "Failed to draw team round" },
      { status: 500 }
    );
  }
}
