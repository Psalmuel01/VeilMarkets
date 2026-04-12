export const CANCELLED_OUTCOME = 255;
export const MAX_OUTCOME_COUNT = 8;

export const isCancelledOutcome = (outcome: number | null | undefined): boolean =>
  outcome === CANCELLED_OUTCOME;

export const normalizeOutcomeCount = (value: number | null | undefined): number => {
  if (!Number.isFinite(value)) return 2;
  return Math.min(MAX_OUTCOME_COUNT, Math.max(2, Math.floor(value as number)));
};

export const normalizeOutcomeLabels = (
  labels: string[] | null | undefined,
  outcomeCount: number,
): string[] | null => {
  if (!Array.isArray(labels)) return null;
  const normalizedCount = normalizeOutcomeCount(outcomeCount);
  const trimmed = labels.map((label) => String(label ?? "").trim());
  if (trimmed.length !== normalizedCount) return null;
  if (trimmed.some((label) => label.length === 0)) return null;
  return trimmed;
};

export const getOutcomeLabels = (
  marketType: number,
  outcomeCount: number,
  labels?: string[] | null,
): string[] => {
  const normalizedCount = normalizeOutcomeCount(outcomeCount);
  const customLabels = normalizeOutcomeLabels(labels, normalizedCount);
  if (customLabels) return customLabels;
  if (marketType === 0 && normalizedCount === 2) {
    return ["No", "Yes"];
  }
  return Array.from({ length: normalizedCount }, (_, index) => `Option ${index + 1}`);
};

export const getOutcomeLabel = (
  marketType: number,
  outcomeCount: number,
  outcomeIndex: number | null | undefined,
  labels?: string[] | null,
): string => {
  if (!Number.isFinite(outcomeIndex)) return "Unknown";
  const resolvedLabels = getOutcomeLabels(marketType, outcomeCount, labels);
  const index = Math.floor(outcomeIndex as number);
  return resolvedLabels[index] ?? `Outcome ${index + 1}`;
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
