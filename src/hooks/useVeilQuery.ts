import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentBlockHeight, type PoolInfo } from "@/lib/aleo";
import { queryKeys } from "@/lib/queryKeys";
import { resolveTokenKind, type SupportedTokenKind } from "@/lib/constants";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";

const POLL_INTERVAL_MS = 5_000;
const DEFAULT_STALE_MS = 3_000;

interface TokenBalanceSummary {
  private: number;
  public: number;
  total: number;
}

interface PlaceBetVariables {
  marketId: string;
  outcome: number;
  amountCredits: number;
  tokenId: string;
  slippageBps?: number;
}

interface SellSharesVariables {
  marketId: string;
  sharesToSell: number;
  slippageBps?: number;
}

interface FundPoolVariables {
  marketId: string;
  amountCredits: number;
  tokenId: string;
}

interface PlaceBetMutationContext {
  previousPool?: PoolInfo | null;
  previousBalances?: TokenBalanceSummary | null;
}

const invalidateCoreQueries = async (
  invalidate: (args: { queryKey: readonly unknown[] }) => Promise<void>,
  marketId?: string,
  address?: string | null,
) => {
  await invalidate({ queryKey: queryKeys.markets });
  if (marketId) {
    const normalizedMarketId = (marketId || "").replace(/field$/i, "").trim();
    await invalidate({ queryKey: queryKeys.market(marketId) });
    await invalidate({ queryKey: queryKeys.marketPool(marketId) });
    await invalidate({ queryKey: queryKeys.marketProposal(marketId) });
    await invalidate({ queryKey: ["market", "outcomes", normalizedMarketId] });
    await invalidate({ queryKey: ["market", "quote", normalizedMarketId] });
    await invalidate({ queryKey: ["market", "sell-quote", normalizedMarketId] });
  }
  if (address) {
    await invalidate({ queryKey: queryKeys.userBets(address) });
    await invalidate({ queryKey: queryKeys.balancesCredits(address) });
    await invalidate({ queryKey: queryKeys.balancesUsdcx(address) });
    await invalidate({ queryKey: queryKeys.balancesUsad(address) });
    await invalidate({ queryKey: queryKeys.oracleStatus(address) });
    await invalidate({ queryKey: queryKeys.oracleStake(address) });
  }
};

export const useMarketsQuery = () => {
  const { fetchMarkets } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.markets,
    queryFn: fetchMarkets,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

export const useCurrentHeightQuery = () =>
  useQuery({
    queryKey: queryKeys.currentHeight,
    queryFn: fetchCurrentBlockHeight,
    staleTime: 5_000,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

export const useProtocolConfigQuery = () => {
  const { fetchCoreProtocolConfig } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.protocolConfig,
    queryFn: fetchCoreProtocolConfig,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
};

export const useMarketPoolQuery = (marketId?: string, enabled = true) => {
  const { fetchPoolStats } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.marketPool(marketId ?? ""),
    queryFn: () => fetchPoolStats(marketId ?? ""),
    enabled: Boolean(marketId) && enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useOutcomeTotalsQuery = (
  marketId: string | undefined,
  outcomeCount: number,
  programId?: string,
  enabled = true,
) => {
  const { fetchOutcomeTotals } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.marketOutcomeTotals(marketId ?? "", outcomeCount),
    queryFn: () => fetchOutcomeTotals(marketId ?? "", outcomeCount, programId),
    enabled: Boolean(marketId) && enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

export const useBuyQuoteQuery = (
  marketId: string | undefined,
  outcome: number | null,
  amountCredits: number,
  slippageBps = 200,
  enabled = true,
) => {
  const { quoteBuyShares } = useAleoPrograms();
  const amountMicro = Math.max(1_000_000, Math.floor(amountCredits * 1_000_000));

  return useQuery({
    queryKey: queryKeys.buyQuote(marketId ?? "", outcome ?? -1, amountMicro, slippageBps),
    queryFn: () => quoteBuyShares(marketId ?? "", outcome ?? 0, amountMicro, slippageBps),
    enabled: Boolean(marketId) && outcome !== null && enabled,
    staleTime: 2_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
};

export const useSellQuoteQuery = (
  marketId: string | undefined,
  outcome: number | null,
  sharesToSell: number,
  slippageBps = 200,
  enabled = true,
) => {
  const { quoteSellShares } = useAleoPrograms();
  const normalizedShares = Math.max(1, Math.floor(sharesToSell));

  return useQuery({
    queryKey: queryKeys.sellQuote(marketId ?? "", outcome ?? -1, normalizedShares, slippageBps),
    queryFn: () => quoteSellShares(marketId ?? "", outcome ?? 0, normalizedShares, slippageBps),
    enabled: Boolean(marketId) && outcome !== null && enabled,
    staleTime: 2_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
};

export const useResolutionProposalQuery = (marketId?: string) => {
  const { fetchResolutionProposal } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.marketProposal(marketId ?? ""),
    queryFn: () => fetchResolutionProposal(marketId ?? ""),
    enabled: Boolean(marketId),
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useUserBetsQuery = () => {
  const { fetchUserBets, publicKey } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.userBets(publicKey),
    queryFn: fetchUserBets,
    enabled: Boolean(publicKey),
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useCreditsBalancesQuery = (enabled = true) => {
  const { fetchBalances, publicKey } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.balancesCredits(publicKey),
    queryFn: fetchBalances,
    enabled: Boolean(publicKey) && enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useUSDCxBalancesQuery = (enabled = true) => {
  const { fetchUSDCxBalances, publicKey } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.balancesUsdcx(publicKey),
    queryFn: fetchUSDCxBalances,
    enabled: Boolean(publicKey) && enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useUSADBalancesQuery = (enabled = true) => {
  const { fetchUSADBalances, publicKey } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.balancesUsad(publicKey),
    queryFn: fetchUSADBalances,
    enabled: Boolean(publicKey) && enabled,
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useTokenBalanceQuery = (tokenId: string, enabled = true) => {
  const tokenKind = resolveTokenKind(tokenId);
  const creditsQuery = useCreditsBalancesQuery(enabled);
  const usdcxQuery = useUSDCxBalancesQuery(enabled);
  const usadQuery = useUSADBalancesQuery(enabled);

  if (tokenKind === "usdcx") return usdcxQuery;
  if (tokenKind === "usad") return usadQuery;
  return creditsQuery;
};

export const useOracleStakeQuery = () => {
  const { fetchOracleStake, publicKey } = useAleoPrograms();

  return useQuery({
    queryKey: queryKeys.oracleStake(publicKey),
    queryFn: fetchOracleStake,
    enabled: Boolean(publicKey),
    staleTime: DEFAULT_STALE_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useOracleStatusQuery = () => {
  const { publicKey } = useAleoPrograms();
  const stakeQuery = useOracleStakeQuery();

  const isOracle = (stakeQuery.data ?? 0) >= 30_000_000;

  return {
    ...stakeQuery,
    data: isOracle,
  };
};

export const usePlaceBetMutation = () => {
  const queryClient = useQueryClient();
  const { placeBet, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async ({ marketId, outcome, amountCredits, tokenId, slippageBps }: PlaceBetVariables) => {
      const txId = await placeBet(marketId, outcome, amountCredits, tokenId, { slippageBps });
      if (!txId) {
        throw new Error("Bet transaction failed");
      }
      return txId;
    },
    onMutate: async ({ marketId, outcome, amountCredits, tokenId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.marketPool(marketId) });

      const tokenKind = (resolveTokenKind(tokenId) ?? "credits") as SupportedTokenKind | "credits";
      const balanceKey =
        tokenKind === "usdcx"
          ? queryKeys.balancesUsdcx(publicKey)
          : tokenKind === "usad"
            ? queryKeys.balancesUsad(publicKey)
            : queryKeys.balancesCredits(publicKey);

      const previousPool = queryClient.getQueryData<PoolInfo | null>(queryKeys.marketPool(marketId)) ?? null;
      const previousBalances = queryClient.getQueryData<TokenBalanceSummary | null>(balanceKey) ?? null;
      const deltaMicro = Math.max(1_000_000, Math.floor(amountCredits * 1_000_000));

      queryClient.setQueryData<PoolInfo | null>(queryKeys.marketPool(marketId), (existing) => {
        if (!existing) return existing;
        const next = { ...existing };
        switch (outcome) {
          case 0:
            next.total_outcome_0 += deltaMicro;
            break;
          case 1:
            next.total_outcome_1 += deltaMicro;
            break;
          case 2:
            next.total_outcome_2 += deltaMicro;
            break;
          case 3:
            next.total_outcome_3 += deltaMicro;
            break;
          case 4:
            next.total_outcome_4 += deltaMicro;
            break;
          case 5:
            next.total_outcome_5 += deltaMicro;
            break;
          case 6:
            next.total_outcome_6 += deltaMicro;
            break;
          case 7:
            next.total_outcome_7 += deltaMicro;
            break;
          default:
            break;
        }
        next.total_no = next.total_outcome_0;
        next.total_yes = next.total_outcome_1;
        next.escrowed_amount += deltaMicro;
        next.participant_count += 1;
        return next;
      });

      queryClient.setQueryData<TokenBalanceSummary | null>(balanceKey, (existing) => {
        if (!existing) return existing;
        const nextPrivate = Math.max(0, existing.private - amountCredits);
        return {
          private: nextPrivate,
          public: existing.public,
          total: Math.max(0, existing.total - amountCredits),
        };
      });

      return { previousPool, previousBalances };
    },
    onError: (_error, variables, context) => {
      if (!context) return;
      const tokenKind = resolveTokenKind(variables.tokenId);
      const balanceKey =
        tokenKind === "usdcx"
          ? queryKeys.balancesUsdcx(publicKey)
          : tokenKind === "usad"
            ? queryKeys.balancesUsad(publicKey)
            : queryKeys.balancesCredits(publicKey);

      queryClient.setQueryData(queryKeys.marketPool(variables.marketId), context.previousPool ?? null);
      queryClient.setQueryData(balanceKey, context.previousBalances ?? null);
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        variables.marketId,
        publicKey,
      );
    },
  });
};

export const useClaimWinningsMutation = () => {
  const queryClient = useQueryClient();
  const { claimWinnings, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async (marketId: string) => {
      const result = await claimWinnings(marketId);
      if (!result) throw new Error("Claim transaction failed");
      return result;
    },
    onSettled: async (_data, _error, marketId) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        marketId,
        publicKey,
      );
    },
  });
};

export const useSellSharesMutation = () => {
  const queryClient = useQueryClient();
  const { sellShares, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async ({ marketId, sharesToSell, slippageBps }: SellSharesVariables) => {
      const result = await sellShares(marketId, sharesToSell, { slippageBps });
      if (!result) throw new Error("Sell shares transaction failed");
      return result;
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        variables.marketId,
        publicKey,
      );
    },
  });
};

export const useFundPoolMutation = () => {
  const queryClient = useQueryClient();
  const { fundPool, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async ({ marketId, amountCredits, tokenId }: FundPoolVariables) => {
      const txId = await fundPool(marketId, amountCredits, tokenId);
      if (!txId) throw new Error("Fund pool transaction failed");
      return txId;
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        variables.marketId,
        publicKey,
      );
    },
  });
};

export const useResolveMarketMutation = () => {
  const queryClient = useQueryClient();
  const { resolveMarket, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async ({ marketId, outcome }: { marketId: string; outcome: number }) => {
      const txId = await resolveMarket(marketId, outcome);
      if (!txId) throw new Error("Resolve market transaction failed");
      return txId;
    },
    onSettled: async (_data, _error, { marketId }) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        marketId,
        publicKey,
      );
    },
  });
};

export const useProposeResolutionMutation = () => {
  const queryClient = useQueryClient();
  const { proposeResolution, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async ({ marketId, outcome }: { marketId: string; outcome: number }) => {
      const txId = await proposeResolution(marketId, outcome);
      if (!txId) throw new Error("Proposal transaction failed");
      return txId;
    },
    onSettled: async (_data, _error, { marketId }) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        marketId,
        publicKey,
      );
    },
  });
};

export const useDisputeResolutionMutation = () => {
  const queryClient = useQueryClient();
  const { disputeResolution, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async ({ marketId, amountCredits }: { marketId: string; amountCredits: number }) => {
      const txId = await disputeResolution(marketId, amountCredits);
      if (!txId) throw new Error("Dispute transaction failed");
      return txId;
    },
    onSettled: async (_data, _error, { marketId }) => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        marketId,
        publicKey,
      );
    },
  });
};

export const useRegisterOracleMutation = () => {
  const queryClient = useQueryClient();
  const { registerAsOracle, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async (amountCredits: number) => {
      const txId = await registerAsOracle(amountCredits);
      if (!txId) throw new Error("Oracle registration failed");
      return txId;
    },
    onSettled: async () => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        undefined,
        publicKey,
      );
    },
  });
};

export const useUnstakeOracleMutation = () => {
  const queryClient = useQueryClient();
  const { unstakeOracleCredits, publicKey } = useAleoPrograms();

  return useMutation({
    mutationFn: async (amountCredits: number) => {
      const txId = await unstakeOracleCredits(amountCredits);
      if (!txId) throw new Error("Oracle unstake failed");
      return txId;
    },
    onSettled: async () => {
      await invalidateCoreQueries(
        ({ queryKey }) => queryClient.invalidateQueries({ queryKey }),
        undefined,
        publicKey,
      );
    },
  });
};
