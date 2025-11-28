import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteNightButton from "@/app/admin/DeleteNightButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubDetailPage({ params }: PageProps) {
  const { id } = await params;

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      admins: true,
      players: {
        include: {
          player: {
            include: {
              ranking: true,
            },
          },
        },
        orderBy: { player: { name: "asc" } },
      },
      nights: {
        orderBy: { date: "desc" },
        include: {
          attendance: {
            where: { present: true },
          },
        },
      },
    },
  });

  if (!club) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                Super Admin
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{club.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {club.location && `📍 ${club.location} · `}
              Skapad {new Date(club.createdAt).toLocaleDateString("sv-SE")}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/klubb/${club.slug}`}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Spelarsida →
            </Link>
            <Link
              href="/admin/klubbar"
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ← Alla klubbar
            </Link>
          </div>
        </header>

        {/* Club admins */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Klubb-admins</h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {club.admins.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Inga admins</p>
            ) : (
              <div className="space-y-2">
                {club.admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
                  >
                    <div>
                      <div className="font-medium">{admin.name}</div>
                      <div className="text-xs text-zinc-500">{admin.email}</div>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Skapad {new Date(admin.createdAt).toLocaleDateString("sv-SE")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Club events */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Events ({club.nights.length})</h2>
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {club.nights.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                Inga events skapade
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {club.nights.map((night) => (
                  <div
                    key={night.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{night.name}</div>
                      <div className="flex gap-3 text-xs text-zinc-500">
                        <span>
                          {new Date(night.date).toLocaleDateString("sv-SE", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span>{night.attendance.length} anmälda</span>
                        <span>{night.type === "DAY" ? "Dag" : "Kväll"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/nights/${night.id}`}
                        className="rounded bg-zinc-100 px-2 py-1 text-xs hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        Spelarsida
                      </Link>
                      <Link
                        href={`/admin/kvall/${night.id}`}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                      >
                        Redigera
                      </Link>
                      <DeleteNightButton id={night.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Club players */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Spelare ({club.players.length})</h2>
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {club.players.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                Inga spelare tillagda
              </p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-4 py-2 text-left font-medium">Namn</th>
                      <th className="px-4 py-2 text-left font-medium">Matcher</th>
                      <th className="px-4 py-2 text-left font-medium">Vinster</th>
                      <th className="px-4 py-2 text-left font-medium">Vinstprocent</th>
                      <th className="px-4 py-2 text-left font-medium">ELO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.players.map((cp) => {
                      const matches = cp.player.ranking?.matchesPlayed ?? 0;
                      const wins = cp.player.ranking?.matchesWon ?? 0;
                      const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

                      return (
                        <tr
                          key={cp.id}
                          className="border-b border-zinc-100 dark:border-zinc-800"
                        >
                          <td className="px-4 py-2 font-medium">{cp.player.name}</td>
                          <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                            {matches}
                          </td>
                          <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                            {wins}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${
                                winRate >= 60
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : winRate >= 40
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                              }`}
                            >
                              {winRate}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                            {cp.player.ranking?.eloRating ?? 1500}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
