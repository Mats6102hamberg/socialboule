import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "player_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  playerId: string;
  playerName?: string;
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value) as Session;
    return session;
  } catch {
    return null;
  }
}

/**
 * Get session from a NextRequest (for middleware/API routes)
 */
export function getSessionFromRequest(req: NextRequest): Session | null {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie.value) as Session;
    return session;
  } catch {
    return null;
  }
}

/**
 * Create a new session
 */
export async function createSession(playerId: string, playerName?: string) {
  const session: Session = { playerId, playerName };
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return session;
}

/**
 * Destroy the current session
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Require a valid session or throw an error
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: No valid session");
  }

  return session;
}

/**
 * Check if the current user is authorized to perform an action on behalf of a player
 */
export async function authorizePlayerAction(playerId: string): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  return session.playerId === playerId;
}

/**
 * Require admin access - checks that the user is logged in AND has admin privileges
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();

  // Check if the player has admin privileges
  const player = await prisma.player.findUnique({
    where: { id: session.playerId },
    select: { isAdmin: true },
  });

  if (!player || !player.isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }

  return session;
}

/**
 * Helper to handle authentication errors consistently across API routes
 */
export function handleAuthError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("Forbidden")) {
    return NextResponse.json(
      { error: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { error: "Unauthorized: You must be logged in" },
    { status: 401 }
  );
}
