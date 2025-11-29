import { prisma } from "@/lib/prisma";

interface RivalStats {
  opponentName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  avgPointDiff: number;
}

/**
 * Hitta en spelares största rivaler (de motståndare spelaren mött mest)
 */
export async function getPlayerRivals(
  playerName: string,
  limit: number = 5
): Promise<{ player: string; rivals: RivalStats[] } | { error: string }> {
  // Hitta spelaren
  const player = await prisma.player.findFirst({
    where: {
      name: {
        contains: playerName,
        mode: "insensitive",
      },
    },
  });

  if (!player) {
    return { error: `Hittade ingen spelare som heter "${playerName}"` };
  }

  // Hämta alla spelarens matcher
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { playerId: player.id },
    include: {
      matchTeam: {
        include: {
          match: {
            include: {
              teams: {
                include: {
                  players: {
                    include: {
                      player: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Bygg upp statistik mot varje motståndare
  const opponentStats = new Map<string, RivalStats>();

  for (const mp of matchPlayers) {
    const match = mp.matchTeam.match;

    // Skippa ofärdiga matcher
    if (match.status !== "COMPLETED") continue;

    const myTeam = mp.matchTeam;
    const opponentTeam = match.teams.find((t) => t.id !== myTeam.id);

    if (!opponentTeam) continue;

    const isHome = myTeam.side === "HOME";
    const myScore = isHome ? match.homeScore : match.awayScore;
    const theirScore = isHome ? match.awayScore : match.homeScore;

    if (myScore === null || theirScore === null) continue;

    const won = myScore > theirScore;

    // Räkna varje motståndare i matchens motståndarlag
    for (const opponentPlayer of opponentTeam.players) {
      const opponentId = opponentPlayer.player.id;
      const opponentName = opponentPlayer.player.name;

      // Skippa om det är samma spelare (kan inte vara sin egen rival)
      if (opponentId === player.id) continue;

      const existing = opponentStats.get(opponentId) || {
        opponentName,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPointsFor: 0,
        totalPointsAgainst: 0,
        avgPointDiff: 0,
      };

      existing.matchesPlayed++;
      if (won) {
        existing.wins++;
      } else {
        existing.losses++;
      }
      existing.totalPointsFor += myScore;
      existing.totalPointsAgainst += theirScore;

      opponentStats.set(opponentId, existing);
    }
  }

  // Beräkna procenttal och medelvärden
  const rivals: RivalStats[] = Array.from(opponentStats.values())
    .map((stats) => {
      const winRate = stats.wins / stats.matchesPlayed;
      const avgPointDiff =
        (stats.totalPointsFor - stats.totalPointsAgainst) / stats.matchesPlayed;

      return {
        ...stats,
        winRate: Math.round(winRate * 100),
        avgPointDiff: Number(avgPointDiff.toFixed(1)),
      };
    })
    // Sortera efter antal matcher (mest mötta först)
    .sort((a, b) => b.matchesPlayed - a.matchesPlayed)
    .slice(0, limit);

  return {
    player: player.name,
    rivals,
  };
}

/**
 * Hitta spelarens tuffaste rival (lägst vinstprocent mot, minst 3 matcher)
 */
export async function getToughestRival(playerName: string) {
  const result = await getPlayerRivals(playerName, 50);

  if ("error" in result) {
    return result;
  }

  // Filtrera rivaler med minst 3 matcher och hitta den tuffaste
  const toughest = result.rivals
    .filter((r) => r.matchesPlayed >= 3)
    .sort((a, b) => a.winRate - b.winRate)[0];

  if (!toughest) {
    return {
      player: result.player,
      message: "Inga rivaler med minst 3 matcher hittades",
    };
  }

  return {
    player: result.player,
    toughestRival: toughest,
  };
}

/**
 * Hitta spelarens favoritmotståndar (högst vinstprocent mot, minst 3 matcher)
 */
export async function getFavoriteOpponent(playerName: string) {
  const result = await getPlayerRivals(playerName, 50);

  if ("error" in result) {
    return result;
  }

  // Filtrera rivaler med minst 3 matcher och hitta den lättaste
  const favorite = result.rivals
    .filter((r) => r.matchesPlayed >= 3)
    .sort((a, b) => b.winRate - a.winRate)[0];

  if (!favorite) {
    return {
      player: result.player,
      message: "Inga motståndare med minst 3 matcher hittades",
    };
  }

  return {
    player: result.player,
    favoriteOpponent: favorite,
  };
}
