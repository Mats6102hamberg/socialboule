import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "player_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Get session secret from environment variable
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long");
  }
  return secret;
}

export interface Session {
  playerId: string;
  playerName?: string;
}

/**
 * Sign session data with HMAC to prevent tampering
 */
function signSession(session: Session): string {
  const sessionJson = JSON.stringify(session);
  const secret = getSessionSecret();
  const signature = createHmac("sha256", secret)
    .update(sessionJson)
    .digest("hex");

  // Return format: signature.base64(sessionData)
  return `${signature}.${Buffer.from(sessionJson).toString("base64")}`;
}

/**
 * Verify and parse a signed session
 * Returns null if signature is invalid or data is malformed
 */
function verifySession(signedSession: string): Session | null {
  try {
    const parts = signedSession.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [providedSignature, encodedData] = parts;
    const sessionJson = Buffer.from(encodedData, "base64").toString("utf-8");

    // Verify signature
    const secret = getSessionSecret();
    const expectedSignature = createHmac("sha256", secret)
      .update(sessionJson)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )) {
      return null;
    }

    // Parse and return session
    const session = JSON.parse(sessionJson) as Session;

    // Validate session structure
    if (!session.playerId || typeof session.playerId !== "string") {
      return null;
    }

    return session;
  } catch {
    return null;
  }
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

  return verifySession(sessionCookie.value);
}

/**
 * Get session from a NextRequest (for middleware/API routes)
 */
export function getSessionFromRequest(req: NextRequest): Session | null {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return verifySession(sessionCookie.value);
}

/**
 * Create a new session
 */
export async function createSession(playerId: string, playerName?: string) {
  const session: Session = { playerId, playerName };
  const signedSession = signSession(session);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, signedSession, {
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
