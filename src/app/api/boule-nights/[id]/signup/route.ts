import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Anmäl spelare
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nightId } = await params;

  if (!nightId || typeof nightId !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to sign up" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { playerId } = body ?? {};

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    // Verify that the authenticated user matches the playerId
    if (session.playerId !== playerId) {
      return NextResponse.json(
        { error: "Forbidden: You can only sign up yourself" },
        { status: 403 }
      );
    }

    // Kolla om kvällen finns
    const night = await prisma.bouleNight.findUnique({
      where: { id: nightId },
      include: {
        attendance: { where: { present: true } },
      },
    });

    if (!night) {
      return NextResponse.json({ error: "Kväll finns inte" }, { status: 404 });
    }

    // Kolla om det är fullt
    if (
      night.maxPlayers !== null &&
      night.attendance.length >= night.maxPlayers
    ) {
      return NextResponse.json({ error: "Kvällen är full" }, { status: 400 });
    }

    // Kolla om spelaren redan är anmäld
    const existing = await prisma.nightAttendance.findFirst({
      where: { nightId, playerId },
    });

    if (existing) {
      // Uppdatera till present: true
      await prisma.nightAttendance.update({
        where: { id: existing.id },
        data: { present: true },
      });
    } else {
      // Skapa ny anmälan
      await prisma.nightAttendance.create({
        data: {
          nightId,
          playerId,
          present: true,
        },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error signing up", error);
    return NextResponse.json({ error: "Kunde inte anmäla" }, { status: 500 });
  }
}

// Avanmäl spelare
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nightId } = await params;

  if (!nightId || typeof nightId !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to cancel signup" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { playerId } = body ?? {};

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }

    // Verify that the authenticated user matches the playerId
    if (session.playerId !== playerId) {
      return NextResponse.json(
        { error: "Forbidden: You can only cancel your own signup" },
        { status: 403 }
      );
    }

    // Hitta anmälan
    const existing = await prisma.nightAttendance.findFirst({
      where: { nightId, playerId },
    });

    if (existing) {
      await prisma.nightAttendance.update({
        where: { id: existing.id },
        data: { present: false },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error canceling signup", error);
    return NextResponse.json({ error: "Kunde inte avanmäla" }, { status: 500 });
  }
}
