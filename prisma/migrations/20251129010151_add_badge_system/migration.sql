-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('COMEBACK_KING', 'SNIPER', 'IRON_MAN', 'PERFECTIONIST', 'HOT_STREAK', 'UNSTOPPABLE', 'RISING_STAR', 'CHAMPION', 'DYNAMIC_DUO', 'TEAM_PLAYER', 'POINT_MASTER', 'DEFENSIVE_WALL', 'NIGHT_OWL', 'EARLY_BIRD', 'COMEBACK_SPECIALIST');

-- CreateTable
CREATE TABLE "PlayerBadge" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "PlayerBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerBadge_playerId_idx" ON "PlayerBadge"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBadge_playerId_badgeType_key" ON "PlayerBadge"("playerId", "badgeType");

-- AddForeignKey
ALTER TABLE "PlayerBadge" ADD CONSTRAINT "PlayerBadge_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
