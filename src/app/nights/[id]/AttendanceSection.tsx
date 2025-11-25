"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Player {
  id: string;
  name: string;
}

interface NightAttendanceItem {
  id: string;
  player: Player;
  playerId: string;
  present: boolean;
}

export function AttendanceSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
  const pathname = usePathname();

  // Extract night id from URL: /nights/[id]
  const segments = pathname.split("/").filter(Boolean);
  const nightId = segments[segments.length - 1];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [playersRes, attendanceRes, nightRes] = await Promise.all([
          fetch("/api/players"),
          fetch(`/api/boule-nights/${nightId}/attendance`),
          fetch(`/api/boule-nights/${nightId}`),
        ]);

        if (!playersRes.ok) return;
        const playersData = (await playersRes.json()) as Player[];

        let attendanceMap: Record<string, boolean> = {};
        if (attendanceRes.ok) {
          const attData = (await attendanceRes.json()) as NightAttendanceItem[];
          for (const item of attData) {
            attendanceMap[item.playerId] = item.present;
          }
        }

        let max: number | null = null;
        if (nightRes.ok) {
          const night = await nightRes.json();
          if (typeof night.maxPlayers === "number" && Number.isFinite(night.maxPlayers)) {
            max = night.maxPlayers;
          }
        }

        if (!cancelled) {
          setPlayers(playersData);
          setAttendance(attendanceMap);
          setMaxPlayers(max);
        }
      } catch (e) {
        console.error("Failed to load attendance data", e);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [nightId]);

  function togglePlayer(id: string) {
    setAttendance((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSave() {
    if (loading) return;
    const selectedCount = Object.values(attendance).filter(Boolean).length;
    if (maxPlayers !== null && selectedCount > maxPlayers) {
      alert(
        `För många spelare markerade som närvarande (${selectedCount}). Max är ${maxPlayers}. Justera urvalet innan du sparar.`
      );
      return;
    }
    setLoading(true);
    try {
      const playerIds = Object.entries(attendance)
        .filter(([_, present]) => present)
        .map(([id]) => id);

      const res = await fetch(`/api/boule-nights/${nightId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Failed to save attendance", res.status, body);
        alert("Kunde inte spara närvaro. Försök igen.");
        return;
      }

      alert("Närvaro sparad.");
    } catch (e) {
      console.error("Failed to save attendance", e);
      alert("Tekniskt fel när närvaron skulle sparas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium">Närvaro</h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Sparar..." : "Spara närvaro"}
        </button>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Markera vilka spelare som är på plats den här kvällen. Dessa används när appen lottar omgång 1.
      </p>
      <div className="max-h-72 space-y-1 overflow-auto">
        {players.length === 0 ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Inga spelare tillagda ännu. Lägg till spelare på startsidan.
          </p>
        ) : (
          players.map((player) => {
            const present = attendance[player.id] ?? false;
            return (
              <label
                key={player.id}
                className="flex cursor-pointer items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span>{player.name}</span>
                <input
                  type="checkbox"
                  checked={present}
                  onChange={() => togglePlayer(player.id)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700"
                />
              </label>
            );
          })
        )}
      </div>
    </section>
  );
}
