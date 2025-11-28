import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const individualRankings = await prisma.ranking.findMany({
      where: {
        teamId: null,
        playerId: { not: null },
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
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedRankings = individualRankings.map((ranking, index) => ({
      rankPosition: index + 1,
      playerId: ranking.player?.id,
      playerName: ranking.player?.name ?? "Okänd Spelare",
      simplePoints: ranking.simplePoints,
      matchesPlayed: ranking.matchesPlayed,
      matchesWon: ranking.matchesWon,
      eloRating: ranking.eloRating,
    }));

    return NextResponse.json(formattedRankings);
  } catch (error) {
    console.error("Fel vid hämtning av individuell ranking:", error);
    return NextResponse.json(
      { error: "Internt serverfel vid hämtning av rankingdata." },
      { status: 500 },
    );
  }
}
