import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Create a new player for a club
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, clubId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
    }

    if (!clubId) {
      return NextResponse.json({ error: "Klubb-ID krävs" }, { status: 400 });
    }

    // Create player and link to club in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if player with same name exists
      let player = await tx.player.findFirst({
        where: { name: name.trim() },
      });

      if (!player) {
        player = await tx.player.create({
          data: { name: name.trim() },
        });
      }

      // Check if already linked to club
      const existingLink = await tx.clubPlayer.findUnique({
        where: {
          clubId_playerId: {
            clubId,
            playerId: player.id,
          },
        },
      });

      if (existingLink) {
        return player;
      }

      // Link player to club
      await tx.clubPlayer.create({
        data: {
          clubId,
          playerId: player.id,
        },
      });

      return player;
    });

    return NextResponse.json({ id: result.id, name: result.name });
  } catch (error) {
    console.error("Failed to create club player:", error);
    return NextResponse.json(
      { error: "Kunde inte skapa spelare" },
      { status: 500 }
    );
  }
}

// Get players for a club
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clubId = searchParams.get("clubId");

  if (!clubId) {
    return NextResponse.json({ error: "Klubb-ID krävs" }, { status: 400 });
  }

  try {
    const clubPlayers = await prisma.clubPlayer.findMany({
      where: { clubId },
      include: { player: true },
      orderBy: { player: { name: "asc" } },
    });

    const players = clubPlayers.map((cp) => ({
      id: cp.player.id,
      name: cp.player.name,
    }));

    return NextResponse.json(players);
  } catch (error) {
    console.error("Failed to get club players:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta spelare" },
      { status: 500 }
    );
  }
}
