import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketCard, Market } from "@/components/markets/MarketCard";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { motion } from "framer-motion";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";

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
    default:
      return "Tech";
  }
};

export default function MarketsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const { fetchMarkets, fetchPoolStats, loading } = useAleoPrograms();

  useEffect(() => {
    const loadMarkets = async () => {
      const realMarkets = await fetchMarkets();

      // Initially map with 0 bets
      const initialMapped: Market[] = realMarkets.map((market) => ({
        id: market.id,
        title: market.title,
        description: market.description,
        category: (market.category === 0 ? "Crypto" :
          market.category === 1 ? "Finance" :
            market.category === 2 ? "Sports" :
              market.category === 3 ? "Politics" :
                market.category === 4 ? "Entertainment" : "Tech"),
        status: market.is_resolved ? "Settled" : "Open",
        closingTime: `Block ${market.close_block}`,
        betsPlaced: 0,
        outcome: market.is_resolved ? (market.winning_outcome === 1 ? "Yes" : "No") : undefined,
      }));

      setMarkets(initialMapped);

      // Fetch real pool stats for each market to get bet counts
      try {
        const statsPromises = realMarkets.map(m => fetchPoolStats(m.id));
        const allStats = await Promise.all(statsPromises);

        const updated = initialMapped.map((m, i) => ({
          ...m,
          betsPlaced: allStats[i]?.participant_count || 0
        }));

        setMarkets(updated);
      } catch (error) {
        console.error("Failed to fetch pool stats for markets:", error);
      }
    };
    loadMarkets();
  }, [fetchMarkets, fetchPoolStats]);

  const filteredMarkets = markets.filter((market) => {
    const matchesCategory = activeCategory === "all" || market.category === activeCategory;
    const matchesSearch = market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MainLayout requireWallet={true}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Prediction Markets</h1>
          <p className="text-muted-foreground">
            Browse and participate in private prediction markets
          </p>
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
