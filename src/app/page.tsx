import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Player {
  id: string;
  name: string;
}

interface Attendance {
  id: string;
  player: Player;
}

interface Match {
  id: string;
}

interface Round {
  id: string;
  matches: Match[];
}

interface Night {
  id: string;
  name: string;
  date: string;
  type: "DAY" | "EVENING";
  location: string | null;
  description: string | null;
  maxPlayers: number | null;
  attendance: Attendance[];
  rounds: Round[];
  isToday: boolean;
  hasStarted: boolean;
  totalMatches: number;
}

export default async function Home() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Hämta alla kommande tävlingar
  const rawNights = await prisma.bouleNight.findMany({
    where: {
      date: { gte: today },
    },
    orderBy: { date: "asc" },
    include: {
      attendance: {
        where: { present: true },
        include: { player: true },
      },
      rounds: {
        include: {
          matches: true,
        },
      },
    },
  });

  type RawNight = typeof rawNights[number];
  type RawAttendance = RawNight["attendance"][number];
  type RawRound = RawNight["rounds"][number];
  type RawMatch = RawRound["matches"][number];

  // Serialize dates
  const nights: Night[] = rawNights.map((night: RawNight) => ({
    id: night.id,
    name: night.name,
    date: night.date.toISOString(),
    type: night.type,
    location: night.location,
    description: night.description,
    maxPlayers: night.maxPlayers,
    attendance: night.attendance.map((a: RawAttendance) => ({
      id: a.id,
      player: { id: a.player.id, name: a.player.name },
    })),
    rounds: night.rounds.map((r: RawRound) => ({
      id: r.id,
      matches: r.matches.map((m: RawMatch) => ({ id: m.id })),
    })),
    isToday: night.date >= today && night.date < tomorrow,
    hasStarted: night.rounds.length > 0,
    totalMatches: night.rounds.reduce((sum: number, r: RawRound) => sum + r.matches.length, 0),
  }));

  // Dagens tävling (om det finns)
  const todaysEvent = nights.find((n: Night) => n.isToday);
  
  // Kommande tävlingar (exklusive dagens)
  const upcomingEvents = nights.filter((n: Night) => !n.isToday);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-zinc-900">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/boule-pattern.svg')] opacity-5"></div>
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-center">
            <div className="mb-4 text-6xl">🎱</div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              SocialBoule
            </h1>
            <p className="mt-3 text-lg text-emerald-200">
              Pétanque Crash – Tävla, ha kul, träffa vänner
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        {/* Dagens tävling - Stor prominent sektion */}
        {todaysEvent ? (
          <section className="mb-8 -mt-6">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-1 shadow-2xl">
              <div className="rounded-xl bg-zinc-900/95 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wider text-green-400">
                    Pågår idag
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  {todaysEvent.name}
                </h2>
                
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-lg">🕐</span>
                    <span>
                      {new Date(todaysEvent.date).toLocaleTimeString("sv-SE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {todaysEvent.location && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="text-lg">📍</span>
                      <span>{todaysEvent.location}</span>
                    </div>
                  )}
                </div>

                {/* Anmälda spelare - stor display */}
                <div className="mt-6 rounded-xl bg-zinc-800/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-zinc-400">Anmälda spelare</span>
                    <span className="text-2xl font-bold text-white">
                      {todaysEvent.attendance.length}
                      {todaysEvent.maxPlayers && (
                        <span className="text-zinc-500 text-lg">/{todaysEvent.maxPlayers}</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  {todaysEvent.maxPlayers && (
                    <div className="h-2 rounded-full bg-zinc-700 overflow-hidden mb-4">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                        style={{ 
                          width: `${Math.min(100, (todaysEvent.attendance.length / todaysEvent.maxPlayers) * 100)}%` 
                        }}
                      />
                    </div>
                  )}

                  {/* Lista på anmälda */}
                  {todaysEvent.attendance.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {todaysEvent.attendance.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center rounded-full bg-emerald-900/50 px-3 py-1 text-sm text-emerald-200"
                        >
                          {a.player.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status och CTA */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/nights/${todaysEvent.id}`}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-4 text-center font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-green-600 hover:shadow-xl"
                  >
                    {todaysEvent.hasStarted ? (
                      <>📊 Se tabell & resultat</>
                    ) : (
                      <>✅ Anmäl dig / Se detaljer</>
                    )}
                  </Link>
                </div>

                {todaysEvent.hasStarted && (
                  <p className="mt-3 text-center text-sm text-amber-400">
                    🎲 {todaysEvent.rounds.length} runda(r) lottade · {todaysEvent.totalMatches} matcher
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          /* Ingen tävling idag */
          <section className="mb-8 -mt-6">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 text-center">
              <div className="text-4xl mb-3">😴</div>
              <h2 className="text-xl font-semibold text-white">Ingen tävling idag</h2>
              <p className="mt-2 text-zinc-400">
                Kolla kommande tävlingar nedan och anmäl dig!
              </p>
            </div>
          </section>
        )}

        {/* Kommande tävlingar */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white flex items-center gap-2">
            <span>📅</span> Kommande tävlingar
          </h2>
          
          {upcomingEvents.length === 0 ? (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-6 text-center">
              <p className="text-zinc-400">Inga fler tävlingar inplanerade just nu.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingEvents.map((night) => {
                const spotsLeft = night.maxPlayers 
                  ? night.maxPlayers - night.attendance.length 
                  : null;
                const isFull = spotsLeft !== null && spotsLeft <= 0;

                return (
                  <Link
                    key={night.id}
                    href={`/nights/${night.id}`}
                    className="group rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition hover:border-emerald-600 hover:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition">
                          {night.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {new Date(night.date).toLocaleDateString("sv-SE", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                        <p className="text-sm text-zinc-500">
                          kl {new Date(night.date).toLocaleTimeString("sv-SE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {night.location && ` · ${night.location}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {night.attendance.length}
                        </div>
                        <div className="text-xs text-zinc-500">anmälda</div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="mt-3 flex items-center justify-between">
                      {isFull ? (
                        <span className="inline-flex items-center rounded-full bg-red-900/50 px-2 py-1 text-xs font-medium text-red-300">
                          Fullt
                        </span>
                      ) : spotsLeft !== null ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-300">
                          {spotsLeft} platser kvar
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300">
                          Öppen anmälan
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 group-hover:text-emerald-400 transition">
                        Visa detaljer →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="/spelare"
            className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 text-center transition hover:border-emerald-600 hover:bg-zinc-800"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-white">Alla spelare</div>
            <div className="text-xs text-zinc-500">Se statistik</div>
          </Link>
          <Link
            href="/lag"
            className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 text-center transition hover:border-emerald-600 hover:bg-zinc-800"
          >
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-medium text-white">Topplista</div>
            <div className="text-xs text-zinc-500">Ranking & poäng</div>
          </Link>
          <Link
            href="/klubb"
            className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 text-center transition hover:border-emerald-600 hover:bg-zinc-800"
          >
            <div className="text-2xl mb-2">🎱</div>
            <div className="font-medium text-white">Om klubben</div>
            <div className="text-xs text-zinc-500">Info & kontakt</div>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50 py-8">
        <div className="mx-auto max-w-4xl px-4">
          {/* CTA för klubbar */}
          <div className="mb-6 rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              🏆 Har du en boule-klubb?
            </h3>
            <p className="text-sm text-emerald-200 mb-4">
              Få ett komplett system för att hantera era Pétanque-kvällar. Gratis att komma igång!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/registrera"
                className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-500 transition"
              >
                Registrera din klubb
              </Link>
              <Link
                href="/logga-in"
                className="rounded-lg border border-emerald-600 px-6 py-2 font-medium text-emerald-300 hover:bg-emerald-900/50 transition"
              >
                Logga in som admin
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-zinc-500">
            SocialBoule – Pétanque för alla
          </p>
        </div>
      </footer>
    </div>
  );
}
