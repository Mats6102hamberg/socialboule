"use client";

import { useState, useEffect } from "react";

interface ChemistryPartner {
  playerId: string;
  playerName: string;
  matchesTogether: number;
  winsTogether: number;
  winRate: number;
}

const STORAGE_KEY = "selectedPlayerId";

export function ChemistrySection() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [partners, setPartners] = useState<ChemistryPartner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedPlayerId(stored);
      loadChemistry(stored);
    }
  }, []);

  async function loadChemistry(playerId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/chemistry`);
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch {
      console.error("Kunde inte hämta spelkemi");
    } finally {
      setLoading(false);
    }
  }

  if (!selectedPlayerId) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">💚 Bästa spelkemi</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Välj ditt namn ovan för att se din spelkemi.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">💚 Bästa spelkemi</h2>
        <p className="text-sm text-zinc-500">Laddar...</p>
      </section>
    );
  }

  if (partners.length === 0) {
    return (
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">💚 Bästa spelkemi</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Du har inte spelat tillräckligt många matcher ännu för att se spelkemi.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-medium">💚 Bästa spelkemi</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Spelare du vinner mest med:
      </p>
      
      <div className="space-y-2">
        {partners.slice(0, 5).map((partner, index) => (
          <div
            key={partner.playerId}
            className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {index === 0 ? "💚" : index === 1 ? "💚" : "🤝"}
              </span>
              <div>
                <p className="font-medium">{partner.playerName}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {partner.matchesTogether} matcher tillsammans
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {partner.winRate}%
              </p>
              <p className="text-xs text-zinc-500">
                {partner.winsTogether} vinster
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
