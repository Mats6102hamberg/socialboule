"use client";

import { RoundResultsSection } from "@/components/RoundResultsSection";

export function Round1ResultsSection() {
  return (
    <RoundResultsSection
      roundNumber={1}
      title="Resultat – omgång 1"
      description="Fyll i resultat för varje match. Poängen används senare för lottning av omgång 2."
    />
  );
}
