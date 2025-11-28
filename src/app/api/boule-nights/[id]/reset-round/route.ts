import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nightId } = await params;

  if (!nightId || typeof nightId !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await requireAdmin();
  } catch (error) {
    return handleAuthError(error);
  }

  try {
    const body = await req.json();
    const { roundNumber } = body ?? {};

    if (typeof roundNumber !== "number" || roundNumber < 1 || roundNumber > 3) {
      return NextResponse.json(
        { error: "roundNumber must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    // Hitta omgången
    const round = await prisma.round.findFirst({
      where: { nightId, number: roundNumber },
    });

    if (!round) {
      return NextResponse.json(
        { error: `Omgång ${roundNumber} finns inte` },
        { status: 404 }
      );
    }

    // Ta bort allt relaterat till omgången i rätt ordning
    await prisma.$transaction(async (tx) => {
      // 1. Ta bort MatchPlayer för alla matcher i omgången
      await tx.matchPlayer.deleteMany({
        where: { matchTeam: { match: { roundId: round.id } } },
      });

      // 2. Ta bort MatchTeam för alla matcher i omgången
      await tx.matchTeam.deleteMany({
        where: { match: { roundId: round.id } },
      });

      // 3. Ta bort alla matcher i omgången
      await tx.match.deleteMany({
        where: { roundId: round.id },
      });

      // 4. Ta bort omgången
      await tx.round.delete({
        where: { id: round.id },
      });
    });

    return NextResponse.json(
      { ok: true, message: `Omgång ${roundNumber} återställd` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resetting round", error);
    return NextResponse.json(
      { error: "Kunde inte återställa omgången" },
      { status: 500 }
    );
  }
}
