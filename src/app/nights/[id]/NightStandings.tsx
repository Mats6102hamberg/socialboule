"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

interface PlayerStanding {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  matches: number;
}

interface MatchTeamPlayer {
  playerId: string;
  player: {
    id: string;
    name: string;
  };
  pointsFor: number;
  pointsAgainst: number;
  won: boolean;
}

interface MatchTeam {
  side: "HOME" | "AWAY";
  players: MatchTeamPlayer[];
}

interface Match {
  id: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  teams: MatchTeam[];
}

interface NightStandingsProps {
  showAfterRound?: number; // Visa bara om minst X rundor är klara
}

export function NightStandings({ showAfterRound = 3 }: NightStandingsProps) {
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const pathname = usePathname();

  const nightId = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1];
  }, [pathname]);

  useEffect(() => {
    async function loadStandings() {
      if (!nightId) return;

      try {
        setLoading(true);

        // Hämta alla matcher för denna kväll
        const [r1Res, r2Res, r3Res] = await Promise.all([
          fetch(`/api/boule-nights/${nightId}/round-1-matches`),
          fetch(`/api/boule-nights/${nightId}/round-2-matches`),
          fetch(`/api/boule-nights/${nightId}/round-3-matches`),
        ]);

        const round1Matches: Match[] = r1Res.ok ? await r1Res.json() : [];
        const round2Matches: Match[] = r2Res.ok ? await r2Res.json() : [];
        const round3Matches: Match[] = r3Res.ok ? await r3Res.json() : [];

        // Räkna hur många rundor som är klara
        const r1Complete = round1Matches.length > 0 && round1Matches.every(m => m.status === "COMPLETED" || m.status === "WALKOVER");
        const r2Complete = round2Matches.length > 0 && round2Matches.every(m => m.status === "COMPLETED" || m.status === "WALKOVER");
        const r3Complete = round3Matches.length > 0 && round3Matches.every(m => m.status === "COMPLETED" || m.status === "WALKOVER");

        let completed = 0;
        if (r1Complete) completed++;
        if (r2Complete) completed++;
        if (r3Complete) completed++;
        setRoundsCompleted(completed);

        // Samla alla matcher
        const allMatches = [...round1Matches, ...round2Matches, ...round3Matches];

        // Beräkna ställning per spelare
        const statsMap = new Map<string, PlayerStanding>();

        for (const match of allMatches) {
          if (match.status !== "COMPLETED" && match.status !== "WALKOVER") continue;

          for (const team of match.teams) {
            const isHome = team.side === "HOME";
            const myScore = isHome ? match.homeScore : match.awayScore;
            const theirScore = isHome ? match.awayScore : match.homeScore;

            for (const mp of team.players) {
              const existing = statsMap.get(mp.playerId) ?? {
                playerId: mp.playerId,
                playerName: mp.player.name,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                pointsDiff: 0,
                matches: 0,
              };

              if (myScore !== null && theirScore !== null) {
                existing.pointsFor += myScore;
                existing.pointsAgainst += theirScore;
                existing.matches++;

                if (myScore > theirScore) {
                  existing.wins++;
                } else {
                  existing.losses++;
                }
              }

              existing.pointsDiff = existing.pointsFor - existing.pointsAgainst;
              statsMap.set(mp.playerId, existing);
            }
          }
        }

        // Sortera efter vinster, sedan poängskillnad
        const sorted = Array.from(statsMap.values()).sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
          return b.pointsFor - a.pointsFor;
        });

        setStandings(sorted);
      } catch (error) {
        console.error("Failed to load standings", error);
      } finally {
        setLoading(false);
      }
    }

    loadStandings();
  }, [nightId]);

  // Visa inte om inte tillräckligt många rundor är klara
  if (loading) {
    return null;
  }

  if (standings.length === 0) {
    return null;
  }

  // Visa alltid ställningen men markera om alla rundor är klara
  const allRoundsComplete = roundsCompleted >= 3;

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2">
            {allRoundsComplete ? "🏆" : "📊"} Kvällens ställning
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {allRoundsComplete 
              ? "Alla 3 rundor avslutade – slutresultat!" 
              : `${roundsCompleted} av 3 rundor klara`}
          </p>
        </div>
        {allRoundsComplete && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
            Slutresultat
          </span>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="py-2 text-left font-medium text-zinc-600 dark:text-zinc-400 w-8">#</th>
              <th className="py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">Spelare</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400 w-12">V</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400 w-12">F</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400 w-16">+/-</th>
              <th className="py-2 text-center font-medium text-zinc-600 dark:text-zinc-400 w-20">Poäng</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((player, index) => {
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
              const isTopThree = index < 3;

              return (
                <tr
                  key={player.playerId}
                  className={`border-b border-zinc-100 dark:border-zinc-800 ${
                    isTopThree && allRoundsComplete ? "bg-amber-50 dark:bg-amber-950/20" : ""
                  }`}
                >
                  <td className="py-2 text-center">
                    {medal || index + 1}
                  </td>
                  <td className="py-2 font-medium">
                    {player.playerName}
                    {index === 0 && allRoundsComplete && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Vinnare!</span>
                    )}
                  </td>
                  <td className="py-2 text-center text-green-600 dark:text-green-400 font-semibold">
                    {player.wins}
                  </td>
                  <td className="py-2 text-center text-red-600 dark:text-red-400">
                    {player.losses}
                  </td>
                  <td
                    className={`py-2 text-center font-medium ${
                      player.pointsDiff > 0
                        ? "text-green-600 dark:text-green-400"
                        : player.pointsDiff < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {player.pointsDiff > 0 ? "+" : ""}{player.pointsDiff}
                  </td>
                  <td className="py-2 text-center text-zinc-600 dark:text-zinc-400">
                    {player.pointsFor}-{player.pointsAgainst}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        V = Vinster, F = Förluster, +/- = Poängskillnad
      </p>
    </section>
  );
}
