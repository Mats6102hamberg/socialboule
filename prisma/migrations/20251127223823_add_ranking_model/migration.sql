-- CreateEnum
CREATE TYPE "ResultConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISPUTED');

-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'WALKOVER';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "walkoverWinner" "TeamSide";

-- CreateTable
CREATE TABLE "MatchResultConfirmation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reportedHomeScore" INTEGER NOT NULL,
    "reportedAwayScore" INTEGER NOT NULL,
    "reportedWalkoverSide" "TeamSide",
    "status" "ResultConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResultConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundBye" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundBye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,
    "simplePoints" INTEGER NOT NULL DEFAULT 0,
    "simpleRankPos" INTEGER,
    "eloRating" INTEGER NOT NULL DEFAULT 1500,
    "eloRankPos" INTEGER,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchResultConfirmation_matchId_playerId_key" ON "MatchResultConfirmation"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_playerId_key" ON "Ranking"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_teamId_key" ON "Ranking"("teamId");

-- AddForeignKey
ALTER TABLE "MatchResultConfirmation" ADD CONSTRAINT "MatchResultConfirmation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResultConfirmation" ADD CONSTRAINT "MatchResultConfirmation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundBye" ADD CONSTRAINT "RoundBye_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundBye" ADD CONSTRAINT "RoundBye_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
