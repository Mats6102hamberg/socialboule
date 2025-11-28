import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Hämta alla spelare
    const players = await prisma.player.findMany();

    // Hämta alla matchPlayers med matchdata
    const allMatchPlayers = await prisma.matchPlayer.findMany({
      include: {
        matchTeam: {
          include: {
            match: true,
          },
        },
      },
    });

    // Beräkna statistik per spelare
    const statsMap = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        wins: number;
        losses: number;
        pointsFor: number;
        pointsAgainst: number;
      }
    >();

    // Initiera alla spelare
    for (const player of players) {
      statsMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }

    // Beräkna statistik
    for (const mp of allMatchPlayers) {
      const match = mp.matchTeam.match;
      if (match.status !== "COMPLETED") continue;

      const stats = statsMap.get(mp.playerId);
      if (!stats) continue;

      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore : match.awayScore;
      const theirScore = isHome ? match.awayScore : match.homeScore;

      if (myScore !== null && theirScore !== null) {
        stats.pointsFor += myScore;
        stats.pointsAgainst += theirScore;

        if (myScore > theirScore) {
          stats.wins++;
        } else {
          stats.losses++;
        }
      }
    }

    // Konvertera till array och sortera
    const leaderboard = Array.from(statsMap.values())
      .filter((s) => s.wins + s.losses > 0) // Bara spelare med matcher
      .map((s) => ({
        playerId: s.playerId,
        playerName: s.playerName,
        wins: s.wins,
        matches: s.wins + s.losses,
        winRate: Math.round((s.wins / (s.wins + s.losses)) * 100),
        pointsDiff: s.pointsFor - s.pointsAgainst,
      }))
      .sort((a, b) => {
        // Sortera efter vinster, sedan vinstprocent, sedan poängskillnad
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointsDiff - a.pointsDiff;
      });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard", error);
    return NextResponse.json(
      { error: "Kunde inte hämta topplistan" },
      { status: 500 }
    );
  }
}
