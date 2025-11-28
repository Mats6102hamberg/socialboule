import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Remove player from club
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: playerId } = await params;
  const { searchParams } = new URL(req.url);
  const clubId = searchParams.get("clubId");

  if (!clubId) {
    return NextResponse.json({ error: "Klubb-ID krävs" }, { status: 400 });
  }

  try {
    // Remove the club-player link
    await prisma.clubPlayer.delete({
      where: {
        clubId_playerId: {
          clubId,
          playerId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove player from club:", error);
    return NextResponse.json(
      { error: "Kunde inte ta bort spelaren" },
      { status: 500 }
    );
  }
}
