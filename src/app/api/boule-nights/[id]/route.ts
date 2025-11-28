import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const night = await prisma.bouleNight.findUnique({
      where: { id },
    });

    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(night, { status: 200 });
  } catch (error) {
    console.error("Error fetching boule night", error);
    return NextResponse.json(
      { error: "Failed to fetch boule night" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    // Require admin authentication for modifying nights
    await requireAdmin();
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await req.json();
    const { name, date, location, description, type, maxPlayers } = body ?? {};

    if (!name || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, date" },
        { status: 400 }
      );
    }

    let parsedType: "DAY" | "EVENING" | undefined;
    if (type === "DAY" || type === "EVENING") {
      parsedType = type;
    }

    let parsedMaxPlayers: number | null | undefined = undefined;
    if (typeof maxPlayers === "number") {
      if (Number.isFinite(maxPlayers) && maxPlayers > 0) {
        parsedMaxPlayers = Math.floor(maxPlayers);
      } else {
        parsedMaxPlayers = null;
      }
    }

    const updated = await prisma.bouleNight.update({
      where: { id },
      data: {
        name,
        date: new Date(date),
        location: location ?? null,
        description: description ?? null,
        ...(parsedType ? { type: parsedType } : {}),
        ...(parsedMaxPlayers !== undefined ? { maxPlayers: parsedMaxPlayers } : {}),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating boule night", error);
    return NextResponse.json(
      { error: "Failed to update boule night" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    // Require admin authentication for deleting nights
    await requireAdmin();
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete all match-related data for this night
      const matches = await tx.match.findMany({
        where: { nightId: id },
        select: { id: true },
      });

      const matchIds = matches.map((m) => m.id);

      if (matchIds.length > 0) {
        await tx.matchPlayer.deleteMany({
          where: { matchTeam: { matchId: { in: matchIds } } },
        });

        await tx.matchTeam.deleteMany({
          where: { matchId: { in: matchIds } },
        });

        await tx.match.deleteMany({
          where: { id: { in: matchIds } },
        });
      }

      // Delete rounds for this night
      await tx.round.deleteMany({
        where: { nightId: id },
      });

      // Delete attendance for this night
      await tx.nightAttendance.deleteMany({
        where: { nightId: id },
      });

      // Finally delete the night itself
      await tx.bouleNight.delete({
        where: { id },
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting boule night", error);
    return NextResponse.json(
      { error: "Failed to delete boule night" },
      { status: 500 }
    );
  }
}
