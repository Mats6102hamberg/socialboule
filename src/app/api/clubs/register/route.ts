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

function signToken(data: string): string {
  const secret = getSessionSecret();
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  return `${signature}.${Buffer.from(data).toString("base64")}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Register new club
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clubName, location, adminName, email, password } = body;

    // Validate input
    if (!clubName || !adminName || !email || !password) {
      return NextResponse.json(
        { error: "Alla fält måste fyllas i" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Lösenordet måste vara minst 6 tecken" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingAdmin = await prisma.clubAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "E-postadressen används redan" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(clubName);
    let slugExists = await prisma.club.findUnique({ where: { slug } });
    let counter = 1;
    while (slugExists) {
      slug = `${slugify(clubName)}-${counter}`;
      slugExists = await prisma.club.findUnique({ where: { slug } });
      counter++;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create club and admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: clubName,
          slug,
          location: location || null,
        },
      });

      const admin = await tx.clubAdmin.create({
        data: {
          name: adminName,
          email: email.toLowerCase(),
          passwordHash,
          clubId: club.id,
        },
      });

      return { club, admin };
    });

    // Create session token and log in
    const sessionData = JSON.stringify({
      adminId: result.admin.id,
      clubId: result.club.id,
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
      club: {
        id: result.club.id,
        name: result.club.name,
        slug: result.club.slug,
      },
      admin: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
      },
    });
  } catch (error) {
    console.error("Club registration error:", error);
    return NextResponse.json(
      { error: "Något gick fel vid registrering" },
      { status: 500 }
    );
  }
}
