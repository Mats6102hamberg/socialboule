import { NextRequest, NextResponse } from "next/server";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/session
 * Get the current session
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    // Verify that the player still exists
    const player = await prisma.player.findUnique({
      where: { id: session.playerId },
      select: { id: true, name: true },
    });

    if (!player) {
      await destroySession();
      return NextResponse.json({ session: null }, { status: 200 });
    }

    return NextResponse.json({
      session: {
        playerId: player.id,
        playerName: player.name,
      },
    });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/session
 * Create a new session (login)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId } = body;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid playerId" },
        { status: 400 }
      );
    }

    // Verify that the player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const session = await createSession(player.id, player.name);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Destroy the current session (logout)
 */
export async function DELETE() {
  try {
    await destroySession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error destroying session:", error);
    return NextResponse.json(
      { error: "Failed to destroy session" },
      { status: 500 }
    );
  }
}
