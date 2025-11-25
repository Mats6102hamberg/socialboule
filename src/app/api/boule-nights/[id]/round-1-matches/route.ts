import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getIdFromRequest(req: NextRequest): string | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
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
    const matches = await prisma.match.findMany({
      where: {
        nightId: id,
        round: { number: 1 },
      },
      include: {
        teams: {
          include: {
            players: {
              include: { player: true },
            },
          },
        },
      },
      orderBy: { lane: "asc" },
    });

    return NextResponse.json(matches, { status: 200 });
  } catch (error) {
    console.error("Error fetching round 1 matches", error);
    return NextResponse.json(
      { error: "Failed to fetch round 1 matches" },
      { status: 500 },
    );
  }
}
