"use client";

import { useState } from "react";

interface Player {
  id: string;
  name: string;
}

interface ClubPlayersSectionProps {
  clubId: string;
  existingPlayers: Player[];
}

export function ClubPlayersSection({ clubId, existingPlayers }: ClubPlayersSectionProps) {
  const [players, setPlayers] = useState<Player[]>(existingPlayers);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/club-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clubId }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("Failed to create player", res.status, body);
        alert("Kunde inte skapa spelare. Försök igen.");
        return;
      }
      const created = (await res.json()) as Player;
      setPlayers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (e) {
      console.error("Failed to create player", e);
      alert("Tekniskt fel vid skapande av spelare.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(playerId: string, playerName: string) {
    if (!confirm(`Är du säker på att du vill ta bort ${playerName}?`)) return;

    setDeletingId(playerId);
    try {
      const res = await fetch(`/api/club-players/${playerId}?clubId=${clubId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Kunde inte ta bort spelaren.");
        return;
      }
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    } catch (e) {
      console.error("Failed to delete player", e);
      alert("Tekniskt fel vid borttagning av spelare.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Spelare</h2>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Lägg till spelare som kan vara med på dina Pétanque Crash-event.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spelarens namn"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Sparar..." : "Lägg till"}
        </button>
      </form>

      <div className="max-h-64 space-y-1 overflow-auto text-sm">
        {players.length === 0 ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Inga spelare tillagda ännu.
          </p>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span>{player.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(player.id, player.name)}
                disabled={deletingId === player.id}
                className="ml-2 rounded px-2 py-0.5 text-xs text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                {deletingId === player.id ? "Tar bort..." : "Ta bort"}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
