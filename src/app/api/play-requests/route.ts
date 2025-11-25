import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.playRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error("Error fetching play requests", error);
    return NextResponse.json(
      { error: "Failed to fetch play requests" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, message, preferredDate } = body ?? {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedMessage = typeof message === "string" ? message.trim() : "";

    let parsedDate: Date | null = null;
    if (preferredDate) {
      const d = new Date(preferredDate);
      if (!Number.isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const created = await prisma.playRequest.create({
      data: {
        name: trimmedName || null,
        message: trimmedMessage || null,
        preferredDate: parsedDate,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating play request", error);
    return NextResponse.json(
      { error: "Failed to create play request" },
      { status: 500 },
    );
  }
}
