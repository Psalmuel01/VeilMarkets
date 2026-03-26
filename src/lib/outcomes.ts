export const CANCELLED_OUTCOME = 255;
export const LEGACY_CANCELLED_OUTCOME = 3;

export const isCancelledOutcome = (outcome: number | null | undefined): boolean =>
  outcome === CANCELLED_OUTCOME || outcome === LEGACY_CANCELLED_OUTCOME;

export const normalizeOutcomeCount = (value: number | null | undefined): number => {
  if (!Number.isFinite(value)) return 2;
  return Math.min(4, Math.max(2, Math.floor(value as number)));
};

export const getOutcomeLabels = (marketType: number, outcomeCount: number): string[] => {
  const normalizedCount = normalizeOutcomeCount(outcomeCount);
  if (marketType === 0 && normalizedCount === 2) {
    return ["No", "Yes"];
  }
  return Array.from({ length: normalizedCount }, (_, index) => `Option ${index + 1}`);
};

export const getOutcomeLabel = (
  marketType: number,
  outcomeCount: number,
  outcomeIndex: number | null | undefined,
): string => {
  if (!Number.isFinite(outcomeIndex)) return "Unknown";
  const labels = getOutcomeLabels(marketType, outcomeCount);
  const index = Math.floor(outcomeIndex as number);
  return labels[index] ?? `Outcome ${index + 1}`;
};

export const getOutcomeTone = (
  marketType: number,
  outcomeCount: number,
  outcomeIndex: number,
): "yes" | "no" | "neutral" => {
  if (marketType === 0 && normalizeOutcomeCount(outcomeCount) === 2) {
    if (outcomeIndex === 1) return "yes";
    if (outcomeIndex === 0) return "no";
  }
  return "neutral";
};
