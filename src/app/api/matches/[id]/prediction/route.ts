import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { predictMatch } from "@/lib/match-predictor";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const homeTeam = match.teams.find((t) => t.side === "HOME");
    const awayTeam = match.teams.find((t) => t.side === "AWAY");

    if (!homeTeam || !awayTeam ||
        homeTeam.players.length !== 2 ||
        awayTeam.players.length !== 2) {
      return NextResponse.json(
        { error: "Match must have exactly 2 players per team" },
        { status: 400 }
      );
    }

    const prediction = await predictMatch(
      homeTeam.players[0].playerId,
      homeTeam.players[1].playerId,
      awayTeam.players[0].playerId,
      awayTeam.players[1].playerId
    );

    return NextResponse.json({
      matchId: match.id,
      lane: match.lane,
      teams: {
        home: homeTeam.players.map((p) => p.player.name),
        away: awayTeam.players.map((p) => p.player.name),
      },
      prediction,
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json(
      { error: "Failed to generate prediction" },
      { status: 500 }
    );
  }
}
