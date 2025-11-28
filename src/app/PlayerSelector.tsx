"use client";

import { useState, useEffect } from "react";

interface Player {
  id: string;
  name: string;
}

interface PlayerSelectorProps {
  players: Player[];
}

export function PlayerSelector({ players }: PlayerSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();

        if (data.session?.playerId) {
          setSelectedId(data.session.playerId);
          setIsLocked(true);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  async function handleSelect(playerId: string) {
    if (isLocked) return;

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        throw new Error("Failed to create session");
      }

      setSelectedId(playerId);
      setIsLocked(true);

      // Trigga event så andra komponenter kan reagera
      window.dispatchEvent(new CustomEvent("playerSelected", { detail: playerId }));
      window.location.reload();
    } catch (error) {
      console.error("Failed to select player:", error);
      alert("Kunde inte välja spelare. Försök igen.");
    }
  }

  async function handleReset() {
    try {
      const res = await fetch("/api/auth/session", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to destroy session");
      }

      setSelectedId(null);
      setIsLocked(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset player:", error);
      alert("Kunde inte byta spelare. Försök igen.");
    }
  }

  const selectedPlayer = players.find((p) => p.id === selectedId);

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium">👤 Vem är du?</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <span className="text-sm text-zinc-500">Laddar...</span>
        </div>
      ) : isLocked && selectedPlayer ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              ✓
            </span>
            <span className="font-medium">{selectedPlayer.name}</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Byt spelare
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Välj ditt namn för att anmäla dig och se dina resultat.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelect(player.id)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              >
                {player.name}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
