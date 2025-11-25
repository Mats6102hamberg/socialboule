import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const idx = segments.lastIndexOf("teams");
  if (idx === -1 || idx + 1 >= segments.length) return null;
  return segments[idx + 1] ?? null;
}

// GET /api/teams/[id] - Hämta ett lag
export async function GET(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error fetching team", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Uppdatera lag (namn och medlemmar)
export async function PUT(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, playerIds } = body as {
      name?: string;
      playerIds?: string[];
    };

    // Uppdatera i en transaktion
    const team = await prisma.$transaction(async (tx) => {
      // Uppdatera namn om det finns
      const updatedTeam = await tx.team.update({
        where: { id },
        data: name ? { name: name.trim() } : {},
      });

      // Om playerIds skickas, ersätt alla medlemmar
      if (playerIds !== undefined) {
        // Ta bort alla befintliga medlemmar
        await tx.teamMember.deleteMany({
          where: { teamId: id },
        });

        // Lägg till nya medlemmar
        if (playerIds.length > 0) {
          await tx.teamMember.createMany({
            data: playerIds.map((playerId) => ({
              teamId: id,
              playerId,
            })),
          });
        }
      }

      // Hämta uppdaterat lag med medlemmar
      return tx.team.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              player: true,
            },
          },
        },
      });
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error updating team", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Ta bort lag
export async function DELETE(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.team.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
