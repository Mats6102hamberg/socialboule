-- CreateTable
CREATE TABLE "PlayRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "message" TEXT,
    "preferredDate" TIMESTAMP(3),
    "nightId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayRequest_pkey" PRIMARY KEY ("id")
);
