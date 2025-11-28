"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SuspendClubButtonProps {
  clubId: string;
  clubName: string;
  isSuspended: boolean;
}

export function SuspendClubButton({ clubId, clubName, isSuspended }: SuspendClubButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");

  async function handleSuspend() {
    if (!confirm(`Är du säker på att du vill stänga av ${clubName}? Klubben kommer inte kunna logga in eller skapa events.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: true, reason: reason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Kunde inte stänga av klubben");
        return;
      }

      setShowModal(false);
      setReason("");
      router.refresh();
    } catch (error) {
      console.error("Failed to suspend club:", error);
      alert("Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    if (!confirm(`Vill du aktivera ${clubName} igen?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Kunde inte aktivera klubben");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to reactivate club:", error);
      alert("Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  if (isSuspended) {
    return (
      <button
        onClick={handleReactivate}
        disabled={loading}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Aktiverar..." : "Aktivera klubb"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        Stäng av klubb
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Stäng av {clubName}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Klubben kommer inte kunna logga in eller använda appen. Du kan aktivera dem igen senare.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Anledning (valfritt)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="T.ex. Missbruk av tjänsten, spam, etc."
                rows={3}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setReason("");
                }}
                className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Avbryt
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Stänger av..." : "Stäng av klubb"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
