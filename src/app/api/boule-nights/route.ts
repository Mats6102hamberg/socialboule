import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const body = await req.json();

    const { name, date, location, description } = body ?? {};

    if (!name || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, date" },
        { status: 400 }
      );
    }

    const created = await prisma.bouleNight.create({
      data: {
        name,
        date: new Date(date),
        location: location ?? null,
        description: description ?? null,
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
