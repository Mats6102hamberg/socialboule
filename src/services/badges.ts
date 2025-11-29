import { prisma } from "@/lib/prisma";
import { BadgeType } from "@/generated/client";

// Badge-metadata för varje typ
export const BADGE_METADATA: Record<
  BadgeType,
  { name: string; description: string; icon: string }
> = {
  COMEBACK_KING: {
    name: "Comeback King",
    description: "Vunnit efter att ha legat under med 7+ poäng",
    icon: "👑",
  },
  SNIPER: {
    name: "Sniper",
    description: "Vunnit 10+ matcher med exakt 13 poäng",
    icon: "🎯",
  },
  IRON_MAN: {
    name: "Järngansen",
    description: "Spelat 50+ matcher totalt",
    icon: "💪",
  },
  PERFECTIONIST: {
    name: "Perfectionist",
    description: "Vunnit 5+ matcher med 13-0",
    icon: "⭐",
  },
  HOT_STREAK: {
    name: "Hot Streak",
    description: "5 vinster i rad",
    icon: "🔥",
  },
  UNSTOPPABLE: {
    name: "Unstoppable",
    description: "10 vinster i rad",
    icon: "🚀",
  },
  RISING_STAR: {
    name: "Rising Star",
    description: "Gått från <40% till >60% vinstprocent",
    icon: "⭐",
  },
  CHAMPION: {
    name: "Champion",
    description: "75%+ vinstprocent (minst 20 matcher)",
    icon: "🏆",
  },
  DYNAMIC_DUO: {
    name: "Dynamic Duo",
    description: "80%+ vinstprocent med samma partner (minst 10 matcher)",
    icon: "🤝",
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Spelat med 20+ olika partners",
    icon: "👥",
  },
  POINT_MASTER: {
    name: "Point Master",
    description: "Genomsnitt 10+ poäng per match (minst 20 matcher)",
    icon: "💯",
  },
  DEFENSIVE_WALL: {
    name: "Defensive Wall",
    description: "Genomsnitt <5 poäng insläppta per match (minst 20 matcher)",
    icon: "🛡️",
  },
  NIGHT_OWL: {
    name: "Night Owl",
    description: "Deltagit i 25+ event",
    icon: "🦉",
  },
  EARLY_BIRD: {
    name: "Early Bird",
    description: "Anmält sig först till 10+ event",
    icon: "🐦",
  },
  COMEBACK_SPECIALIST: {
    name: "Comeback Specialist",
    description: "5+ comebacks (vunnit efter att ha legat under)",
    icon: "💪",
  },
};

interface MatchData {
  won: boolean;
  myScore: number;
  theirScore: number;
  date: Date;
}

/**
 * Beräkna vilka badges en spelare har förtjänat
 */
export async function calculatePlayerBadges(playerId: string): Promise<BadgeType[]> {
  const earnedBadges: BadgeType[] = [];

  // Hämta spelarens matcher
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { playerId },
    include: {
      matchTeam: {
        include: {
          match: {
            include: {
              night: true,
            },
          },
          players: {
            include: {
              player: true,
            },
          },
        },
      },
    },
  });

  const completedMatches = matchPlayers
    .filter((mp) => mp.matchTeam.match.status === "COMPLETED")
    .map((mp) => {
      const match = mp.matchTeam.match;
      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore! : match.awayScore!;
      const theirScore = isHome ? match.awayScore! : match.homeScore!;

      return {
        won: myScore > theirScore,
        myScore,
        theirScore,
        date: match.night.date,
        matchTeam: mp.matchTeam,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalMatches = completedMatches.length;
  const wins = completedMatches.filter((m) => m.won).length;
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;

  // IRON_MAN - Spelat 50+ matcher
  if (totalMatches >= 50) {
    earnedBadges.push(BadgeType.IRON_MAN);
  }

  // SNIPER - Vunnit 10+ matcher med exakt 13 poäng
  const sniperWins = completedMatches.filter(
    (m) => m.won && m.myScore === 13 && m.theirScore < 13
  ).length;
  if (sniperWins >= 10) {
    earnedBadges.push(BadgeType.SNIPER);
  }

  // PERFECTIONIST - Vunnit 5+ matcher med 13-0
  const perfectWins = completedMatches.filter(
    (m) => m.won && m.myScore === 13 && m.theirScore === 0
  ).length;
  if (perfectWins >= 5) {
    earnedBadges.push(BadgeType.PERFECTIONIST);
  }

  // COMEBACK_KING & COMEBACK_SPECIALIST - Vunnit efter att ha legat under
  const comebacks = completedMatches.filter((m) => {
    // Comeback = vunnit 13-X där X >= 7
    return m.won && m.myScore === 13 && m.theirScore >= 7;
  }).length;

  if (comebacks >= 1) {
    earnedBadges.push(BadgeType.COMEBACK_KING);
  }
  if (comebacks >= 5) {
    earnedBadges.push(BadgeType.COMEBACK_SPECIALIST);
  }

  // HOT_STREAK & UNSTOPPABLE - Vinster i rad
  let currentStreak = 0;
  let maxStreak = 0;
  for (const match of completedMatches) {
    if (match.won) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  if (maxStreak >= 5) {
    earnedBadges.push(BadgeType.HOT_STREAK);
  }
  if (maxStreak >= 10) {
    earnedBadges.push(BadgeType.UNSTOPPABLE);
  }

  // CHAMPION - 75%+ vinstprocent (minst 20 matcher)
  if (totalMatches >= 20 && winRate >= 0.75) {
    earnedBadges.push(BadgeType.CHAMPION);
  }

  // POINT_MASTER - Genomsnitt 10+ poäng per match
  if (totalMatches >= 20) {
    const avgPoints =
      completedMatches.reduce((sum, m) => sum + m.myScore, 0) / totalMatches;
    if (avgPoints >= 10) {
      earnedBadges.push(BadgeType.POINT_MASTER);
    }
  }

  // DEFENSIVE_WALL - Genomsnitt <5 poäng insläppta per match
  if (totalMatches >= 20) {
    const avgPointsAgainst =
      completedMatches.reduce((sum, m) => sum + m.theirScore, 0) / totalMatches;
    if (avgPointsAgainst < 5) {
      earnedBadges.push(BadgeType.DEFENSIVE_WALL);
    }
  }

  // TEAM_PLAYER - Spelat med 20+ olika partners
  const uniquePartners = new Set<string>();
  for (const match of completedMatches) {
    const teammates = match.matchTeam.players.filter(
      (p: { playerId: string }) => p.playerId !== playerId
    );
    teammates.forEach((t: { playerId: string }) => uniquePartners.add(t.playerId));
  }
  if (uniquePartners.size >= 20) {
    earnedBadges.push(BadgeType.TEAM_PLAYER);
  }

  // DYNAMIC_DUO - 80%+ vinstprocent med samma partner (minst 10 matcher)
  const partnerStats = new Map<string, { wins: number; total: number }>();
  for (const match of completedMatches) {
    const teammates = match.matchTeam.players.filter(
      (p: { playerId: string }) => p.playerId !== playerId
    );
    for (const teammate of teammates as Array<{ playerId: string }>) {
      const stats = partnerStats.get(teammate.playerId) || { wins: 0, total: 0 };
      stats.total++;
      if (match.won) stats.wins++;
      partnerStats.set(teammate.playerId, stats);
    }
  }

  for (const [, stats] of partnerStats) {
    if (stats.total >= 10 && stats.wins / stats.total >= 0.8) {
      earnedBadges.push(BadgeType.DYNAMIC_DUO);
      break;
    }
  }

  // NIGHT_OWL - Deltagit i 25+ event
  const nightsAttended = await prisma.nightAttendance.count({
    where: { playerId, present: true },
  });
  if (nightsAttended >= 25) {
    earnedBadges.push(BadgeType.NIGHT_OWL);
  }

  return earnedBadges;
}

/**
 * Uppdatera en spelares badges i databasen
 */
export async function updatePlayerBadges(playerId: string): Promise<void> {
  const earnedBadges = await calculatePlayerBadges(playerId);

  // Ta bort badges som inte längre är förtjänade (om vi vill)
  // För nu: lägg bara till nya badges

  for (const badgeType of earnedBadges) {
    await prisma.playerBadge.upsert({
      where: {
        playerId_badgeType: {
          playerId,
          badgeType,
        },
      },
      create: {
        playerId,
        badgeType,
      },
      update: {},
    });
  }
}

/**
 * Hämta en spelares badges från databasen
 */
export async function getPlayerBadges(playerId: string) {
  const badges = await prisma.playerBadge.findMany({
    where: { playerId },
    orderBy: { earnedAt: "desc" },
  });

  return badges.map((badge) => ({
    type: badge.badgeType,
    ...BADGE_METADATA[badge.badgeType],
    earnedAt: badge.earnedAt,
  }));
}
