import { prisma } from "@/lib/prisma";
import { TeamsSection } from "./TeamsSection";

export default async function TeamsPage() {
  const [teams, players] = await Promise.all([
    prisma.team.findMany({
      include: {
        members: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.player.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Lag</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Skapa och hantera fasta lag för lagtävlingar. Lagen kan användas vid
            laglottning på Pétanque Crash-event.
          </p>
        </header>

        <TeamsSection initialTeams={teams} allPlayers={players} />
      </main>
    </div>
  );
}
