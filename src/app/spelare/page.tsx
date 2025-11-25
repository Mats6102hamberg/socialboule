import { prisma } from "@/lib/prisma";
import { PlayRequestForm } from "./PlayRequestForm";

export default async function PlayerViewPage() {
  const nights = await prisma.bouleNight.findMany({
    orderBy: { date: "asc" },
    include: {
      attendance: {
        where: { present: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Boule-kvällar</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Den här sidan är för spelare. Här ser du bara information om kommande boule-kvällar.
          </p>
        </header>

        <section className="space-y-6">
          {nights.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inga boule-kvällar är publicerade ännu. Fråga arrangören om mer information.
            </p>
          ) : (
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {nights.map((night: any) => (
                <article
                  key={night.id}
                  className="space-y-1 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h2 className="font-medium leading-snug">{night.name}</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {new Date(night.date).toLocaleString("sv-SE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {" "}
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
                </article>
              ))}
            </div>
          )}
        </section>

        <PlayRequestForm />
      </main>
    </div>
  );
}
