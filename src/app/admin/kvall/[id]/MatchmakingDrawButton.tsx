"use client";

import { useState } from "react";

interface MatchmakingDrawButtonProps {
  nightId: string;
  roundNumber: number;
}

export function MatchmakingDrawButton({ nightId, roundNumber }: MatchmakingDrawButtonProps) {
  const [mode, setMode] = useState<"balanced" | "diverse" | "random">("balanced");
  const [loading, setLoading] = useState(false);

  const drawAction =
    roundNumber === 1
      ? `/api/boule-nights/${nightId}/draw-round-1`
      : roundNumber === 2
      ? `/api/boule-nights/${nightId}/draw-round-2`
      : `/api/boule-nights/${nightId}/draw-round-3`;

  async function handleDraw() {
    setLoading(true);
    try {
      const res = await fetch(drawAction, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Kunde inte lotta omgången");
      }
    } catch (error) {
      console.error("Draw error:", error);
      alert("Ett fel uppstod vid lottning");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as typeof mode)}
        disabled={loading}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="balanced">🎯 Smart Balanserad</option>
        <option value="diverse">🔀 Maximal Variation</option>
        <option value="random">🎲 Slumpmässig</option>
      </select>
      <button
        onClick={handleDraw}
        disabled={loading}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? (
          <>
            <svg
              className="h-3 w-3 animate-spin"
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
            Lottar...
          </>
        ) : (
          <>
            {mode === "balanced" && "🎯"}
            {mode === "diverse" && "🔀"}
            {mode === "random" && "🎲"}
            {` Lotta omgång ${roundNumber}`}
          </>
        )}
      </button>
    </div>
  );
}
