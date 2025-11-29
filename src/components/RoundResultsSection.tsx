"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type TeamSide = "HOME" | "AWAY";

type ConfirmationStatus = "PENDING" | "CONFIRMED" | "DISPUTED";

type Player = {
  id: string;
  name: string;
};

type MatchResultConfirmation = {
  id: string;
  player: Player;
  playerId: string;
  status: ConfirmationStatus;
  reportedHomeScore: number;
  reportedAwayScore: number;
  reportedWalkoverSide: TeamSide | null;
};

type MatchTeamPlayer = {
  id: string;
  player: Player;
};

type MatchTeam = {
  id: string;
  side: TeamSide;
  players: MatchTeamPlayer[];
};

type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "WALKOVER";

type MatchItem = {
  id: string;
  lane: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  walkoverWinner: TeamSide | null;
  teams: MatchTeam[];
  resultConfirmations: MatchResultConfirmation[];
};

type FormState = {
  playerId: string;
  homeScore: string;
  awayScore: string;
  walkoverSide: "" | TeamSide;
  submitting: boolean;
};

const confirmationCopy: Record<ConfirmationStatus, { label: string; color: string }> = {
  PENDING: { label: "Inväntar", color: "text-amber-600" },
  CONFIRMED: { label: "Bekräftad", color: "text-emerald-600" },
  DISPUTED: { label: "Tvist", color: "text-red-600" },
};

const walkoverOptions: { value: "" | TeamSide; label: string }[] = [
  { value: "", label: "Ingen walkover" },
  { value: "HOME", label: "Lag A vinner via WO" },
  { value: "AWAY", label: "Lag B vinner via WO" },
];

interface RoundResultsSectionProps {
  roundNumber: 1 | 2;
  title: string;
  description: string;
  adminMode?: boolean;
}

export function RoundResultsSection({ roundNumber, title, description, adminMode = false }: RoundResultsSectionProps) {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [formState, setFormState] = useState<Record<string, FormState>>({});
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const nightId = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1];
  }, [pathname]);

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        const res = await fetch(`/api/boule-nights/${nightId}/round-${roundNumber}-matches`);
        if (!res.ok) {
          console.error("Failed to load matches", res.status);
          return;
        }
        const data = (await res.json()) as MatchItem[];
        setMatches(data);
      } catch (error) {
        console.error("Failed to load matches", error);
      } finally {
        setLoading(false);
      }
    }

    if (nightId) {
      loadMatches();
    }
  }, [nightId, roundNumber]);

  useEffect(() => {
    setFormState((prev) => {
      const next = { ...prev };
      for (const match of matches) {
        const existing = next[match.id];
        next[match.id] = {
          playerId: existing?.playerId ?? "",
          homeScore: existing?.homeScore ?? (match.homeScore?.toString() ?? ""),
          awayScore: existing?.awayScore ?? (match.awayScore?.toString() ?? ""),
          walkoverSide: existing?.walkoverSide ?? (match.walkoverWinner ?? ""),
          submitting: false,
        };
      }
      return next;
    });
  }, [matches]);

  function updateForm(matchId: string, updates: Partial<FormState>) {
    setFormState((prev) => ({
      ...prev,
      [matchId]: {
        playerId: prev[matchId]?.playerId ?? "",
        homeScore: prev[matchId]?.homeScore ?? "",
        awayScore: prev[matchId]?.awayScore ?? "",
        walkoverSide: prev[matchId]?.walkoverSide ?? "",
        submitting: prev[matchId]?.submitting ?? false,
        ...updates,
      },
    }));
  }

  function formatMatchStatus(status: MatchStatus, walkoverWinner: TeamSide | null) {
    if (status === "WALKOVER" && walkoverWinner) {
      return `Walkover (${walkoverWinner === "HOME" ? "Lag A" : "Lag B"})`;
    }
    switch (status) {
      case "COMPLETED":
        return "Klar";
      case "IN_PROGRESS":
        return "Pågår";
      case "CANCELED":
        return "Inställd";
      default:
        return "Planerad";
    }
  }

  async function submitResult(match: MatchItem) {
    const form = formState[match.id];
    if (!form) return;

    // Only require playerId if not in admin mode
    if (!adminMode && !form.playerId) {
      alert("Välj vilken spelare som rapporterar resultatet.");
      return;
    }

    const payload: Record<string, unknown> = {};

    // Add adminOverride flag if in admin mode
    if (adminMode) {
      payload.adminOverride = true;
    } else {
      payload.playerId = form.playerId;
    }

    if (form.walkoverSide) {
      payload.walkoverSide = form.walkoverSide;
    }

    const parsedHome = form.homeScore === "" ? null : Number(form.homeScore);
    const parsedAway = form.awayScore === "" ? null : Number(form.awayScore);

    if (!form.walkoverSide) {
      if (
        parsedHome === null ||
        parsedAway === null ||
        Number.isNaN(parsedHome) ||
        Number.isNaN(parsedAway) ||
        parsedHome < 0 ||
        parsedAway < 0
      ) {
        alert("Ange giltiga poäng för båda lagen.");
        return;
      }
      payload.homeScore = parsedHome;
      payload.awayScore = parsedAway;
    } else {
      payload.homeScore = Number.isFinite(parsedHome)
        ? parsedHome
        : form.walkoverSide === "HOME"
        ? 13
        : 0;
      payload.awayScore = Number.isFinite(parsedAway)
        ? parsedAway
        : form.walkoverSide === "HOME"
        ? 0
        : 13;
    }

    updateForm(match.id, { submitting: true });
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to save match result", res.status, errorText);
        alert(
          res.status === 409
            ? "Resultaten matchar inte mellan spelarna. Kontakta arrangören."
            : "Kunde inte spara resultatet. Försök igen.",
        );
        return;
      }

      const updated = (await res.json()) as MatchItem;
      setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      updateForm(match.id, {
        submitting: false,
        playerId: "",
        walkoverSide: updated.walkoverWinner ?? "",
        homeScore: updated.homeScore?.toString() ?? "",
        awayScore: updated.awayScore?.toString() ?? "",
      });
    } catch (error) {
      console.error("Failed to submit result", error);
      alert("Tekniskt fel vid sparande av resultat.");
    } finally {
      updateForm(match.id, { submitting: false });
    }
  }

  function getPlayerConfirmation(match: MatchItem, playerId: string) {
    return match.resultConfirmations.find((c) => c.playerId === playerId);
  }

  if (loading && matches.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Laddar matcher...</p>
      </section>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="space-y-1">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      </header>

      <div className="space-y-3">
        {matches.map((match) => {
          const form = formState[match.id];
          const homeTeam = match.teams.find((t) => t.side === "HOME");
          const awayTeam = match.teams.find((t) => t.side === "AWAY");
          const homePlayers = homeTeam?.players ?? [];
          const awayPlayers = awayTeam?.players ?? [];
          const allPlayers = [...homePlayers, ...awayPlayers];

          return (
            <div
              key={match.id}
              className="space-y-2 rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50">
                    {match.lane ?? "-"}
                  </span>
                  <span className="font-medium">Bana {match.lane ?? "?"}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {formatMatchStatus(match.status, match.walkoverWinner)}
                </span>
              </div>

              <div className="grid gap-1">
                <TeamRow
                  label="Lag A"
                  players={homePlayers}
                  match={match}
                  side="HOME"
                />
                <TeamRow
                  label="Lag B"
                  players={awayPlayers}
                  match={match}
                  side="AWAY"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid gap-2 xs:grid-cols-2">
                  <ScoreInput
                    label="Poäng Lag A"
                    value={form?.homeScore ?? ""}
                    onChange={(value) => updateForm(match.id, { homeScore: value })}
                    disabled={form?.walkoverSide !== ""}
                  />
                  <ScoreInput
                    label="Poäng Lag B"
                    value={form?.awayScore ?? ""}
                    onChange={(value) => updateForm(match.id, { awayScore: value })}
                    disabled={form?.walkoverSide !== ""}
                  />
                </div>
                {!adminMode && (
                  <div>
                    <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Rapporteras av
                      <select
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                        value={form?.playerId ?? ""}
                        onChange={(e) => updateForm(match.id, { playerId: e.target.value })}
                      >
                        <option value="">Välj spelare</option>
                        {allPlayers.map((p) => (
                          <option key={p.player.id} value={p.player.id}>
                            {p.player.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Walkover
                  <select
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    value={form?.walkoverSide ?? ""}
                    onChange={(e) => {
                      const value = e.target.value as "" | TeamSide;
                      updateForm(match.id, {
                        walkoverSide: value,
                        homeScore:
                          value === "HOME"
                            ? "13"
                            : value === "AWAY"
                            ? "0"
                            : match.homeScore?.toString() ?? "",
                        awayScore:
                          value === "HOME"
                            ? "0"
                            : value === "AWAY"
                            ? "13"
                            : match.awayScore?.toString() ?? "",
                      });
                    }}
                  >
                    {walkoverOptions.map((option) => (
                      <option key={option.value || "none"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => submitResult(match)}
                  disabled={form?.submitting}
                  className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {form?.submitting ? "Sparar..." : "Rapportera resultat"}
                </button>
              </div>

              <div className="rounded border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Bekräftelser</p>
                <ul className="mt-1 space-y-1">
                  {allPlayers.map((player) => {
                    const confirmation = getPlayerConfirmation(match, player.player.id);
                    const status = confirmation?.status ?? "PENDING";
                    const copy = confirmationCopy[status];
                    return (
                      <li key={`${match.id}-${player.player.id}`} className="flex items-center justify-between text-[11px]">
                        <span>{player.player.name}</span>
                        <span className={`font-medium ${copy.color}`}>{copy.label}</span>
                      </li>
                    );
                  })}
                </ul>
                {match.resultConfirmations.some((c) => c.status === "DISPUTED") && (
                  <p className="mt-2 text-[11px] text-red-600">
                    Resultaten matchar inte. Kontakta arrangören för manuell hantering.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
      {label}
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        aria-label={label}
      />
    </label>
  );
}

function TeamRow({
  label,
  players,
  match,
  side,
}: {
  label: string;
  players: MatchTeamPlayer[];
  match: MatchItem;
  side: TeamSide;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span>
        <span className="font-semibold">{label}:</span> {players.map((p) => p.player.name).join(", ") || "—"}
      </span>
      {match.walkoverWinner === side && (
        <span className="text-[10px] font-medium text-emerald-600">Walkover seger</span>
      )}
    </div>
  );
}
