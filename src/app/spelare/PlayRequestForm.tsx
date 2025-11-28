"use client";

import { useState, FormEvent } from "react";

export function PlayRequestForm() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const preferredDate = date ? `${date}T00:00:00.000Z` : null;

      const res = await fetch("/api/play-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          preferredDate,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to create play request", res.status, text);
        setError("Kunde inte skicka önskemålet. Försök igen.");
        return;
      }

      setName("");
      setDate("");
      setMessage("");
      setSuccess("Tack! Ditt önskemål är mottaget.");
    } catch (err) {
      console.error("Failed to create play request", err);
      setError("Tekniskt fel när önskemålet skulle skickas.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Skicka önskemål om speldag"
    >
      <h2 className="text-base font-medium">Önskemål om speldagar</h2>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Här kan du önska vilka datum du gärna vill spela. Arrangören använder detta när nya Pétanque Crash planeras.
      </p>

      <div className="space-y-1">
        <label htmlFor="name" className="text-xs font-medium">
          Ditt namn (valfritt)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="date" className="text-xs font-medium">
          Önskat datum (valfritt)
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="text-xs font-medium">
          Meddelande (valfritt)
        </label>
        <textarea
          id="message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-600" role="status">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Skickar..." : "Skicka önskemål"}
      </button>
    </form>
  );
}
