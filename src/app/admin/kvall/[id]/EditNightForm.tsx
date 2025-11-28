"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface EditNightFormProps {
  id: string;
}

export function EditNightForm({
  id,
}: EditNightFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"DAY" | "EVENING">("EVENING");
  const [maxPlayers, setMaxPlayers] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNight() {
      try {
        const res = await fetch(`/api/boule-nights/${id}`);
        if (!res.ok) {
          return;
        }
        const night = await res.json();
        if (!cancelled && night) {
          setName(night.name ?? "");
          const iso = night.date as string;
          if (iso) {
            const d = new Date(iso);
            const dateOnly = d.toISOString().slice(0, 10);
            const timeOnly = d.toISOString().slice(11, 16);
            setDate(dateOnly);
            setTime(timeOnly || "18:00");
          }
          setLocation(night.location ?? "");
          setDescription(night.description ?? "");
          if (night.type === "DAY" || night.type === "EVENING") {
            setType(night.type);
          } else {
            setType("EVENING");
          }
          if (typeof night.maxPlayers === "number" && Number.isFinite(night.maxPlayers)) {
            setMaxPlayers(String(night.maxPlayers));
          } else {
            setMaxPlayers("");
          }
        }
      } catch (e) {
        console.error("Failed to load boule night", e);
      }
    }

    loadNight();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !date) {
      setError("Namn och datum är obligatoriska.");
      return;
    }

    const isoDate = new Date(`${date}T${time || "18:00"}:00`).toISOString();

    try {
      setSubmitting(true);
      const res = await fetch(`/api/boule-nights/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          date: isoDate,
          location: location || null,
          description: description || null,
          type,
          maxPlayers: maxPlayers ? Number.parseInt(maxPlayers, 10) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Kunde inte uppdatera Pétanque Crash.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Ett oväntat fel inträffade.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Redigera Pétanque Crash"
    >
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Namn
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="date" className="text-sm font-medium">
            Datum
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-w-[180px] rounded-md border border-zinc-300 bg-white px-3 pr-6 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="time" className="text-sm font-medium">
            Tid (valfri)
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="type" className="text-sm font-medium">
            Typ
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value === "DAY" ? "DAY" : "EVENING")}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="EVENING">Kväll</option>
            <option value="DAY">Dag</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="maxPlayers" className="text-sm font-medium">
            Max antal spelare (valfritt)
          </label>
          <input
            id="maxPlayers"
            type="number"
            min={1}
            inputMode="numeric"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="text-sm font-medium">
          Plats (valfri)
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Beskrivning (valfri)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Sparar..." : "Spara ändringar"}
      </button>
    </form>
  );
}
