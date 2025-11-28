"use client";

import { useState, useEffect } from "react";

interface Stats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPoints: number;
  pointsAgainst: number;
}

const STORAGE_KEY = "selectedPlayerId";

export function PlayerStats() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedPlayerId(stored);
      loadStats(stored);
    }
  }, []);

  async function loadStats(playerId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      console.error("Kunde inte hämta statistik");
    } finally {
      setLoading(false);
    }
  }

  if (!selectedPlayerId) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">📊 Mina resultat</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Välj ditt namn ovan för att se din statistik.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">📊 Mina resultat</h2>
        <p className="text-sm text-zinc-500">Laddar...</p>
      </section>
    );
  }

  if (!stats || stats.totalMatches === 0) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">📊 Mina resultat</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Du har inte spelat några matcher ännu.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium">📊 Mina resultat</h2>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-zinc-900">
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.totalMatches}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Matcher</p>
        </div>
        
        <div className="rounded-lg bg-green-100 p-3 text-center dark:bg-green-900">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {stats.wins}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">Vinster</p>
        </div>
        
        <div className="rounded-lg bg-red-100 p-3 text-center dark:bg-red-900">
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {stats.losses}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">Förluster</p>
        </div>
        
        <div className="rounded-lg bg-blue-100 p-3 text-center dark:bg-blue-900">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.winRate}%
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Vinstprocent</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Poäng för: <strong className="text-green-600">{stats.totalPoints}</strong>
        </span>
        <span className="text-zinc-600 dark:text-zinc-400">
          Poäng mot: <strong className="text-red-600">{stats.pointsAgainst}</strong>
        </span>
        <span className="text-zinc-600 dark:text-zinc-400">
          Diff: <strong className={stats.totalPoints - stats.pointsAgainst >= 0 ? "text-green-600" : "text-red-600"}>
            {stats.totalPoints - stats.pointsAgainst > 0 ? "+" : ""}{stats.totalPoints - stats.pointsAgainst}
          </strong>
        </span>
      </div>
    </section>
  );
}
