"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface MatchTeamPlayer {
  id: string;
  player: { id: string; name: string };
}

interface MatchTeam {
  id: string;
  side: "HOME" | "AWAY";
  players: MatchTeamPlayer[];
}

interface MatchItem {
  id: string;
  lane: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  teams: MatchTeam[];
}

export function Round1ResultsSection() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const nightId = segments[segments.length - 1];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/boule-nights/${nightId}/round-1-matches`);
        if (!res.ok) return;
        const data = (await res.json()) as MatchItem[];
        if (!cancelled) {
          setMatches(data);
        }
      } catch (e) {
        console.error("Failed to load round 1 matches", e);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [nightId]);

  function updateScore(id: string, field: "homeScore" | "awayScore", value: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: value === "" ? null : Number.parseInt(value, 10),
            }
          : m,
      ),
    );
  }

  async function saveResult(match: MatchItem) {
    if (savingId) return;
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;

    setSavingId(match.id);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to save match result", res.status, text);
        alert("Kunde inte spara resultatet. Försök igen.");
        return;
      }

      const updated = (await res.json()) as MatchItem;
      setMatches((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    } catch (e) {
      console.error("Failed to save match result", e);
      alert("Tekniskt fel vid sparande av resultat.");
    } finally {
      setSavingId(null);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="space-y-1">
        <h2 className="text-base font-medium">Resultat – omgång 1</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Fyll i resultat för varje match. Poängen används senare för lottning av omgång 2.
        </p>
      </header>
      <div className="space-y-2">
        {matches.map((match) => {
          const home = match.teams.find((t) => t.side === "HOME");
          const away = match.teams.find((t) => t.side === "AWAY");
          const homePlayers = home?.players.map((mp) => mp.player.name).join(", ") ?? "";
          const awayPlayers = away?.players.map((mp) => mp.player.name).join(", ") ?? "";

          return (
            <div
              key={match.id}
              className="space-y-1 rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                    {match.lane ?? "-"}
                  </span>
                  <span className="font-medium">Bana {match.lane ?? "?"}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {match.status === "COMPLETED" ? "KLAR" : "PLANERAD"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="flex-1">
                    <span className="font-semibold">Lag A:</span> {homePlayers}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={match.homeScore ?? ""}
                    onChange={(e) => updateScore(match.id, "homeScore", e.target.value)}
                    className="w-16 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs outline-none ring-0 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-950"
                    aria-label="Poäng för Lag A"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1">
                    <span className="font-semibold">Lag B:</span> {awayPlayers}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={match.awayScore ?? ""}
                    onChange={(e) => updateScore(match.id, "awayScore", e.target.value)}
                    className="w-16 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs outline-none ring-0 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-950"
                    aria-label="Poäng för Lag B"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => saveResult(match)}
                  disabled={savingId === match.id}
                  className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {savingId === match.id ? "Sparar..." : "Spara resultat"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
