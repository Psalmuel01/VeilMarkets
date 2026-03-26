import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketCard, Market } from "@/components/markets/MarketCard";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { motion } from "framer-motion";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { formatDateFriendly, formatVolume } from "@/lib/utils";
import { getAllMarketMetadata } from "@/lib/metadata";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const { fetchMarkets, fetchPoolStats, loading, currentHeight, refreshSignal } = useAleoPrograms();

  useEffect(() => {
    const loadMarkets = async () => {
      const [realMarkets, metadata] = await Promise.all([
        fetchMarkets(),
        getAllMarketMetadata()
      ]);

      const metadataMap = new Map((metadata || []).map(m => [m.market_id, m]));

      // Initially map with 0 bets
      const initialMapped: Market[] = realMarkets.map((market) => {
        const nowTs = Math.floor(Date.now() / 1000);
        const meta = metadataMap.get(market.id);
        
        const isSettled = market.is_resolved;
        const isClosed = !isSettled && nowTs >= market.close_time;
        const status = isSettled ? "Settled" : isClosed ? "Closed" : "Open";

        const createdTs = meta?.created_at ? Math.floor(new Date(meta.created_at).getTime() / 1000) : null;

        return {
          id: market.id,
          title: market.title,
          description: market.description,
          category: mapCategory(market.category),
          status: status,
          closingTime: formatDateFriendly(market.close_time),
          creationTime: createdTs ? formatDateFriendly(createdTs) : undefined,
          betsPlaced: 0,
          outcome: market.is_resolved ? (market.winning_outcome === 1 ? "Yes" : "No") : undefined,
        };
      });

      setMarkets(initialMapped);

      // Fetch real pool stats for each market to get bet counts
      try {
        const statsPromises = realMarkets.map(m => fetchPoolStats(m.id));
        const allStats = await Promise.all(statsPromises);

        const updated = initialMapped.map((m, i) => ({
          ...m,
          betsPlaced: allStats[i]?.participant_count || 0
        }));

        const totalEscrowed = allStats.reduce((acc, stat) => acc + (stat?.escrowed_amount || 0), 0);
        setTotalVolume(totalEscrowed / 1_000_000);

        setMarkets(updated);
      } catch (error) {
        console.error("Failed to fetch pool stats for markets:", error);
      }
    };
    loadMarkets();
  }, [fetchMarkets, fetchPoolStats, currentHeight, refreshSignal]);

  const filteredMarkets = markets.filter((market) => {
    const matchesCategory = activeCategory === "all" || market.category === activeCategory;
    const matchesSearch = market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Live Prediction Ecosystem</span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
                Explore <span className="text-gradient">Markets</span>
              </h1>
              <p className="text-md text-muted-foreground max-w-2xl leading-relaxed">
                Discover and participate in decentralized, privacy-preserving prediction markets powered by zero-knowledge proofs on Aleo.
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 p-2 rounded-2xl backdrop-blur-sm">
              <div className="px-4 py-2 text-center border-r border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Active</div>
                <div className="text-xl font-semibold font-mono text-white">{markets.length}</div>
              </div>
              <div className="px-4 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Volume</div>
                <div className="text-xl font-semibold font-mono text-success">{formatVolume(totalVolume)}</div>
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
          />
        </div>

        {/* Market Grid */}
        {loading && markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground text-lg">Fetching markets from the ZK network...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <p className="text-muted-foreground">No markets found matching your criteria</p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
