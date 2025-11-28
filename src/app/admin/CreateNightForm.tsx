"use client";

import { useState, FormEvent } from "react";

export function CreateNightForm() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"DAY" | "EVENING">("EVENING");
  const [drawMode, setDrawMode] = useState<"INDIVIDUAL" | "TEAM">("INDIVIDUAL");
  const [maxPlayers, setMaxPlayers] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/boule-nights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          date: isoDate,
          location: location || null,
          description: description || null,
          type,
          drawMode,
          maxPlayers: maxPlayers ? Number.parseInt(maxPlayers, 10) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Kunde inte skapa boule-kväll.");
        return;
      }

      setName("");
      setDate("");
      setTime("");
      setLocation("");
      setDescription("");
      setType("EVENING");
      setDrawMode("INDIVIDUAL");
      setMaxPlayers("");

      // Enkel refresh av listan via page reload
      window.location.reload();
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
      aria-label="Skapa ny boule-kväll"
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
          <div className="relative">
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-[180px] rounded-md border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
              style={{ colorScheme: 'light dark' }}
            />
            {/* Kalenderikon - klickbar */}
            <svg
              onClick={() => {
                const input = document.getElementById('date') as HTMLInputElement | null;
                if (input && 'showPicker' in input) {
                  (input as any).showPicker();
                }
              }}
              className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="time" className="text-sm font-medium">
            Tid (valfri)
          </label>
          <div className="relative">
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
              style={{ colorScheme: 'light dark' }}
            />
          </div>
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
          <label htmlFor="drawMode" className="text-sm font-medium">
            Lottningsläge
          </label>
          <select
            id="drawMode"
            value={drawMode}
            onChange={(e) => setDrawMode(e.target.value === "TEAM" ? "TEAM" : "INDIVIDUAL")}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="INDIVIDUAL">Individuell</option>
            <option value="TEAM">Lagtävling</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        {submitting ? "Skapar..." : "Skapa boule-kväll"}
      </button>
    </form>
  );
}
