import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      select: {
        updatedAt: true,
        attendance: {
          include: { player: true },
          orderBy: { player: { name: "asc" } },
        },
      },
    });

    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        attendance: night.attendance,
        updatedAt: night.updatedAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching attendance", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { playerIds, lastKnownUpdatedAt } = body ?? {};

    if (!Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: "playerIds must be an array" },
        { status: 400 }
      );
    }

    // Use transaction for race condition protection
    const result = await prisma.$transaction(async (tx) => {
      // Ensure night exists and check for conflicts (optimistic locking)
      const night = await tx.bouleNight.findUnique({
        where: { id },
        select: {
          id: true,
          maxPlayers: true,
          updatedAt: true,
        },
      });

      if (!night) {
        throw new Error("NOT_FOUND");
      }

      // Check for concurrent modifications if lastKnownUpdatedAt is provided
      if (lastKnownUpdatedAt) {
        const lastKnown = new Date(lastKnownUpdatedAt);
        if (night.updatedAt > lastKnown) {
          throw new Error("CONFLICT");
        }
      }

      // Validate maxPlayers constraint (server-side validation)
      if (night.maxPlayers !== null && playerIds.length > night.maxPlayers) {
        throw new Error(`MAX_PLAYERS:${night.maxPlayers}`);
      }

      // Upsert attendance: mark given ids as present, others as not present
      const allPlayers = await tx.player.findMany();
      const idsSet = new Set<string>(playerIds);

      for (const player of allPlayers) {
        const present = idsSet.has(player.id);
        await tx.nightAttendance.upsert({
          where: {
            NightAttendance_night_player_unique: {
              nightId: id,
              playerId: player.id,
            },
          },
          update: { present },
          create: {
            nightId: id,
            playerId: player.id,
            present,
          },
        });
      }

      // Update the night's updatedAt timestamp to reflect the change
      const updatedNight = await tx.bouleNight.update({
        where: { id },
        data: { updatedAt: new Date() },
        select: { updatedAt: true },
      });

      return { updatedAt: updatedNight.updatedAt };
    });

    return NextResponse.json(
      { ok: true, updatedAt: result.updatedAt.toISOString() },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (error.message === "CONFLICT") {
        return NextResponse.json(
          {
            error: "Närvarolistan har ändrats av någon annan. Vänligen ladda om sidan.",
            code: "CONFLICT",
          },
          { status: 409 }
        );
      }
      if (error.message.startsWith("MAX_PLAYERS:")) {
        const maxPlayers = error.message.split(":")[1];
        return NextResponse.json(
          { error: `Max ${maxPlayers} spelare tillåtna för denna kväll` },
          { status: 400 }
        );
      }
    }

    console.error("Error updating attendance", error);
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    );
  }
}
