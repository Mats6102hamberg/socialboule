import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const scryptAsync = promisify(scrypt);

const CLUB_COOKIE_NAME = "club_session";
const CLUB_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return key === derivedKey.toString("hex");
}

function signToken(data: string): string {
  const secret = getSessionSecret();
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  return `${signature}.${Buffer.from(data).toString("base64")}`;
}

function verifyToken(token: string): { valid: boolean; data?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false };

    const [providedSignature, encodedData] = parts;
    const data = Buffer.from(encodedData, "base64").toString("utf-8");

    const secret = getSessionSecret();
    const expectedSignature = createHmac("sha256", secret).update(data).digest("hex");

    if (providedSignature === expectedSignature) {
      return { valid: true, data };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

// Check if club admin is authenticated
export async function GET() {
  const cookieStore = await cookies();
  const clubCookie = cookieStore.get(CLUB_COOKIE_NAME);

  if (!clubCookie?.value) {
    return NextResponse.json({ authenticated: false });
  }

  const { valid, data } = verifyToken(clubCookie.value);
  
  if (!valid || !data) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const sessionData = JSON.parse(data);
    const admin = await prisma.clubAdmin.findUnique({
      where: { id: sessionData.adminId },
      include: { club: true },
    });

    if (!admin) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
      club: {
        id: admin.club.id,
        name: admin.club.name,
        slug: admin.club.slug,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

// Login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "E-post och lösenord krävs" }, { status: 400 });
    }

    const admin = await prisma.clubAdmin.findUnique({
      where: { email: email.toLowerCase() },
      include: { club: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Fel e-post eller lösenord" }, { status: 401 });
    }

    const validPassword = await verifyPassword(password, admin.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Fel e-post eller lösenord" }, { status: 401 });
    }

    // Create session token
    const sessionData = JSON.stringify({
      adminId: admin.id,
      clubId: admin.clubId,
    });
    const token = signToken(sessionData);
    const cookieStore = await cookies();

    cookieStore.set(CLUB_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CLUB_COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
      club: {
        id: admin.club.id,
        name: admin.club.name,
        slug: admin.club.slug,
      },
    });
  } catch (error) {
    console.error("Club auth error:", error);
    return NextResponse.json({ error: "Något gick fel" }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(CLUB_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
