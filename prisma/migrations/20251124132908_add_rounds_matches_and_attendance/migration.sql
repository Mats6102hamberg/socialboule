/*
  Warnings:

  - You are about to drop the column `awayTeamId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `homeTeamId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamInNight` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roundId` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TeamSide" AS ENUM ('HOME', 'AWAY');

-- DropForeignKey
ALTER TABLE "public"."Match" DROP CONSTRAINT "Match_awayTeamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Match" DROP CONSTRAINT "Match_homeTeamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Player" DROP CONSTRAINT "Player_teamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeamInNight" DROP CONSTRAINT "TeamInNight_nightId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeamInNight" DROP CONSTRAINT "TeamInNight_teamId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "awayTeamId",
DROP COLUMN "endTime",
DROP COLUMN "homeTeamId",
DROP COLUMN "startTime",
ADD COLUMN     "lane" INTEGER,
ADD COLUMN     "roundId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "teamId";

-- DropTable
DROP TABLE "public"."Team";

-- DropTable
DROP TABLE "public"."TeamInNight";

-- CreateTable
CREATE TABLE "NightAttendance" (
    "id" TEXT NOT NULL,
    "nightId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NightAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "nightId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTeam" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "side" "TeamSide" NOT NULL,

    CONSTRAINT "MatchTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "id" TEXT NOT NULL,
    "matchTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NightAttendance_nightId_playerId_key" ON "NightAttendance"("nightId", "playerId");

-- AddForeignKey
ALTER TABLE "NightAttendance" ADD CONSTRAINT "NightAttendance_nightId_fkey" FOREIGN KEY ("nightId") REFERENCES "BouleNight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightAttendance" ADD CONSTRAINT "NightAttendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_nightId_fkey" FOREIGN KEY ("nightId") REFERENCES "BouleNight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchTeamId_fkey" FOREIGN KEY ("matchTeamId") REFERENCES "MatchTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
