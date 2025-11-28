import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teamRankings = await prisma.ranking.findMany({
      where: {
        playerId: null,
        teamId: { not: null },
      },
      orderBy: [
        { simplePoints: "desc" },
        { matchesPlayed: "desc" },
      ],
      select: {
        simplePoints: true,
        matchesPlayed: true,
        matchesWon: true,
        eloRating: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedRankings = teamRankings.map((ranking, index) => ({
      rankPosition: index + 1,
      teamId: ranking.team?.id,
      teamName: ranking.team?.name ?? "Okänt Lag",
      simplePoints: ranking.simplePoints,
      matchesPlayed: ranking.matchesPlayed,
      matchesWon: ranking.matchesWon,
      eloRating: ranking.eloRating,
    }));

    return NextResponse.json(formattedRankings);
  } catch (error) {
    console.error("Fel vid hämtning av lagranking:", error);
    return NextResponse.json(
      { error: "Internt serverfel vid hämtning av lagrankingdata." },
      { status: 500 },
    );
  }
}
