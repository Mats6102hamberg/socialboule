"use client";

import { useState, useEffect } from "react";

interface AnimatedMatchResultProps {
  homeTeam: string[];
  awayTeam: string[];
  homeScore: number;
  awayScore: number;
  lane: number;
  onAnimationComplete?: () => void;
}

export function AnimatedMatchResult({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  lane,
  onAnimationComplete,
}: AnimatedMatchResultProps) {
  const [stage, setStage] = useState<"countdown" | "reveal" | "celebrate">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [showConfetti, setShowConfetti] = useState(false);

  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  useEffect(() => {
    // Countdown phase
    if (stage === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 600);
      return () => clearTimeout(timer);
    }

    if (stage === "countdown" && countdown === 0) {
      setStage("reveal");
      setTimeout(() => {
        setStage("celebrate");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        onAnimationComplete?.();
      }, 1500);
    }
  }, [stage, countdown, onAnimationComplete]);

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-6 shadow-xl dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: [
                  "#3b82f6",
                  "#8b5cf6",
                  "#ec4899",
                  "#f59e0b",
                  "#10b981",
                ][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </div>
      )}

      {/* Lane indicator */}
      <div className="mb-4 flex items-center justify-center">
        <div className="rounded-full bg-zinc-200 px-4 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Bana {lane}
        </div>
      </div>

      {/* Countdown */}
      {stage === "countdown" && (
        <div className="flex items-center justify-center py-12">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-6xl font-bold text-white shadow-2xl"
            style={{
              animation: "pulse 0.6s ease-in-out",
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Reveal & Celebrate */}
      {(stage === "reveal" || stage === "celebrate") && (
        <div className="space-y-6">
          {/* Teams and scores */}
          <div className="space-y-4">
            {/* Home team */}
            <div
              className={`transform transition-all duration-700 ${
                stage === "celebrate"
                  ? homeWon
                    ? "scale-105"
                    : "scale-95 opacity-75"
                  : ""
              }`}
            >
              <div
                className={`rounded-lg border-2 p-4 ${
                  homeWon && stage === "celebrate"
                    ? "border-green-500 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {homeWon && stage === "celebrate" && (
                        <svg
                          className="h-6 w-6 text-green-600 animate-bounce"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                          />
                        </svg>
                      )}
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {homeTeam.join(" & ")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-5xl font-bold transition-all duration-700 ${
                      homeWon && stage === "celebrate"
                        ? "text-green-600 scale-110"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {homeScore}
                  </div>
                </div>
              </div>
            </div>

            {/* VS divider */}
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-zinc-200 px-4 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                VS
              </div>
            </div>

            {/* Away team */}
            <div
              className={`transform transition-all duration-700 ${
                stage === "celebrate"
                  ? awayWon
                    ? "scale-105"
                    : "scale-95 opacity-75"
                  : ""
              }`}
            >
              <div
                className={`rounded-lg border-2 p-4 ${
                  awayWon && stage === "celebrate"
                    ? "border-green-500 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {awayWon && stage === "celebrate" && (
                        <svg
                          className="h-6 w-6 text-green-600 animate-bounce"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                          />
                        </svg>
                      )}
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {awayTeam.join(" & ")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-5xl font-bold transition-all duration-700 ${
                      awayWon && stage === "celebrate"
                        ? "text-green-600 scale-110"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {awayScore}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Winner announcement */}
          {stage === "celebrate" && (
            <div className="animate-fade-in text-center">
              <p className="text-2xl font-bold text-green-600">
                🎉 Grattis till vinnarna! 🎉
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
