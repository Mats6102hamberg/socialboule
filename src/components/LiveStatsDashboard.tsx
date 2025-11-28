"use client";

import { useState, useEffect } from "react";

interface PlayerStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
  trend: "up" | "down" | "stable";
}

interface LeaderboardData {
  topPlayers: PlayerStats[];
  totalMatches: number;
  totalPlayers: number;
  avgMatchesPerPlayer: number;
}

export function LiveStatsDashboard() {
  const [stats, setStats] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedValues, setAnimatedValues] = useState({
    totalMatches: 0,
    totalPlayers: 0,
    avgMatches: 0,
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();

        // Calculate total stats
        const totalMatches = data.reduce(
          (sum: number, p: any) => sum + (p.wins + p.losses),
          0
        );
        const totalPlayers = data.length;
        const avgMatches = totalPlayers > 0 ? totalMatches / totalPlayers : 0;

        const topPlayers: PlayerStats[] = data.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.name,
          wins: p.wins,
          losses: p.losses,
          winRate: p.winRate || 0,
          totalMatches: p.wins + p.losses,
          trend: p.winRate > 50 ? "up" : p.winRate < 50 ? "down" : "stable",
        }));

        setStats({
          topPlayers,
          totalMatches: Math.floor(totalMatches / 2), // Each match counts for 2 players
          totalPlayers,
          avgMatchesPerPlayer: avgMatches,
        });

        // Animate numbers
        animateValue("totalMatches", animatedValues.totalMatches, Math.floor(totalMatches / 2));
        animateValue("totalPlayers", animatedValues.totalPlayers, totalPlayers);
        animateValue("avgMatches", animatedValues.avgMatches, avgMatches);

        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setLoading(false);
    }
  }

  function animateValue(key: keyof typeof animatedValues, start: number, end: number) {
    const duration = 1000; // 1 second
    const steps = 30;
    const stepValue = (end - start) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newValue = start + stepValue * currentStep;

      setAnimatedValues((prev) => ({
        ...prev,
        [key]: currentStep >= steps ? end : newValue,
      }));

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-center">
          <svg
            className="h-8 w-8 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </div>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Live Statistik
        </span>
      </div>

      {/* Stats overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Matches */}
        <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:from-blue-950 dark:to-blue-900">
          <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-blue-500/10" />
          <div className="relative">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Totalt Matcher
            </p>
            <p className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-100">
              {Math.floor(animatedValues.totalMatches)}
            </p>
            <div className="mt-1 flex items-center gap-1">
              <svg
                className="h-3 w-3 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
                />
              </svg>
              <span className="text-xs text-green-600">Aktiv klubb!</span>
            </div>
          </div>
        </div>

        {/* Total Players */}
        <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:from-purple-950 dark:to-purple-900">
          <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-purple-500/10" />
          <div className="relative">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
              Antal Spelare
            </p>
            <p className="mt-1 text-3xl font-bold text-purple-900 dark:text-purple-100">
              {Math.floor(animatedValues.totalPlayers)}
            </p>
            <div className="mt-1 flex items-center gap-1">
              <svg
                className="h-3 w-3 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
              <span className="text-xs text-purple-600">Medlemmar</span>
            </div>
          </div>
        </div>

        {/* Avg Matches */}
        <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-green-50 to-green-100 p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:from-green-950 dark:to-green-900">
          <div className="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-green-500/10" />
          <div className="relative">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">
              Snitt per Spelare
            </p>
            <p className="mt-1 text-3xl font-bold text-green-900 dark:text-green-100">
              {animatedValues.avgMatches.toFixed(1)}
            </p>
            <div className="mt-1 flex items-center gap-1">
              <svg
                className="h-3 w-3 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
              <span className="text-xs text-green-600">Matcher</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Players Leaderboard */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          🏆 Top 5 Spelare
        </h3>
        <div className="space-y-2">
          {stats.topPlayers.map((player, index) => (
            <div
              key={player.id}
              className="group flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition hover:border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-950"
                      : index === 1
                      ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800"
                      : index === 2
                      ? "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950"
                      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Player info */}
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {player.name}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {player.wins}W - {player.losses}L
                  </p>
                </div>
              </div>

              {/* Win rate */}
              <div className="flex items-center gap-2">
                {/* Trend indicator */}
                {player.trend === "up" && (
                  <svg
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 15.75 7.5-7.5 7.5 7.5"
                    />
                  </svg>
                )}
                {player.trend === "down" && (
                  <svg
                    className="h-4 w-4 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                )}

                <div className="text-right">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {player.winRate}%
                  </p>
                  <p className="text-xs text-zinc-500">win rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
