import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? null;
}

export async function GET(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

export async function PATCH(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

export async function DELETE(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    await prisma.bouleNight.delete({
      where: { id },
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
