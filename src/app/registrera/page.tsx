"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterClubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    clubName: "",
    location: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.clubName.trim()) {
      setError("Ange klubbens namn");
      return;
    }
    if (!formData.adminName.trim()) {
      setError("Ange ditt namn");
      return;
    }
    if (!formData.email.trim()) {
      setError("Ange din e-postadress");
      return;
    }
    if (formData.password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Lösenorden matchar inte");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/clubs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubName: formData.clubName,
          location: formData.location,
          adminName: formData.adminName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Något gick fel");
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-zinc-900">
      {/* Header */}
      <header className="border-b border-emerald-700/50 bg-emerald-900/50">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="text-2xl">🎱</span>
            <span className="font-semibold">SocialBoule</span>
          </Link>
          <Link
            href="/logga-in"
            className="text-sm text-emerald-200 hover:text-white"
          >
            Redan medlem? Logga in →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Starta din klubb på SocialBoule
          </h1>
          <p className="mt-3 text-emerald-200">
            Få ett komplett system för att hantera era Pétanque-kvällar. 
            Gratis att komma igång!
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div
                  className={`w-12 h-1 rounded ${
                    step > s ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 sm:p-8"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Om din klubb
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Berätta lite om er förening
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Klubbens namn *
                  </label>
                  <input
                    type="text"
                    value={formData.clubName}
                    onChange={(e) => updateField("clubName", e.target.value)}
                    placeholder="T.ex. Stockholms Pétanqueklubb"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Ort / Region
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="T.ex. Stockholm"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!formData.clubName.trim()) {
                    setError("Ange klubbens namn");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 transition"
              >
                Fortsätt →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Skapa ditt admin-konto
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Du blir första administratören för {formData.clubName}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Ditt namn *
                  </label>
                  <input
                    type="text"
                    value={formData.adminName}
                    onChange={(e) => updateField("adminName", e.target.value)}
                    placeholder="Förnamn Efternamn"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    E-postadress *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="din@email.se"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Lösenord *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Minst 6 tecken"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Bekräfta lösenord *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    placeholder="Skriv lösenordet igen"
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-zinc-600 px-4 py-3 font-medium text-zinc-300 hover:bg-zinc-700 transition"
                >
                  ← Tillbaka
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Skapar klubb..." : "Skapa klubb 🎉"}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Features */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-3xl mb-2">🎲</div>
            <h3 className="font-medium text-white">Smart lottning</h3>
            <p className="text-sm text-zinc-400">
              Automatisk lottning baserad på resultat
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-medium text-white">Statistik</h3>
            <p className="text-sm text-zinc-400">
              Topplista, ELO-ranking och badges
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-medium text-white">Mobilvänligt</h3>
            <p className="text-sm text-zinc-400">
              Spelare rapporterar resultat direkt
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
