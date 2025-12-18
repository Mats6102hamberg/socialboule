import { prisma } from "@/lib/prisma";

interface RankingUpdateData {
  winnerPlayerIds: string[];
  loserPlayerIds: string[];
  winningTeamId?: string;
  losingTeamId?: string;
}

const POINTS_WIN = 3;
const POINTS_LOSS = 0;

export async function updateSimpleRanking(data: RankingUpdateData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any[] = [];
  const allPlayerIds = [...data.winnerPlayerIds, ...data.loserPlayerIds];

  for (const playerId of allPlayerIds) {
    const isWinner = data.winnerPlayerIds.includes(playerId);
    const pointsToAdd = isWinner ? POINTS_WIN : POINTS_LOSS;
    const matchesWonAdd = isWinner ? 1 : 0;

    updates.push(
      prisma.ranking.upsert({
        where: { playerId },
        update: {
          simplePoints: { increment: pointsToAdd },
          matchesPlayed: { increment: 1 },
          matchesWon: { increment: matchesWonAdd },
        },
        create: {
          playerId,
          simplePoints: pointsToAdd,
          matchesPlayed: 1,
          matchesWon: matchesWonAdd,
          eloRating: 1500,
        },
      }),
    );
  }

  if (data.winningTeamId) {
    updates.push(createTeamUpsert(data.winningTeamId, true));
  }

  if (data.losingTeamId) {
    updates.push(createTeamUpsert(data.losingTeamId, false));
  }

  function createTeamUpsert(teamId: string, isWinner: boolean) {
    const pointsToAdd = isWinner ? POINTS_WIN : POINTS_LOSS;
    const matchesWonAdd = isWinner ? 1 : 0;

    return prisma.ranking.upsert({
      where: { teamId },
      update: {
        simplePoints: { increment: pointsToAdd },
        matchesPlayed: { increment: 1 },
        matchesWon: { increment: matchesWonAdd },
      },
      create: {
        teamId,
        simplePoints: pointsToAdd,
        matchesPlayed: 1,
        matchesWon: matchesWonAdd,
        eloRating: 1500,
      },
    });
  }

  await prisma.$transaction(updates);
}
