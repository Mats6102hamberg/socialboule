import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        nightId: id,
        round: { number: 2 },
      },
      include: {
        teams: {
          include: {
            players: {
              include: { player: true },
            },
          },
        },
        resultConfirmations: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { lane: "asc" },
    });

    return NextResponse.json(matches, { status: 200 });
  } catch (error) {
    console.error("Error loading round 2 matches", error);
    return NextResponse.json({ error: "Failed to load matches" }, { status: 500 });
  }
}
