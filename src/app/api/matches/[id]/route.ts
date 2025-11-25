import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const idx = segments.lastIndexOf("matches");
  if (idx === -1 || idx + 1 >= segments.length) return null;
  return segments[idx + 1] ?? null;
}

export async function PATCH(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { homeScore, awayScore } = body ?? {};

    if (
      typeof homeScore !== "number" ||
      typeof awayScore !== "number" ||
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return NextResponse.json(
        { error: "homeScore and awayScore must be non-negative numbers" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id },
        include: {
          teams: {
            include: {
              players: true,
            },
          },
        },
      });

      if (!match) {
        throw new Error("MATCH_NOT_FOUND");
      }

      const homeTeam = match.teams.find((t) => t.side === "HOME");
      const awayTeam = match.teams.find((t) => t.side === "AWAY");

      if (!homeTeam || !awayTeam) {
        throw new Error("TEAMS_NOT_FOUND");
      }

      const homeWon = homeScore > awayScore;
      const awayWon = awayScore > homeScore;

      const updatedMatch = await tx.match.update({
        where: { id: match.id },
        data: {
          homeScore,
          awayScore,
          status: "COMPLETED",
        },
      });

      const playerUpdates: Promise<unknown>[] = [];

      for (const mp of homeTeam.players) {
        playerUpdates.push(
          tx.matchPlayer.update({
            where: { id: mp.id },
            data: {
              pointsFor: homeScore,
              pointsAgainst: awayScore,
              won: homeWon,
            },
          }),
        );
      }

      for (const mp of awayTeam.players) {
        playerUpdates.push(
          tx.matchPlayer.update({
            where: { id: mp.id },
            data: {
              pointsFor: awayScore,
              pointsAgainst: homeScore,
              won: awayWon,
            },
          }),
        );
      }

      await Promise.all(playerUpdates);

      return updatedMatch;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "MATCH_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "TEAMS_NOT_FOUND") {
      return NextResponse.json({ error: "Match teams not found" }, { status: 500 });
    }

    console.error("Error updating match result", error);
    return NextResponse.json(
      { error: "Failed to update match result" },
      { status: 500 },
    );
  }
}
