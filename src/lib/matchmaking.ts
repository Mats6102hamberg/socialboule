/**
 * Smart matchmaking algorithms for balanced and fair boule matches
 */

import { prisma } from "@/lib/prisma";

export interface PlayerWithStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  recentForm: number; // Last 5 matches performance
}

export interface TeamPairing {
  team1: [PlayerWithStats, PlayerWithStats];
  team2: [PlayerWithStats, PlayerWithStats];
  balanceScore: number; // Lower is better balanced
}

/**
 * Calculate player statistics from match history
 */
export async function getPlayerStats(playerIds: string[]): Promise<Map<string, PlayerWithStats>> {
  const statsMap = new Map<string, PlayerWithStats>();

  for (const playerId of playerIds) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        matchPlayers: {
          include: {
            matchTeam: {
              include: {
                match: true,
              },
            },
          },
          orderBy: {
            matchTeam: {
              match: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    if (!player) continue;

    let wins = 0;
    let losses = 0;
    let totalPointsFor = 0;
    let totalPointsAgainst = 0;
    let recentWins = 0;
    let recentCount = 0;

    for (const mp of player.matchPlayers) {
      const match = mp.matchTeam.match;
      if (match.status !== "COMPLETED") continue;

      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore : match.awayScore;
      const theirScore = isHome ? match.awayScore : match.homeScore;

      if (myScore !== null && theirScore !== null) {
        totalPointsFor += myScore;
        totalPointsAgainst += theirScore;

        const won = myScore > theirScore;
        if (won) {
          wins++;
          if (recentCount < 5) recentWins++;
        } else {
          losses++;
        }

        if (recentCount < 5) recentCount++;
      }
    }

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 50;
    const recentForm = recentCount > 0 ? (recentWins / recentCount) * 100 : 50;

    statsMap.set(playerId, {
      id: player.id,
      name: player.name,
      wins,
      losses,
      totalMatches,
      winRate,
      avgPointsFor: totalMatches > 0 ? totalPointsFor / totalMatches : 0,
      avgPointsAgainst: totalMatches > 0 ? totalPointsAgainst / totalMatches : 0,
      recentForm,
    });
  }

  return statsMap;
}

/**
 * Calculate how balanced a team pairing is
 * Lower score = better balance
 */
function calculateBalanceScore(team1: PlayerWithStats[], team2: PlayerWithStats[]): number {
  const team1Strength = team1.reduce((sum, p) => sum + p.winRate, 0) / team1.length;
  const team2Strength = team2.reduce((sum, p) => sum + p.winRate, 0) / team2.length;

  // Prefer matches where teams are evenly matched
  return Math.abs(team1Strength - team2Strength);
}

/**
 * Check if two players have played together recently
 */
async function havePlayedTogether(
  player1Id: string,
  player2Id: string,
  nightId: string
): Promise<boolean> {
  // Check if they were in the same team in previous rounds
  const previousMatches = await prisma.match.findMany({
    where: {
      nightId,
      status: { in: ["COMPLETED", "IN_PROGRESS"] },
    },
    include: {
      teams: {
        include: {
          players: true,
        },
      },
    },
  });

  for (const match of previousMatches) {
    for (const team of match.teams) {
      const playerIds = team.players.map((p) => p.playerId);
      if (playerIds.includes(player1Id) && playerIds.includes(player2Id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Smart matchmaking algorithm: Balance teams by skill level
 */
export async function createBalancedMatches(
  players: Array<{ id: string; name: string }>,
  nightId: string
): Promise<Array<[string, string, string, string]>> {
  if (players.length % 4 !== 0) {
    throw new Error("Player count must be divisible by 4");
  }

  // Get player statistics
  const playerIds = players.map((p) => p.id);
  const statsMap = await getPlayerStats(playerIds);

  const playersWithStats = players
    .map((p) => statsMap.get(p.id)!)
    .filter(Boolean)
    .sort((a, b) => b.winRate - a.winRate); // Sort by skill level

  const matches: Array<[string, string, string, string]> = [];
  const usedPlayers = new Set<string>();

  // Strategy: Mix strong and weak players to create balanced matches
  // Pair strongest with weakest, second strongest with second weakest, etc.

  const numMatches = players.length / 4;

  for (let matchNum = 0; matchNum < numMatches; matchNum++) {
    const availablePlayers = playersWithStats.filter((p) => !usedPlayers.has(p.id));

    if (availablePlayers.length < 4) break;

    // Sort by win rate
    availablePlayers.sort((a, b) => b.winRate - a.winRate);

    // Take strongest and weakest for balanced pairing
    const player1 = availablePlayers[0]; // Strongest
    const player4 = availablePlayers[availablePlayers.length - 1]; // Weakest
    const player2 = availablePlayers[Math.floor(availablePlayers.length / 3)]; // Mid-strong
    const player3 = availablePlayers[Math.floor((2 * availablePlayers.length) / 3)]; // Mid-weak

    // Check for variety - avoid same pairings
    const playedTogether12 = await havePlayedTogether(player1.id, player2.id, nightId);
    const playedTogether34 = await havePlayedTogether(player3.id, player4.id, nightId);

    // If they've played together, try to swap
    if (playedTogether12 || playedTogether34) {
      // Swap player2 and player3 to create new pairings
      [availablePlayers[Math.floor(availablePlayers.length / 3)], availablePlayers[Math.floor((2 * availablePlayers.length) / 3)]] =
        [availablePlayers[Math.floor((2 * availablePlayers.length) / 3)], availablePlayers[Math.floor(availablePlayers.length / 3)]];
    }

    // Create match: Team 1 (player1 + player4) vs Team 2 (player2 + player3)
    // This creates balanced teams: strong+weak vs mid-strong+mid-weak
    matches.push([player1.id, player4.id, player2.id, player3.id]);

    usedPlayers.add(player1.id);
    usedPlayers.add(player2.id);
    usedPlayers.add(player3.id);
    usedPlayers.add(player4.id);
  }

  return matches;
}

/**
 * Diversity-focused matchmaking: Ensure everyone plays with different partners
 */
export async function createDiverseMatches(
  players: Array<{ id: string; name: string }>,
  nightId: string
): Promise<Array<[string, string, string, string]>> {
  if (players.length % 4 !== 0) {
    throw new Error("Player count must be divisible by 4");
  }

  // Get player statistics
  const playerIds = players.map((p) => p.id);
  const statsMap = await getPlayerStats(playerIds);

  const playersWithStats = players.map((p) => statsMap.get(p.id)!).filter(Boolean);

  const matches: Array<[string, string, string, string]> = [];
  const usedPlayers = new Set<string>();

  // Build a matrix of who has played with whom
  const playedWith = new Map<string, Set<string>>();
  for (const player of playersWithStats) {
    playedWith.set(player.id, new Set());
  }

  // Check previous matches
  const previousMatches = await prisma.match.findMany({
    where: { nightId },
    include: {
      teams: {
        include: {
          players: true,
        },
      },
    },
  });

  for (const match of previousMatches) {
    for (const team of match.teams) {
      const pIds = team.players.map((p) => p.playerId);
      for (let i = 0; i < pIds.length; i++) {
        for (let j = i + 1; j < pIds.length; j++) {
          playedWith.get(pIds[i])?.add(pIds[j]);
          playedWith.get(pIds[j])?.add(pIds[i]);
        }
      }
    }
  }

  // Create matches prioritizing new pairings
  const numMatches = players.length / 4;

  for (let matchNum = 0; matchNum < numMatches; matchNum++) {
    const available = playersWithStats.filter((p) => !usedPlayers.has(p.id));

    if (available.length < 4) break;

    // Find 4 players who haven't played together much
    let bestGroup: PlayerWithStats[] = [];
    let minOverlap = Infinity;

    // Try multiple random combinations to find best diversity
    for (let attempt = 0; attempt < 50; attempt++) {
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const group = shuffled.slice(0, 4);

      // Count how many times these players have played together
      let overlap = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (playedWith.get(group[i].id)?.has(group[j].id)) {
            overlap++;
          }
        }
      }

      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestGroup = group;
        if (overlap === 0) break; // Perfect - no previous pairings
      }
    }

    // Balance the teams within this group
    bestGroup.sort((a, b) => b.winRate - a.winRate);
    const [p1, p2, p3, p4] = bestGroup;

    // Team 1: strongest + weakest, Team 2: middle two
    matches.push([p1.id, p4.id, p2.id, p3.id]);

    usedPlayers.add(p1.id);
    usedPlayers.add(p2.id);
    usedPlayers.add(p3.id);
    usedPlayers.add(p4.id);
  }

  return matches;
}

/**
 * Simple random matchmaking (fallback/default)
 */
export function createRandomMatches(
  players: Array<{ id: string; name: string }>
): Array<[string, string, string, string]> {
  if (players.length % 4 !== 0) {
    throw new Error("Player count must be divisible by 4");
  }

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Array<[string, string, string, string]> = [];

  for (let i = 0; i < shuffled.length; i += 4) {
    const group = shuffled.slice(i, i + 4);
    matches.push([group[0].id, group[1].id, group[2].id, group[3].id]);
  }

  return matches;
}
