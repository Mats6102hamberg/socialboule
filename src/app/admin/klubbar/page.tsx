import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AllClubsAdminPage() {
  // Get all clubs with their stats
  const clubs = await prisma.club.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          nights: true,
          players: true,
          admins: true,
        },
      },
      admins: {
        select: {
          name: true,
          email: true,
        },
      },
      nights: {
        orderBy: { date: "desc" },
        take: 3,
        select: {
          id: true,
          name: true,
          date: true,
        },
      },
    },
  });

  // Get all nights (including those without a club)
  const allNights = await prisma.bouleNight.findMany({
    orderBy: { date: "desc" },
    include: {
      club: true,
      attendance: {
        where: { present: true },
      },
    },
  });

  // Get all players
  const allPlayers = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: {
      ranking: true,
      clubs: {
        include: { club: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">🔧 Super Admin</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Översikt över alla klubbar, events och spelare
            </p>
          </div>
          <a
            href="/admin"
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ← Tillbaka till admin
          </a>
        </header>

        {/* Stats overview */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-2xl font-bold">{clubs.length}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Klubbar</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-2xl font-bold">{allNights.length}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Totalt antal events</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-2xl font-bold">{allPlayers.length}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Totalt antal spelare</div>
          </div>
        </div>

        {/* Clubs section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Klubbar</h2>
          {clubs.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inga klubbar registrerade ännu.
            </p>
          ) : (
            <div className="space-y-3">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{club.name}</h3>
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          /{club.slug}
                        </span>
                        {club.suspended && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                            Avstängd
                          </span>
                        )}
                      </div>
                      {club.location && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          📍 {club.location}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-zinc-500">
                        <span>{club._count.nights} events</span>
                        <span>{club._count.players} spelare</span>
                        <span>{club._count.admins} admin(s)</span>
                      </div>
                      {club.admins.length > 0 && (
                        <div className="mt-2 text-xs text-zinc-500">
                          <span className="font-medium">Admins:</span>{" "}
                          {club.admins.map((a) => `${a.name} (${a.email})`).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/klubb/${club.slug}`}
                        className="rounded bg-zinc-100 px-3 py-1 text-xs font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        Spelarsida
                      </Link>
                      <Link
                        href={`/admin/klubbar/${club.id}`}
                        className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                      >
                        Hantera
                      </Link>
                    </div>
                  </div>
                  {club.nights.length > 0 && (
                    <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <p className="mb-1 text-xs font-medium text-zinc-500">Senaste events:</p>
                      <div className="flex flex-wrap gap-2">
                        {club.nights.map((night) => (
                          <Link
                            key={night.id}
                            href={`/admin/kvall/${night.id}`}
                            className="rounded bg-zinc-50 px-2 py-1 text-xs hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                          >
                            {night.name} ({new Date(night.date).toLocaleDateString("sv-SE")})
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All events section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Alla Events</h2>
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-4 py-2 text-left font-medium">Event</th>
                    <th className="px-4 py-2 text-left font-medium">Klubb</th>
                    <th className="px-4 py-2 text-left font-medium">Datum</th>
                    <th className="px-4 py-2 text-left font-medium">Anmälda</th>
                    <th className="px-4 py-2 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {allNights.map((night) => (
                    <tr
                      key={night.id}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-2">{night.name}</td>
                      <td className="px-4 py-2">
                        {night.club ? (
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                            {night.club.name}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Ingen klubb</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {new Date(night.date).toLocaleDateString("sv-SE")}
                      </td>
                      <td className="px-4 py-2">{night.attendance.length}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/kvall/${night.id}`}
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Redigera →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* All players section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Alla Spelare</h2>
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-4 py-2 text-left font-medium">Namn</th>
                    <th className="px-4 py-2 text-left font-medium">Klubb(ar)</th>
                    <th className="px-4 py-2 text-left font-medium">Matcher</th>
                    <th className="px-4 py-2 text-left font-medium">Vinster</th>
                    <th className="px-4 py-2 text-left font-medium">ELO</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-2 font-medium">{player.name}</td>
                      <td className="px-4 py-2">
                        {player.clubs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {player.clubs.map((cp) => (
                              <span
                                key={cp.clubId}
                                className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                              >
                                {cp.club.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {player.ranking?.matchesPlayed ?? 0}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {player.ranking?.matchesWon ?? 0}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {player.ranking?.eloRating ?? 1500}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
