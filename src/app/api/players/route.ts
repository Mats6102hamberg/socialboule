import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/sanitize";

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(players, { status: 200 });
  } catch (error) {
    console.error("Error fetching players", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // TODO: restore admin protection when demo är över
  try {
    const body = await req.json();
    const { name } = body ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Sanitize name input
    const sanitizedName = sanitizeString(name, { maxLength: 100, allowHtml: false });

    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Invalid name" },
        { status: 400 }
      );
    }

    const created = await prisma.player.create({
      data: { name: sanitizedName },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating player", error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}
