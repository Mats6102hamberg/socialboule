import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth";

// GET /api/teams - Hämta alla lag
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

// POST /api/teams - Skapa nytt lag
export async function POST(req: NextRequest) {
  try {
    // Require admin authentication for creating teams
    await requireAdmin();
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await req.json();
    const { name, playerIds } = body as {
      name: string;
      playerIds?: string[];
    };

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        members: playerIds?.length
          ? {
              create: playerIds.map((playerId) => ({
                playerId,
              })),
            }
          : undefined,
      },
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error creating team", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
