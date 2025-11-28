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
    const myMatchPlayers = await prisma.matchPlayer.findMany({
      where: { playerId },
      include: {
        matchTeam: {
          include: {
            match: true,
            players: {
              include: { player: true },
            },
          },
        },
      },
    });

    // Räkna statistik per lagkamrat
    const partnerStats = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        matchesTogether: number;
        winsTogether: number;
      }
    >();

    for (const mp of myMatchPlayers) {
      const match = mp.matchTeam.match;
      if (match.status !== "COMPLETED") continue;

      // Hitta lagkamrater (samma matchTeam)
      const teammates = mp.matchTeam.players.filter(
        (p) => p.playerId !== playerId
      );

      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore : match.awayScore;
      const theirScore = isHome ? match.awayScore : match.homeScore;
      const won = myScore !== null && theirScore !== null && myScore > theirScore;

      for (const teammate of teammates) {
        const existing = partnerStats.get(teammate.playerId) || {
          playerId: teammate.playerId,
          playerName: teammate.player.name,
          matchesTogether: 0,
          winsTogether: 0,
        };

        existing.matchesTogether++;
        if (won) existing.winsTogether++;

        partnerStats.set(teammate.playerId, existing);
      }
    }

    // Konvertera till array, beräkna vinstprocent och sortera
    const partners = Array.from(partnerStats.values())
      .filter((p) => p.matchesTogether >= 2) // Minst 2 matcher tillsammans
      .map((p) => ({
        ...p,
        winRate: Math.round((p.winsTogether / p.matchesTogether) * 100),
      }))
      .sort((a, b) => {
        // Sortera efter vinstprocent, sedan antal vinster
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.winsTogether - a.winsTogether;
      });

    return NextResponse.json(partners);
  } catch (error) {
    console.error("Error fetching chemistry", error);
    return NextResponse.json(
      { error: "Kunde inte hämta spelkemi" },
      { status: 500 }
    );
  }
}
