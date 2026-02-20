import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketCard, Market } from "@/components/markets/MarketCard";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { motion } from "framer-motion";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

// Mock data
const mockMarkets: Market[] = [
  {
    id: "1",
    title: "Will Bitcoin reach $100,000 by end of Q2 2024?",
    description: "This market resolves YES if Bitcoin's price exceeds $100,000 USD on any major exchange before June 30, 2024.",
    category: "Crypto",
    status: "Open",
    closingTime: "Jun 30, 2024",
    betsPlaced: 142,
  },
  {
    id: "2",
    title: "Will the Fed cut interest rates in March 2024?",
    description: "Resolves YES if the Federal Reserve announces a rate cut at their March 2024 FOMC meeting.",
    category: "Finance",
    status: "Open",
    closingTime: "Mar 20, 2024",
    betsPlaced: 89,
  },
  {
    id: "3",
    title: "Will Manchester City win the Premier League 2023-24?",
    description: "Resolves YES if Manchester City wins the 2023-24 English Premier League title.",
    category: "Sports",
    status: "Open",
    closingTime: "May 19, 2024",
    betsPlaced: 234,
  },
  {
    id: "4",
    title: "Will Ethereum upgrade to full sharding in 2024?",
    description: "Resolves YES if Ethereum successfully implements full sharding on mainnet before December 31, 2024.",
    category: "Crypto",
    status: "Open",
    closingTime: "Dec 31, 2024",
    betsPlaced: 67,
  },
  {
    id: "5",
    title: "Will the Oscar for Best Picture go to Oppenheimer?",
    description: "Resolves YES if Oppenheimer wins the Academy Award for Best Picture at the 2024 ceremony.",
    category: "Entertainment",
    status: "Settled",
    closingTime: "Mar 10, 2024",
    betsPlaced: 312,
    outcome: "Yes",
  },
  {
    id: "6",
    title: "Will there be a US government shutdown in Q1 2024?",
    description: "Resolves YES if the US federal government experiences a partial or full shutdown between January 1 and March 31, 2024.",
    category: "Politics",
    status: "Closed",
    closingTime: "Mar 31, 2024",
    betsPlaced: 156,
  },
];

export default function MarketsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);
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

      // Combine with mock data for demo purposes if no markets found
      if (mapped.length > 0) {
        setMarkets(mapped);
        setIsDemoData(false);
      } else {
        setMarkets(mockMarkets);
        setIsDemoData(true);
      }
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
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Prediction Markets</h1>
          <p className="text-muted-foreground">
            Browse and participate in private prediction markets
          </p>
          {isDemoData && (
            <Badge variant="outline" className="mt-2 bg-warning/10 text-warning border-warning/30">
              <AlertCircle className="w-3 h-3 mr-1" />
              Demo Mode: Using local mock data
            </Badge>
          )}
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

        {filteredMarkets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No markets found matching your criteria</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
