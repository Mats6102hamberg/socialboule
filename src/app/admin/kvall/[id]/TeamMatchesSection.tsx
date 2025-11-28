import { prisma } from "@/lib/prisma";

interface TeamMatchesSectionProps {
  nightId: string;
  roundNumber: number;
}

export async function TeamMatchesSection({
  nightId,
  roundNumber,
}: TeamMatchesSectionProps) {
  const matches = await prisma.match.findMany({
    where: {
      nightId,
      round: { number: roundNumber },
    },
    include: {
      teams: {
        include: {
          team: true,
          players: {
            include: { player: true },
          },
        },
      },
    },
    orderBy: { lane: "asc" },
  });

  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header>
        <h2 className="text-base font-medium">Omgång {roundNumber} - Matcher</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Lottade lagmatcher för denna omgång
        </p>
      </header>

      <div className="space-y-2">
        {matches.map((match) => {
          const home = match.teams.find((t) => t.side === "HOME");
          const away = match.teams.find((t) => t.side === "AWAY");
          const homeTeamName = home?.team?.name ?? "Lag A";
          const awayTeamName = away?.team?.name ?? "Lag B";
          const homePlayers = home?.players.map((mp) => mp.player.name).join(", ") ?? "";
          const awayPlayers = away?.players.map((mp) => mp.player.name).join(", ") ?? "";

          return (
            <div
              key={match.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                  {match.lane ?? "-"}
                </span>
                <span className="font-medium">Bana {match.lane ?? "?"}</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {homeTeamName}
                    </span>
                    <span className="text-[10px] text-zinc-500">(Hemma)</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{homePlayers}</p>
                </div>

                <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      {awayTeamName}
                    </span>
                    <span className="text-[10px] text-zinc-500">(Borta)</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{awayPlayers}</p>
                </div>
              </div>

              {/* Resultat om det finns */}
              {(match.homeScore !== null || match.awayScore !== null) && (
                <div className="mt-2 flex items-center justify-center gap-2 text-lg font-bold">
                  <span className="text-blue-600 dark:text-blue-400">{match.homeScore ?? 0}</span>
                  <span className="text-zinc-400">-</span>
                  <span className="text-red-600 dark:text-red-400">{match.awayScore ?? 0}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
