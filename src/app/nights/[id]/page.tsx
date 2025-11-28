import { prisma } from "@/lib/prisma";
import { EditNightForm } from "./EditNightForm";
import { AttendanceSection } from "./AttendanceSection";
import { Round1ResultsSection } from "./Round1ResultsSection";
import { Round2ResultsSection } from "./Round2ResultsSection";
import { TeamDrawSection } from "./TeamDrawSection";
import { TeamMatchesSection } from "./TeamMatchesSection";
import { ResetRoundButton } from "./ResetRoundButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function RoundSection({
  nightId,
  roundNumber,
}: {
  nightId: string;
  roundNumber: number;
}) {
  const matches = await prisma.match.findMany({
    where: {
      nightId,
      round: { number: roundNumber },
    },
    include: {
      teams: {
        include: {
          players: {
            include: { player: true },
          },
        },
      },
    },
    orderBy: { lane: "asc" },
  });

  const title = `Omgång ${roundNumber}`;
  const showDrawButton = roundNumber === 2 || roundNumber === 3;
  const drawAction =
    roundNumber === 2
      ? `/api/boule-nights/${nightId}/draw-round-2`
      : `/api/boule-nights/${nightId}/draw-round-3`;

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {roundNumber === 1
              ? "Lottar baserat på markerad närvaro. Kräver att antalet spelare är delbart med 4."
              : roundNumber === 2
              ? "Lottar baserat på resultat från omgång 1. Kräver att antal spelare är delbart med 4."
              : "Lottar baserat på resultat från omgång 1 och 2. Kräver att antal spelare är delbart med 4."}
          </p>
        </div>
        {showDrawButton && matches.length === 0 && (
          <form action={drawAction} method="POST">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {`Lotta omgång ${roundNumber}`}
            </button>
          </form>
        )}
        {matches.length > 0 && (
          <ResetRoundButton nightId={nightId} roundNumber={roundNumber} />
        )}
      </header>

      {matches.length === 0 ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Inga matcher lottade ännu.
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => {
            const home = match.teams.find((t) => t.side === "HOME");
            const away = match.teams.find((t) => t.side === "AWAY");
            const homePlayers = home?.players.map((mp) => mp.player.name).join(", ") ?? "";
            const awayPlayers = away?.players.map((mp) => mp.player.name).join(", ") ?? "";

            return (
              <div
                key={match.id}
                className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                      {match.lane ?? "-"}
                    </span>
                    <span className="font-medium">Bana {match.lane ?? "?"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span>
                      <span className="font-semibold">Lag A:</span> {homePlayers}
                    </span>
                    <span>
                      <span className="font-semibold">Lag B:</span> {awayPlayers}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function NightEditPage({ params }: PageProps) {
  const { id: nightId } = await params;

  // Hämta kvällens info för att kolla drawMode
  const night = await prisma.bouleNight.findUnique({
    where: { id: nightId },
    include: { rounds: true },
  });

  const isTeamMode = night?.drawMode === "TEAM";

  // Hämta lag för laglottning
  const teams = isTeamMode
    ? await prisma.team.findMany({
        include: {
          members: {
            include: { player: true },
          },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const matches = await prisma.match.findMany({
    where: {
      nightId,
      round: { number: 1 },
    },
    include: {
      teams: {
        include: {
          players: {
            include: { player: true },
          },
        },
      },
    },
    orderBy: { lane: "asc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Redigera Pétanque Crash</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Justera uppgifter, närvaro och matcher för vald Pétanque Crash och spara ändringarna
            nedan.
          </p>
        </header>

        <EditNightForm id={nightId} />

        {/* Visa lottningsläge-badge */}
        {night && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isTeamMode
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {isTeamMode ? "🏆 Lagtävling" : "👤 Individuell lottning"}
            </span>
          </div>
        )}

        <AttendanceSection />

        {/* Laglottning eller individuell lottning */}
        {isTeamMode ? (
          (() => {
            const hasRound1 = night?.rounds.some((r) => r.number === 1) ?? false;
            const hasRound2 = night?.rounds.some((r) => r.number === 2) ?? false;
            const hasRound3 = night?.rounds.some((r) => r.number === 3) ?? false;

            // Bestäm vilken omgång som ska lottas härnäst
            const nextRoundToShow = !hasRound1 ? 1 : !hasRound2 ? 2 : !hasRound3 ? 3 : null;

            return (
              <>
                {/* Visa lottade lagmatcher först */}
                {hasRound1 && <TeamMatchesSection nightId={nightId} roundNumber={1} />}
                {hasRound2 && <TeamMatchesSection nightId={nightId} roundNumber={2} />}
                {hasRound3 && <TeamMatchesSection nightId={nightId} roundNumber={3} />}

                {/* Visa lottningsformulär för nästa omgång */}
                {nextRoundToShow && (
                  <TeamDrawSection
                    nightId={nightId}
                    teams={teams}
                    roundNumber={nextRoundToShow}
                    hasExistingRound={false}
                  />
                )}

                {/* Alla omgångar lottade */}
                {hasRound1 && hasRound2 && hasRound3 && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                    ✅ Alla tre omgångar är lottade!
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <>
            <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-medium">Omgång 1</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Lottar baserat på markerad närvaro. Kräver att antalet spelare är delbart med 4.
                  </p>
                </div>
                {matches.length === 0 ? (
                  <form action={`/api/boule-nights/${nightId}/draw-round-1`} method="POST">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Lotta omgång 1
                    </button>
                  </form>
                ) : (
                  <ResetRoundButton nightId={nightId} roundNumber={1} />
                )}
              </header>

              {matches.length === 0 ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Inga matcher lottade ännu. Klicka på &quot;Lotta omgång 1&quot; efter att du sparat närvaron.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => {
                    const home = match.teams.find((t) => t.side === "HOME");
                    const away = match.teams.find((t) => t.side === "AWAY");
                    const homePlayers = home?.players.map((mp) => mp.player.name).join(", ") ?? "";
                    const awayPlayers = away?.players.map((mp) => mp.player.name).join(", ") ?? "";

                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                              {match.lane ?? "-"}
                            </span>
                            <span className="font-medium">Bana {match.lane ?? "?"}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span>
                              <span className="font-semibold">Lag A:</span> {homePlayers}
                            </span>
                            <span>
                              <span className="font-semibold">Lag B:</span> {awayPlayers}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Round 2 section */}
            <RoundSection nightId={nightId} roundNumber={2} />

            {/* Round 3 section */}
            <RoundSection nightId={nightId} roundNumber={3} />
          </>
        )}

        <Round2ResultsSection />

        <Round1ResultsSection />
      </main>
    </div>
  );
}
