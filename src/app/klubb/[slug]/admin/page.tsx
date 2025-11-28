import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createHmac } from "crypto";
import { ClubCreateNightForm } from "./ClubCreateNightForm";
import { ClubPlayersSection } from "./ClubPlayersSection";
import DeleteNightButton from "@/app/admin/DeleteNightButton";

export const dynamic = "force-dynamic";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
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

async function getClubSession() {
  const cookieStore = await cookies();
  const clubCookie = cookieStore.get("club_session");

  if (!clubCookie?.value) {
    return null;
  }

  const { valid, data } = verifyToken(clubCookie.value);
  if (!valid || !data) {
    return null;
  }

  try {
    return JSON.parse(data) as { adminId: string; clubId: string };
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubAdminPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Get club by slug
  const club = await prisma.club.findUnique({
    where: { slug },
    include: {
      admins: true,
    },
  });

  if (!club) {
    notFound();
  }

  // Check authentication
  const session = await getClubSession();
  if (!session || session.clubId !== club.id) {
    redirect("/klubb");
  }

  // Get admin info
  const admin = await prisma.clubAdmin.findUnique({
    where: { id: session.adminId },
  });

  if (!admin) {
    redirect("/klubb");
  }

  // Get club's nights
  const nights = await prisma.bouleNight.findMany({
    where: { clubId: club.id },
    orderBy: { date: "asc" },
    include: {
      attendance: {
        where: { present: true },
      },
    },
  });

  // Get club's players
  const clubPlayers = await prisma.clubPlayer.findMany({
    where: { clubId: club.id },
    include: { player: true },
  });

  type NightWithAttendance = (typeof nights)[number];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {club.name}
              </span>
              {club.location && (
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  📍 {club.location}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Admin - Pétanque Crash
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inloggad som {admin.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/klubb/${slug}`}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ← Spelarsida
            </a>
            <form action="/api/club-auth" method="DELETE">
              <button
                type="submit"
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                onClick={async (e) => {
                  e.preventDefault();
                  await fetch("/api/club-auth", { method: "DELETE" });
                  window.location.href = "/klubb";
                }}
              >
                Logga ut
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Kommande kvällar</h2>
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {nights.length === 0 && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Inga Pétanque Crash skapade ännu. Lägg till en i formuläret bredvid.
                </p>
              )}
              {nights.map((night: NightWithAttendance) => (
                <article
                  key={night.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium leading-snug">{night.name}</h3>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/klubb/${slug}/kväll/${night.id}`}
                          className="text-xs font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Spelare-vy →
                        </a>
                        <a
                          href={`/klubb/${slug}/admin/kväll/${night.id}`}
                          className="text-xs font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                        >
                          Redigera
                        </a>
                        <DeleteNightButton id={night.id} />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {new Date(night.date).toLocaleString("sv-SE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {night.type === "DAY" ? "Dag" : "Kväll"}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {night.attendance.length} anmälda
                      {typeof night.maxPlayers === "number" && night.maxPlayers > 0
                        ? ` / max ${night.maxPlayers}`
                        : ""}
                    </p>
                    {night.location && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Plats: {night.location}
                      </p>
                    )}
                    {night.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {night.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Ny Pétanque Crash</h2>
            <ClubCreateNightForm clubId={club.id} />

            <ClubPlayersSection 
              clubId={club.id} 
              existingPlayers={clubPlayers.map(cp => ({
                id: cp.player.id,
                name: cp.player.name,
              }))}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
