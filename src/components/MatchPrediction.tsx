"use client";

import { useState, useEffect } from "react";

interface MatchPredictionProps {
  matchId: string;
  homeTeam: string[];
  awayTeam: string[];
}

interface Prediction {
  homeTeamWinProbability: number;
  awayTeamWinProbability: number;
  confidence: number;
  factors: {
    skillDifference: number;
    chemistryAdvantage: "home" | "away" | "neutral";
    formAdvantage: "home" | "away" | "neutral";
  };
  prediction: "home" | "away" | "toss-up";
  expectedScore: {
    home: number;
    away: number;
  };
}

export function MatchPrediction({ matchId, homeTeam, awayTeam }: MatchPredictionProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function fetchPrediction() {
      try {
        const res = await fetch(`/api/matches/${matchId}/prediction`);
        if (res.ok) {
          const data = await res.json();
          setPrediction(data.prediction);
        }
      } catch (error) {
        console.error("Failed to fetch prediction:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPrediction();
  }, [matchId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-blue-50 to-purple-50 p-4 dark:border-zinc-800 dark:from-blue-950 dark:to-purple-950">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-blue-600"
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
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            AI analyserar matchen...
          </span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const homePercentage = prediction.homeTeamWinProbability;
  const awayPercentage = prediction.awayTeamWinProbability;

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-4 shadow-sm dark:border-blue-900 dark:from-blue-950 dark:to-purple-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Match Predictor
          </h3>
        </div>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {prediction.confidence}% säker
        </span>
      </div>

      {/* Probability bars */}
      <div className="space-y-2">
        {/* Home team */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {homeTeam.join(" & ")}
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {homePercentage}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out"
              style={{ width: `${homePercentage}%` }}
            />
          </div>
        </div>

        {/* Away team */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {awayTeam.join(" & ")}
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {awayPercentage}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-1000 ease-out"
              style={{ width: `${awayPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Prediction result */}
      <div className="rounded-md bg-white/50 p-2 text-center dark:bg-black/20">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Förväntat resultat
        </p>
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {prediction.expectedScore.home} - {prediction.expectedScore.away}
        </p>
      </div>

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {showDetails ? "Dölj detaljer ▲" : "Visa detaljer ▼"}
      </button>

      {/* Detailed analysis */}
      {showDetails && (
        <div className="space-y-2 border-t border-blue-200 pt-3 text-xs dark:border-blue-900">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Färdighetsskillnad:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {prediction.factors.skillDifference.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Spelkemi-fördel:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {prediction.factors.chemistryAdvantage === "home" && "🏠 Hemmalaget"}
              {prediction.factors.chemistryAdvantage === "away" && "✈️ Bortalaget"}
              {prediction.factors.chemistryAdvantage === "neutral" && "⚖️ Jämnt"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Form-fördel:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {prediction.factors.formAdvantage === "home" && "🏠 Hemmalaget"}
              {prediction.factors.formAdvantage === "away" && "✈️ Bortalaget"}
              {prediction.factors.formAdvantage === "neutral" && "⚖️ Jämnt"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
