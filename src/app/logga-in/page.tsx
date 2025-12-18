"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Fyll i e-post och lösenord");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/club-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fel e-post eller lösenord");
        return;
      }

      // Success! Redirect to club dashboard
      router.push(`/klubb/${data.club.slug}/admin`);
    } catch {
      setError("Kunde inte ansluta till servern");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-zinc-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-emerald-700/50 bg-emerald-900/50">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🎱</span>
            <span className="font-semibold">SocialBoule</span>
          </Link>
          <Link
            href="/registrera"
            className="text-sm text-emerald-200 hover:text-white"
          >
            Ny klubb? Registrera →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-white">
              Logga in som klubb-admin
            </h1>
            <p className="mt-2 text-emerald-200">
              Hantera din klubbs events och spelare
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8 space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                E-postadress
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Lösenord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loggar in..." : "Logga in"}
            </button>

            <p className="text-center text-sm text-zinc-400">
              Har du ingen klubb än?{" "}
              <Link href="/registrera" className="text-emerald-400 hover:underline">
                Registrera gratis
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
