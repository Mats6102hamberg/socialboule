/**
 * Match prediction engine using player statistics and machine learning concepts
 */

import { prisma } from "@/lib/prisma";

export interface MatchPrediction {
  homeTeamWinProbability: number;
  awayTeamWinProbability: number;
  confidence: number; // 0-100, how confident we are
  factors: {
    skillDifference: number;
    chemistryAdvantage: "home" | "away" | "neutral";
    formAdvantage: "home" | "away" | "neutral";
    headToHeadRecord?: {
      homeWins: number;
      awayWins: number;
    };
  };
  prediction: "home" | "away" | "toss-up";
  expectedScore: {
    home: number;
    away: number;
  };
}

/**
 * Get player statistics
 */
async function getPlayerWinRate(playerId: string): Promise<number> {
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
  let total = 0;

  for (const mp of matchPlayers) {
    const match = mp.matchTeam.match;
    if (match.status !== "COMPLETED") continue;

    const isHome = mp.matchTeam.side === "HOME";
    const myScore = isHome ? match.homeScore : match.awayScore;
    const theirScore = isHome ? match.awayScore : match.homeScore;

    if (myScore !== null && theirScore !== null) {
      total++;
      if (myScore > theirScore) wins++;
    }
  }

  return total > 0 ? (wins / total) * 100 : 50; // Default to 50% if no history
}

/**
 * Get recent form (last 5 matches)
 */
async function getRecentForm(playerId: string): Promise<number> {
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { playerId },
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
    take: 5,
  });

  let wins = 0;
  let total = 0;

  for (const mp of matchPlayers) {
    const match = mp.matchTeam.match;
    if (match.status !== "COMPLETED") continue;

    const isHome = mp.matchTeam.side === "HOME";
    const myScore = isHome ? match.homeScore : match.awayScore;
    const theirScore = isHome ? match.awayScore : match.homeScore;

    if (myScore !== null && theirScore !== null) {
      total++;
      if (myScore > theirScore) wins++;
    }
  }

  return total > 0 ? (wins / total) * 100 : 50;
}

/**
 * Calculate chemistry between two players
 */
async function getChemistryScore(player1Id: string, player2Id: string): Promise<number> {
  // Find matches where they played together
  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      teams: {
        some: {
          players: {
            some: {
              playerId: player1Id,
            },
          },
        },
      },
    },
    include: {
      teams: {
        include: {
          players: true,
        },
      },
    },
  });

  let togetherWins = 0;
  let togetherTotal = 0;

  for (const match of matches) {
    for (const team of match.teams) {
      const playerIds = team.players.map((p) => p.playerId);

      // Check if both players are in this team
      if (playerIds.includes(player1Id) && playerIds.includes(player2Id)) {
        togetherTotal++;

        const isHome = team.side === "HOME";
        const myScore = isHome ? match.homeScore : match.awayScore;
        const theirScore = isHome ? match.awayScore : match.homeScore;

        if (myScore !== null && theirScore !== null && myScore > theirScore) {
          togetherWins++;
        }
      }
    }
  }

  return togetherTotal > 0 ? (togetherWins / togetherTotal) * 100 : 50;
}

/**
 * Predict match outcome
 */
export async function predictMatch(
  homePlayer1Id: string,
  homePlayer2Id: string,
  awayPlayer1Id: string,
  awayPlayer2Id: string
): Promise<MatchPrediction> {
  // Get win rates
  const [hp1WinRate, hp2WinRate, ap1WinRate, ap2WinRate] = await Promise.all([
    getPlayerWinRate(homePlayer1Id),
    getPlayerWinRate(homePlayer2Id),
    getPlayerWinRate(awayPlayer1Id),
    getPlayerWinRate(awayPlayer2Id),
  ]);

  // Get recent form
  const [hp1Form, hp2Form, ap1Form, ap2Form] = await Promise.all([
    getRecentForm(homePlayer1Id),
    getRecentForm(homePlayer2Id),
    getRecentForm(awayPlayer1Id),
    getRecentForm(awayPlayer2Id),
  ]);

  // Get chemistry
  const [homeChemistry, awayChemistry] = await Promise.all([
    getChemistryScore(homePlayer1Id, homePlayer2Id),
    getChemistryScore(awayPlayer1Id, awayPlayer2Id),
  ]);

  // Calculate team strengths
  const homeSkill = (hp1WinRate + hp2WinRate) / 2;
  const awaySkill = (ap1WinRate + ap2WinRate) / 2;

  const homeForm = (hp1Form + hp2Form) / 2;
  const awayForm = (ap1Form + ap2Form) / 2;

  // Weighted average for prediction
  // 50% skill, 30% form, 20% chemistry
  const homeStrength = homeSkill * 0.5 + homeForm * 0.3 + homeChemistry * 0.2;
  const awayStrength = awaySkill * 0.5 + awayForm * 0.3 + awayChemistry * 0.2;

  // Calculate win probabilities using logistic function
  const skillDiff = homeStrength - awayStrength;

  // Sigmoid function to convert skill difference to probability
  const homeProbability = 100 / (1 + Math.exp(-skillDiff / 10));
  const awayProbability = 100 - homeProbability;

  // Determine factors
  const skillDifference = Math.abs(homeSkill - awaySkill);
  const chemistryAdvantage =
    Math.abs(homeChemistry - awayChemistry) < 5 ? "neutral" :
    homeChemistry > awayChemistry ? "home" : "away";

  const formAdvantage =
    Math.abs(homeForm - awayForm) < 5 ? "neutral" :
    homeForm > awayForm ? "home" : "away";

  // Confidence based on skill difference
  const confidence = Math.min(95, Math.max(55, 50 + Math.abs(skillDiff) * 2));

  // Prediction
  const prediction =
    Math.abs(homeProbability - 50) < 10 ? "toss-up" :
    homeProbability > 50 ? "home" : "away";

  // Expected score (13 is winning score)
  const totalStrength = homeStrength + awayStrength;
  const homeExpected = (homeStrength / totalStrength) * 13;
  const awayExpected = (awayStrength / totalStrength) * 13;

  // Normalize to realistic scores (loser typically gets 7-11 points)
  const expectedScore = {
    home: homeProbability > 50
      ? 13
      : Math.round(7 + (homeProbability / 50) * 4),
    away: awayProbability > 50
      ? 13
      : Math.round(7 + (awayProbability / 50) * 4),
  };

  return {
    homeTeamWinProbability: Math.round(homeProbability),
    awayTeamWinProbability: Math.round(awayProbability),
    confidence: Math.round(confidence),
    factors: {
      skillDifference: Math.round(skillDifference),
      chemistryAdvantage,
      formAdvantage,
    },
    prediction,
    expectedScore,
  };
}

/**
 * Get predictions for all matches in a round
 */
export async function predictRound(roundId: string) {
  const matches = await prisma.match.findMany({
    where: { roundId },
    include: {
      teams: {
        include: {
          players: true,
        },
      },
    },
  });

  const predictions = await Promise.all(
    matches.map(async (match) => {
      const homeTeam = match.teams.find((t) => t.side === "HOME");
      const awayTeam = match.teams.find((t) => t.side === "AWAY");

      if (!homeTeam || !awayTeam ||
          homeTeam.players.length !== 2 ||
          awayTeam.players.length !== 2) {
        return null;
      }

      const prediction = await predictMatch(
        homeTeam.players[0].playerId,
        homeTeam.players[1].playerId,
        awayTeam.players[0].playerId,
        awayTeam.players[1].playerId
      );

      return {
        matchId: match.id,
        lane: match.lane,
        prediction,
      };
    })
  );

  return predictions.filter(Boolean);
}
