import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    where: { suspended: false },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          nights: true,
          players: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-zinc-900">
      {/* Header */}
      <header className="border-b border-emerald-700/50 bg-emerald-900/50">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🎱</span>
            <span className="font-semibold">SocialBoule</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/logga-in"
              className="text-sm text-emerald-200 hover:text-white"
            >
              Logga in
            </Link>
            <Link
              href="/registrera"
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition"
            >
              Registrera klubb
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Boule-klubbar på SocialBoule
          </h1>
          <p className="mt-3 text-emerald-200">
            Hitta din klubb eller registrera en ny
          </p>
        </div>

        {/* Clubs grid */}
        {clubs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎱</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Inga klubbar registrerade ännu
            </h2>
            <p className="text-emerald-200 mb-6">
              Bli först med att registrera din klubb!
            </p>
            <Link
              href="/registrera"
              className="inline-block rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500 transition"
            >
              Registrera din klubb
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link
                key={club.id}
                href={`/klubb/${club.slug}`}
                className="group rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition hover:border-emerald-600 hover:bg-zinc-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-emerald-400 transition">
                      {club.name}
                    </h3>
                    {club.location && (
                      <p className="text-sm text-zinc-400">📍 {club.location}</p>
                    )}
                  </div>
                  <span className="text-2xl">🎱</span>
                </div>

                <div className="flex gap-4 text-xs text-zinc-500">
                  <span>{club._count.players} spelare</span>
                  <span>{club._count.nights} events</span>
                </div>

                {club.description && (
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-2">
                    {club.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Saknas din klubb?
            </h3>
            <p className="text-sm text-emerald-200 mb-4">
              Registrera er gratis och börja hantera era Pétanque-kvällar direkt!
            </p>
            <Link
              href="/registrera"
              className="inline-block rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-500 transition"
            >
              Registrera din klubb
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
