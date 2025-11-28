import { prisma } from "@/lib/prisma";
import { PlayerSelector } from "./PlayerSelector";
import { NightsList } from "./NightsList";
import { PlayerStats } from "./PlayerStats";
import { ChemistrySection } from "./ChemistrySection";
import { Leaderboard } from "./Leaderboard";
import { AIChat } from "@/components/AIChat";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rawNights = await prisma.bouleNight.findMany({
    where: {
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

  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">🎱 Boule-klubben</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Välkommen! Anmäl dig till kommande kvällar, se dina resultat och kolla vem du spelar bäst med.
            </p>
          </div>
          <a
            href="/admin"
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Admin →
          </a>
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
      </main>

      {/* AI Chat Assistant */}
      <AIChat />
    </div>
  );
}
