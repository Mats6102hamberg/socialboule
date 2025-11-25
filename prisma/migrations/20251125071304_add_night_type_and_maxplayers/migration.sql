-- CreateEnum
CREATE TYPE "NightType" AS ENUM ('DAY', 'EVENING');

-- AlterTable
ALTER TABLE "BouleNight" ADD COLUMN     "maxPlayers" INTEGER,
ADD COLUMN     "type" "NightType" NOT NULL DEFAULT 'EVENING';
