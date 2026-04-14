import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketCard, Market } from "@/components/markets/MarketCard";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { motion } from "framer-motion";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { formatDateFriendly, formatVolume } from "@/lib/utils";
import {
  resolveTokenKind,
  resolveTokenTicker,
  type SupportedTokenKind,
} from "@/lib/constants";
import {
  getOutcomeLabel,
  isCancelledOutcome,
  normalizeOutcomeCount,
} from "@/lib/outcomes";
import { useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useMarketsQuery } from "@/hooks/useVeilQuery";

const mapCategory = (value: number): Market["category"] => {
  switch (value) {
    case 0:
      return "Crypto";
    case 1:
      return "Finance";
    case 2:
      return "Sports";
    case 3:
      return "Politics";
    case 4:
      return "Entertainment";
    case 5:
      return "Tech";
    case 6:
      return "Other";
    default:
      return "Other";
  }
};

export default function MarketsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeToken, setActiveToken] = useState<"all" | SupportedTokenKind>(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { fetchPoolStats } = useAleoPrograms();
  const { data: chainMarkets = [], isLoading: isMarketsLoading } =
    useMarketsQuery();

  const poolQueries = useQueries({
    queries: chainMarkets.map((market) => ({
      queryKey: queryKeys.marketPool(market.id),
      queryFn: () => fetchPoolStats(market.id, market.program_id),
      enabled: chainMarkets.length > 0,
      refetchInterval: 7_000,
      staleTime: 3_000,
    })),
  });

  const poolsByMarketId = useMemo(() => {
    const map = new Map<
      string,
      { trader_count: number; cumulative_volume: number; open_interest: number; tvl: number }
    >();
    chainMarkets.forEach((market, index) => {
      const query = poolQueries[index];
      const pool = query?.data;
      map.set(market.id, {
        trader_count: pool?.trader_count ?? pool?.participant_count ?? 0,
        cumulative_volume: pool?.cumulative_volume ?? 0,
        open_interest: pool?.trading_collateral ?? pool?.escrowed_amount ?? 0,
        tvl: pool?.total_collateral ?? 0,
      });
    });
    return map;
  }, [chainMarkets, poolQueries]);

  const markets = useMemo<Market[]>(() => {
    const nowTs = Math.floor(Date.now() / 1000);
    return chainMarkets.map((market) => {
      const isSettled = market.is_resolved;
      const isCancelled = isSettled && isCancelledOutcome(market.winning_outcome);
      const isClosed = !isSettled && nowTs >= market.close_time;
      const status: Market["status"] = isCancelled
        ? "Cancelled"
        : isSettled
          ? "Settled"
          : isClosed
            ? "Closed"
            : "Open";
      const pool = poolsByMarketId.get(market.id);

      return {
        id: market.id,
        programId: market.program_id,
        title: market.title,
        description: market.description,
        category: mapCategory(market.category),
        status,
        closingTime: formatDateFriendly(market.close_time),
        betsPlaced: pool?.trader_count ?? 0,
        marketType: market.market_type,
        outcomeCount: normalizeOutcomeCount(market.outcome_count),
        winningOutcome: market.winning_outcome,
        outcome: market.is_resolved
          ? isCancelledOutcome(market.winning_outcome)
            ? "Cancelled"
            : getOutcomeLabel(
                market.market_type,
                market.outcome_count,
                market.winning_outcome,
                market.outcome_labels,
              )
          : undefined,
        tokenId: market.token_id,
        tokenTicker: resolveTokenTicker(market.token_id),
        tokenKind: resolveTokenKind(market.token_id),
      };
    });
  }, [chainMarkets, poolsByMarketId]);

  const totalVolume = useMemo(() => {
    const totalTraded = Array.from(poolsByMarketId.values()).reduce(
      (acc, pool) => acc + (pool.cumulative_volume || 0),
      0,
    );
    return totalTraded / 1_000_000;
  }, [poolsByMarketId]);

  const loading = isMarketsLoading && markets.length === 0;

  const filteredMarkets = markets.filter((market) => {
    const matchesCategory =
      activeCategory === "all" || market.category === activeCategory;
    const matchesToken =
      activeToken === "all" || market.tokenKind === activeToken;
    const matchesSearch =
      market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesToken && matchesSearch;
  });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 relative">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Live Prediction Ecosystem
                </span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
                Explore <span className="text-gradient">Markets</span>
              </h1>
              <p className="text-md text-muted-foreground max-w-2xl leading-relaxed">
                Discover and participate in decentralized, privacy-preserving
                prediction markets powered by zero-knowledge proofs on Aleo.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 p-2 rounded-2xl backdrop-blur-sm">
              <div className="px-4 py-2 text-center border-r border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Active
                </div>
                <div className="text-xl font-semibold font-mono text-white">
                  {markets.length}
                </div>
              </div>
              <div className="px-4 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Volume
                </div>
                <div className="text-xl font-semibold font-mono text-success">
                  {formatVolume(totalVolume)}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <MarketFilters
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeToken={activeToken}
            onTokenChange={setActiveToken}
          />
        </div>

        {/* Market Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground text-lg">
              Fetching markets from the ZK network...
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MarketCard market={market} />
                </motion.div>
              ))}
            </div>

            {filteredMarkets.length === 0 && !loading && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  No markets found matching your criteria
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
