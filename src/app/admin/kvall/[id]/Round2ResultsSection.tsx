"use client";

import { RoundResultsSection } from "@/components/RoundResultsSection";

export function Round2ResultsSection() {
  return (
    <RoundResultsSection
      roundNumber={2}
      title="Resultat – omgång 2"
      description="Fyll i resultat för varje match i omgång 2. Poängen används senare för lottning av omgång 3."
    />
  );
}
