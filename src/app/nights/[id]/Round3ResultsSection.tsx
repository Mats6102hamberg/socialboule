"use client";

import { RoundResultsSection } from "@/components/RoundResultsSection";

export function Round3ResultsSection() {
  return (
    <RoundResultsSection
      roundNumber={3}
      title="Resultat – omgång 3"
      description="Fyll i resultat för varje match i omgång 3. Efter denna omgång visas slutställningen."
    />
  );
}
