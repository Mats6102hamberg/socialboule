"use client";

import { useState } from "react";

type Props = {
  id: string;
};

export default function DeleteNightButton({ id }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    const confirmed = window.confirm("Ta bort den här boule-kvällen?");
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/boule-nights/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("Failed to delete night", res.status, body);
        alert(body || "Kunde inte ta bort boule-kvällen. Försök igen.");
        return;
      }
      alert("Boule-kvällen är borttagen.");
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Ta bort boule-kväll"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-500/60 text-[11px] text-red-600 hover:bg-red-500/10 disabled:opacity-50"
    >
      🗑
    </button>
  );
}
