import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  // .../api/boule-nights/[id]/attendance
  const idx = segments.lastIndexOf("boule-nights");
  if (idx === -1 || idx + 1 >= segments.length) return null;
  return segments[idx + 1] ?? null;
}

export async function GET(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const night = await prisma.bouleNight.findUnique({
      where: { id },
      include: {
        attendance: {
          include: { player: true },
          orderBy: { player: { name: "asc" } },
        },
      },
    });

    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(night.attendance, { status: 200 });
  } catch (error) {
    console.error("Error fetching attendance", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { playerIds } = body ?? {};

    if (!Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: "playerIds must be an array" },
        { status: 400 }
      );
    }

    // Ensure night exists
    const night = await prisma.bouleNight.findUnique({ where: { id } });
    if (!night) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Upsert attendance: mark given ids as present, others as not present
    const allPlayers = await prisma.player.findMany();
    const idsSet = new Set<string>(playerIds);

    const operations: Promise<unknown>[] = [];

    for (const player of allPlayers) {
      const present = idsSet.has(player.id);
      operations.push(
        prisma.nightAttendance.upsert({
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
        })
      );
    }

    await Promise.all(operations);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating attendance", error);
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    );
  }
}
