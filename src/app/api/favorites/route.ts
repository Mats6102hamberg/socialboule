import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type FavoriteTargetType = "player" | "team" | "match";

const TARGET_FIELD_MAP: Record<FavoriteTargetType, "playerId" | "teamId" | "matchId"> = {
  player: "playerId",
  team: "teamId",
  match: "matchId",
};

function buildTargetData(targetType: FavoriteTargetType, targetId: string) {
  return {
    playerId: null as string | null,
    teamId: null as string | null,
    matchId: null as string | null,
    [TARGET_FIELD_MAP[targetType]]: targetId,
  };
}

function buildTargetWhere(userId: string, targetType: FavoriteTargetType, targetId: string) {
  return {
    userId,
    [TARGET_FIELD_MAP[targetType]]: targetId,
  };
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@local.socialboule`
        .replace(/[^a-zA-Z0-9@._-]/g, "")
        .slice(0, 60) || `${userId}user@local.socialboule`,
    },
  });
}

export async function GET(req: NextRequest) {
  // Use session playerId instead of accepting userId from query params
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to view favorites" },
      { status: 401 }
    );
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.playerId },
    include: {
      player: true,
      team: true,
      match: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const payload = favorites.map((favorite) => {
    if (favorite.playerId) {
      return {
        id: favorite.id,
        targetType: "player" as const,
        targetId: favorite.playerId,
        label: favorite.player?.name ?? "Spelare",
      };
    }

    if (favorite.teamId) {
      return {
        id: favorite.id,
        targetType: "team" as const,
        targetId: favorite.teamId,
        label: favorite.team?.name ?? "Lag",
      };
    }

    return {
      id: favorite.id,
      targetType: "match" as const,
      targetId: favorite.matchId,
      label: favorite.match?.id ?? "Match",
    };
  });

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  // Use session playerId instead of accepting userId from request body
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to add favorites" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { targetType, targetId } = body ?? {};

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId saknas" }, { status: 400 });
  }

  if (!targetType || !["player", "team", "match"].includes(targetType)) {
    return NextResponse.json({ error: "targetType måste vara player, team eller match" }, { status: 400 });
  }

  const userId = session.playerId;
  await ensureUser(userId);

  const data = buildTargetData(targetType as FavoriteTargetType, targetId);

  const favorite = await prisma.favorite.upsert({
    where:
      targetType === "player"
        ? { userId_playerId: { userId, playerId: targetId } }
        : targetType === "team"
        ? { userId_teamId: { userId, teamId: targetId } }
        : { userId_matchId: { userId, matchId: targetId } },
    update: {},
    create: {
      userId,
      ...data,
    },
    include: {
      player: true,
      team: true,
      match: true,
    },
  });

  return NextResponse.json({
    id: favorite.id,
    targetType,
    targetId,
  });
}

export async function DELETE(req: NextRequest) {
  // Use session playerId instead of accepting userId from request body
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to remove favorites" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { targetType, targetId } = body ?? {};

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId saknas" }, { status: 400 });
  }

  if (!targetType || !["player", "team", "match"].includes(targetType)) {
    return NextResponse.json({ error: "targetType måste vara player, team eller match" }, { status: 400 });
  }

  const userId = session.playerId;
  const where = buildTargetWhere(userId, targetType as FavoriteTargetType, targetId);
  const { count } = await prisma.favorite.deleteMany({ where });

  if (count === 0) {
    return NextResponse.json({ removed: false }, { status: 200 });
  }

  return NextResponse.json({ removed: true });
}
