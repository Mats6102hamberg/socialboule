import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Toggle club suspension
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { suspend, reason } = body;

    const club = await prisma.club.findUnique({
      where: { id },
    });

    if (!club) {
      return NextResponse.json({ error: "Klubb hittades inte" }, { status: 404 });
    }

    const updated = await prisma.club.update({
      where: { id },
      data: {
        suspended: suspend,
        suspendedAt: suspend ? new Date() : null,
        suspendedReason: suspend ? (reason || "Avstängd av administratör") : null,
      },
    });

    return NextResponse.json({
      success: true,
      club: {
        id: updated.id,
        name: updated.name,
        suspended: updated.suspended,
        suspendedReason: updated.suspendedReason,
      },
    });
  } catch (error) {
    console.error("Failed to update club suspension:", error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera klubbens status" },
      { status: 500 }
    );
  }
}
