import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeString, sanitizeDate } from "@/lib/sanitize";

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

    // Sanitize string inputs
    const sanitizedName = name ? sanitizeString(name, { maxLength: 100, allowHtml: false }) : null;
    const sanitizedMessage = message ? sanitizeString(message, { maxLength: 500, allowHtml: false }) : null;

    // Validate date if provided
    const parsedDate = preferredDate ? sanitizeDate(preferredDate) : null;

    const created = await prisma.playRequest.create({
      data: {
        name: sanitizedName,
        message: sanitizedMessage,
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
