import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = context.params;

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
