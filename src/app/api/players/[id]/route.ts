import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      return NextResponse.json({ error: "Spelare hittades inte" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error(`Fel vid hämtning av spelare med ID ${id}:`, error);
    return NextResponse.json({ error: "Internt serverfel" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  // TODO: add auth again after demo
  const { id } = await context.params;

  try {
    // Check if player exists
    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      return NextResponse.json({ error: "Spelare hittades inte" }, { status: 404 });
    }

    // Delete the player
    await prisma.player.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Spelare borttagen" }, { status: 200 });
  } catch (error) {
    console.error(`Fel vid borttagning av spelare med ID ${id}:`, error);
    return NextResponse.json({ error: "Kunde inte ta bort spelaren. Spelaren kan ha kopplingar till matcher." }, { status: 500 });
  }
}
