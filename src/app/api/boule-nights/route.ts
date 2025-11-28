import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth";
import { sanitizeString, sanitizeNumber, sanitizeDate } from "@/lib/sanitize";

export async function GET() {
  try {
    const nights = await prisma.bouleNight.findMany({
      orderBy: { date: "asc" },
    });

    return NextResponse.json(nights, { status: 200 });
  } catch (error) {
    console.error("Error fetching boule nights", error);
    return NextResponse.json(
      { error: "Failed to fetch boule nights" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication for creating nights
    await requireAdmin();
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await req.json();

    const { name, date, location, description, type, drawMode, maxPlayers } = body ?? {};

    if (!name || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, date" },
        { status: 400 }
      );
    }

    // Sanitize string inputs
    const sanitizedName = sanitizeString(name, { maxLength: 200, allowHtml: false });
    const sanitizedLocation = location ? sanitizeString(location, { maxLength: 500, allowHtml: false }) : null;
    const sanitizedDescription = description ? sanitizeString(description, { maxLength: 2000, allowHtml: false }) : null;

    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Invalid name" },
        { status: 400 }
      );
    }

    // Validate date
    const parsedDate = sanitizeDate(date);
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    let parsedType: "DAY" | "EVENING" = "EVENING";
    if (type === "DAY" || type === "EVENING") {
      parsedType = type;
    }

    let parsedDrawMode: "INDIVIDUAL" | "TEAM" = "INDIVIDUAL";
    if (drawMode === "INDIVIDUAL" || drawMode === "TEAM") {
      parsedDrawMode = drawMode;
    }

    const parsedMaxPlayers = sanitizeNumber(maxPlayers, { min: 1, max: 100, integer: true });

    const created = await prisma.bouleNight.create({
      data: {
        name: sanitizedName,
        date: parsedDate,
        location: sanitizedLocation,
        description: sanitizedDescription,
        type: parsedType,
        drawMode: parsedDrawMode,
        maxPlayers: parsedMaxPlayers,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating boule night", error);
    return NextResponse.json(
      { error: "Failed to create boule night" },
      { status: 500 }
    );
  }
}
