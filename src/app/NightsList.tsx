"use client";

import { useState, useEffect } from "react";

interface Player {
  id: string;
  name: string;
}

interface Attendance {
  id: string;
  player: Player;
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
}

interface NightsListProps {
  nights: Night[];
}

const STORAGE_KEY = "selectedPlayerId";

export function NightsList({ nights }: NightsListProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedPlayerId(stored);
    }
  }, []);

  async function handleSignup(nightId: string) {
    if (!selectedPlayerId) {
      alert("Välj ditt namn först!");
      return;
    }

    setLoading(nightId);
    try {
      const res = await fetch(`/api/boule-nights/${nightId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayerId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Kunde inte anmäla");
        return;
      }

      window.location.reload();
    } catch {
      alert("Ett fel inträffade");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel(nightId: string) {
    if (!selectedPlayerId) return;

    setLoading(nightId);
    try {
      const res = await fetch(`/api/boule-nights/${nightId}/signup`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayerId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Kunde inte avanmäla");
        return;
      }

      window.location.reload();
    } catch {
      alert("Ett fel inträffade");
    } finally {
      setLoading(null);
    }
  }

  if (nights.length === 0) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">📅 Kommande kvällar</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Inga kommande kvällar just nu.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium">📅 Kommande kvällar</h2>
      
      <div className="space-y-3">
        {nights.map((night) => {
          const isSignedUp = night.attendance.some(
            (a) => a.player.id === selectedPlayerId
          );
          const spotsLeft =
            night.maxPlayers !== null
              ? night.maxPlayers - night.attendance.length
              : null;
          const isFull = spotsLeft !== null && spotsLeft <= 0;

          return (
            <article
              key={night.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-medium">{night.name}</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {new Date(night.date).toLocaleString("sv-SE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {night.location && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      📍 {night.location}
                    </p>
                  )}
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {night.attendance.length} anmälda
                    {night.maxPlayers && ` / ${night.maxPlayers} platser`}
                    {spotsLeft !== null && spotsLeft > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {" "}({spotsLeft} kvar)
                      </span>
                    )}
                    {isFull && (
                      <span className="text-red-600 dark:text-red-400"> (Fullt)</span>
                    )}
                  </p>
                  {night.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      {night.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {selectedPlayerId ? (
                    isSignedUp ? (
                      <button
                        onClick={() => handleCancel(night.id)}
                        disabled={loading === night.id}
                        className="rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      >
                        {loading === night.id ? "..." : "Avanmäl"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSignup(night.id)}
                        disabled={loading === night.id || isFull}
                        className="rounded bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-200 disabled:opacity-50 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                      >
                        {loading === night.id ? "..." : isFull ? "Fullt" : "Anmäl mig"}
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-zinc-400">Välj namn först</span>
                  )}
                </div>
              </div>

              {/* Visa anmälda spelare */}
              {night.attendance.length > 0 && (
                <div className="mt-3 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Anmälda:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {night.attendance.map((a) => (
                      <span
                        key={a.id}
                        className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                          a.player.id === selectedPlayerId
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {a.player.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
