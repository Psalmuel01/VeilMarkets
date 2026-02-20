import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketCard, Market } from "@/components/markets/MarketCard";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { motion } from "framer-motion";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";


export default function MarketsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const { fetchMarkets, loading } = useAleoPrograms();

  useEffect(() => {
    const loadMarkets = async () => {
      const realMarkets = await fetchMarkets();

      const categoryRevMap: Record<number, string> = {
        0: "Crypto",
        1: "Finance",
        2: "Sports",
        3: "Politics",
        4: "Entertainment",
        5: "Tech"
      };

      const mapped = realMarkets.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        category: (categoryRevMap[m.category] || "General") as any,
        status: (m.resolved ? "Settled" : "Open") as any,
        closingTime: `Block ${m.close_block}`,
        betsPlaced: 0, // Need to implement pool fetching for this
        outcome: (m.resolved ? (m.winning_outcome === 1 ? "Yes" : "No") : undefined) as any,
      }));

      setMarkets(mapped);
    };
    loadMarkets();
  }, [fetchMarkets]);

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
