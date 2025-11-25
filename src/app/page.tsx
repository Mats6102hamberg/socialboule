import { prisma } from "@/lib/prisma";
import { CreateNightForm } from "./CreateNightForm";
import DeleteNightButton from "./DeleteNightButton";
import { PlayersAdminSection } from "./PlayersAdminSection";

export const dynamic = "force-dynamic";

export default async function Home() {
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
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Boule-kvällar</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Planera och administrera klubbens boule-kvällar. Skapa nya tillfällen, hantera
              deltagare och följ upp närvaro.
            </p>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Kommande kvällar</h2>
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {nights.length === 0 && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Inga boule-kvällar skapade ännu. Lägg till en i formuläret bredvid.
                </p>
              )}
              {nights.map((night: any) => (
                <article
                  key={night.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium leading-snug">{night.name}</h3>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/nights/${night.id}`}
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
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Ny boule-kväll</h2>
            <CreateNightForm />

            <PlayersAdminSection />
          </div>
        </section>
      </main>
    </div>
  );
}
