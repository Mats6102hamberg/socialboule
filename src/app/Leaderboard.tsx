"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  wins: number;
  matches: number;
  winRate: number;
  pointsDiff: number;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch {
      console.error("Kunde inte hämta topplistan");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">🏆 Topplista</h2>
        <p className="text-sm text-zinc-500">Laddar...</p>
      </section>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">🏆 Topplista</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Inga resultat ännu.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium">🏆 Topplista</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">#</th>
              <th className="py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">Spelare</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400">V</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400">M</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400">%</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400">+/-</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr
                key={entry.playerId}
                className="border-b border-zinc-100 dark:border-zinc-800"
              >
                <td className="py-2">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </td>
                <td className="py-2 font-medium">{entry.playerName}</td>
                <td className="py-2 text-center text-green-600 dark:text-green-400">
                  {entry.wins}
                </td>
                <td className="py-2 text-center text-zinc-600 dark:text-zinc-400">
                  {entry.matches}
                </td>
                <td className="py-2 text-center">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                      entry.winRate >= 60
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : entry.winRate >= 40
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {entry.winRate}%
                  </span>
                </td>
                <td
                  className={`py-2 text-center font-medium ${
                    entry.pointsDiff > 0
                      ? "text-green-600 dark:text-green-400"
                      : entry.pointsDiff < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500"
                  }`}
                >
                  {entry.pointsDiff > 0 ? "+" : ""}{entry.pointsDiff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        V = Vinster, M = Matcher, % = Vinstprocent, +/- = Poängskillnad
      </p>
    </section>
  );
}
