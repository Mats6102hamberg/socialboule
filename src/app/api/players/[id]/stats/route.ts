import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playerId = params.id;

  if (!playerId || typeof playerId !== "string") {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  try {
    // Hämta alla matcher där spelaren deltagit
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { playerId },
      include: {
        matchTeam: {
          include: {
            match: true,
          },
        },
      },
    });

    let wins = 0;
    let losses = 0;
    let totalPoints = 0;
    let pointsAgainst = 0;

    for (const mp of matchPlayers) {
      const match = mp.matchTeam.match;
      if (match.status !== "COMPLETED") continue;

      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore : match.awayScore;
      const theirScore = isHome ? match.awayScore : match.homeScore;

      if (myScore !== null && theirScore !== null) {
        totalPoints += myScore;
        pointsAgainst += theirScore;

        if (myScore > theirScore) {
          wins++;
        } else {
          losses++;
        }
      }
    }

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return NextResponse.json({
      totalMatches,
      wins,
      losses,
      winRate,
      totalPoints,
      pointsAgainst,
    });
  } catch (error) {
    console.error("Error fetching player stats", error);
    return NextResponse.json(
      { error: "Kunde inte hämta statistik" },
      { status: 500 }
    );
  }
}
