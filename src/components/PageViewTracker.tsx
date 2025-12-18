"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Logga besök när sidan laddas
    async function logView() {
      try {
        await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname }),
        });
      } catch {
        // Ignorera fel - analytics ska inte störa användarupplevelsen
      }
    }

    logView();
  }, [pathname]);

  return null; // Ingen synlig komponent
}
