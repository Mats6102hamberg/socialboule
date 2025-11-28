import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PlayerSelector } from "@/app/PlayerSelector";
import { NightsList } from "@/app/NightsList";
import { PlayerStats } from "@/app/PlayerStats";
import { ChemistrySection } from "@/app/ChemistrySection";
import { Leaderboard } from "@/app/Leaderboard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;

  // Get club by slug
  const club = await prisma.club.findUnique({
    where: { slug },
  });

  if (!club) {
    notFound();
  }

  // Get club's upcoming nights
  const rawNights = await prisma.bouleNight.findMany({
    where: {
      clubId: club.id,
      date: { gte: new Date() },
    },
    orderBy: { date: "asc" },
    include: {
      attendance: {
        where: { present: true },
        include: { player: true },
      },
    },
  });

  // Serialize dates for client component
  const nights = rawNights.map((night) => ({
    ...night,
    date: night.date.toISOString(),
    createdAt: night.createdAt.toISOString(),
    updatedAt: night.updatedAt.toISOString(),
    attendance: night.attendance.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      player: {
        ...a.player,
        createdAt: a.player.createdAt.toISOString(),
        updatedAt: a.player.updatedAt.toISOString(),
      },
    })),
  }));

  // Get club's players
  const clubPlayers = await prisma.clubPlayer.findMany({
    where: { clubId: club.id },
    include: { player: true },
    orderBy: { player: { name: "asc" } },
  });

  const players = clubPlayers.map((cp) => cp.player);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {club.name}
              </span>
              {club.location && (
                <span className="text-xs text-zinc-500">📍 {club.location}</span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">🎱 Pétanque Crash</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Välkommen! Anmäl dig till kommande kvällar, se dina resultat och kolla vem du spelar bäst med.
            </p>
          </div>
        </header>

        {/* Välj spelare */}
        <PlayerSelector players={players} />

        {/* Kommande kvällar */}
        <NightsList nights={nights} />

        {/* Mina resultat */}
        <PlayerStats />

        {/* Kemi-indikator */}
        <ChemistrySection />

        {/* Topplista */}
        <Leaderboard />

        {/* Admin-länk */}
        <div className="text-center">
          <a
            href={`/klubb/${slug}/admin`}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Admin →
          </a>
        </div>
      </main>
    </div>
  );
}
