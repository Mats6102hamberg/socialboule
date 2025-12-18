"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  totalViews: number;
  todayViews: number;
  weekViews: number;
  monthViews: number;
  uniqueVisitorsWeek: number;
  popularPages: { path: string; views: number }[];
  dailyViews: { date: string; count: number }[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) {
          throw new Error("Kunde inte hämta statistik");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ett fel uppstod");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">📊 Besöksstatistik</h2>
        <p className="text-sm text-zinc-500">Laddar...</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">📊 Besöksstatistik</h2>
        <p className="text-sm text-red-500">{error || "Kunde inte ladda statistik"}</p>
      </section>
    );
  }

  const maxDailyCount = Math.max(...data.dailyViews.map((d) => d.count), 1);

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium">📊 Besöksstatistik</h2>

      {/* Sammanfattning */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Idag" value={data.todayViews} icon="📅" />
        <StatCard label="7 dagar" value={data.weekViews} icon="📆" />
        <StatCard label="30 dagar" value={data.monthViews} icon="🗓️" />
        <StatCard label="Totalt" value={data.totalViews} icon="📈" />
      </div>

      {/* Unika besökare */}
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            👥 Unika besökare (7 dagar)
          </span>
          <span className="text-lg font-semibold">{data.uniqueVisitorsWeek}</span>
        </div>
      </div>

      {/* Graf - Besök per dag */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Besök senaste 7 dagarna
        </h3>
        <div className="flex items-end gap-1 h-24">
          {data.dailyViews.map((day) => {
            const height = maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0;
            const dayName = new Date(day.date).toLocaleDateString("sv-SE", {
              weekday: "short",
            });

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${day.date}: ${day.count} besök`}
                />
                <span className="text-[10px] text-zinc-500">{dayName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Populäraste sidorna */}
      {data.popularPages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Populäraste sidorna
          </h3>
          <div className="space-y-1">
            {data.popularPages.slice(0, 5).map((page, index) => (
              <div
                key={page.path}
                className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <span className="text-zinc-400">{index + 1}.</span>
                  <span className="font-mono">{page.path}</span>
                </span>
                <span className="font-medium">{page.views}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-lg">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
