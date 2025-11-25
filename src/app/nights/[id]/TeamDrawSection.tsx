"use client";

import { useState, FormEvent } from "react";

interface Player {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  player: Player;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

interface TeamDrawSectionProps {
  nightId: string;
  teams: Team[];
  roundNumber: number;
  hasExistingRound: boolean;
}

export function TeamDrawSection({
  nightId,
  teams,
  roundNumber,
  hasExistingRound,
}: TeamDrawSectionProps) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTeam(teamId: string) {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter((id) => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  }

  async function handleDraw(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedTeams.length < 2) {
      setError("Välj minst 2 lag");
      return;
    }

    if (selectedTeams.length % 2 !== 0) {
      setError("Antal lag måste vara jämnt");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/boule-nights/${nightId}/draw-team-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds: selectedTeams }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Kunde inte lotta omgång");
        return;
      }

      // Reload sidan för att visa nya matcher
      window.location.reload();
    } catch {
      setError("Ett oväntat fel inträffade");
    } finally {
      setSubmitting(false);
    }
  }

  if (hasExistingRound) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header>
        <h2 className="text-base font-medium">Lotta omgång {roundNumber} (Lagtävling)</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Välj vilka lag som ska delta i denna omgång. Antal lag måste vara jämnt.
        </p>
      </header>

      <form onSubmit={handleDraw} className="space-y-4">
        {teams.length === 0 ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Inga lag skapade ännu.{" "}
            <a href="/lag" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
              Skapa lag först
            </a>
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Välj lag ({selectedTeams.length} valda)
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {teams.map((team) => (
                <label
                  key={team.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    selectedTeams.includes(team.id)
                      ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTeams.includes(team.id)}
                    onChange={() => toggleTeam(team.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{team.name}</span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {team.members.length === 0
                        ? "Inga spelare"
                        : team.members.map((m) => m.player.name).join(", ")}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || teams.length < 2}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? "Lottar..." : `Lotta omgång ${roundNumber}`}
        </button>
      </form>
    </section>
  );
}
