export const normalizeMarketIdKey = (marketId: string): string =>
  (marketId || "").replace(/field$/i, "").trim();

export const queryKeys = {
  markets: ["markets"] as const,
  market: (marketId: string) => ["market", normalizeMarketIdKey(marketId)] as const,
  marketPool: (marketId: string) => ["market", "pool", normalizeMarketIdKey(marketId)] as const,
  marketProposal: (marketId: string) => ["market", "proposal", normalizeMarketIdKey(marketId)] as const,
  userBets: (address?: string | null) => ["user", "bets", address ?? "guest"] as const,
  balancesCredits: (address?: string | null) => ["balances", "credits", address ?? "guest"] as const,
  balancesUsdcx: (address?: string | null) => ["balances", "usdcx", address ?? "guest"] as const,
  balancesUsad: (address?: string | null) => ["balances", "usad", address ?? "guest"] as const,
  oracleStake: (address?: string | null) => ["oracle", "stake", address ?? "guest"] as const,
  oracleStatus: (address?: string | null) => ["oracle", "status", address ?? "guest"] as const,
  currentHeight: ["chain", "height"] as const,
};
