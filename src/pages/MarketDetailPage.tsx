import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Clock, 
  Users, 
  ArrowLeft, 
  Shield,
  ExternalLink,
  Calendar,
  Info
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { OutcomeCard } from "@/components/betting/OutcomeCard";
import { PlaceBetModal } from "@/components/betting/PlaceBetModal";
import { cn } from "@/lib/utils";

// Mock data - in a real app this would come from an API
const mockMarketDetail = {
  id: "1",
  title: "Will Bitcoin reach $100,000 by end of Q2 2024?",
  description: "This market resolves YES if Bitcoin's price exceeds $100,000 USD on any major exchange (Coinbase, Binance, Kraken) before June 30, 2024 at 11:59 PM UTC. Price must be sustained for at least 1 minute. Data source: CoinGecko aggregate price.",
  category: "Crypto",
  status: "Open" as const,
  closingTime: "Jun 30, 2024",
  closingDate: "2024-06-30T23:59:59Z",
  betsPlaced: 142,
  createdAt: "Jan 15, 2024",
  resolutionSource: "CoinGecko",
};

const categoryColors = {
  Sports: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Finance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Crypto: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Politics: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Entertainment: "bg-pink-500/10 text-pink-400 border-pink-500/30",
};

const statusColors = {
  Open: "bg-success/10 text-success border-success/30",
  Closed: "bg-warning/10 text-warning border-warning/30",
  Settled: "bg-primary/10 text-primary border-primary/30",
};

export default function MarketDetailPage() {
  const { id } = useParams();
  const [showBetModal, setShowBetModal] = useState(false);
  const [hasUserBet, setHasUserBet] = useState(false);

  // In a real app, fetch market by id
  const market = mockMarketDetail;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Navigation */}
        <Link 
          to="/markets"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        {/* Market Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Badge 
              variant="outline" 
              className={cn("text-xs uppercase tracking-wider", categoryColors[market.category as keyof typeof categoryColors])}
            >
              {market.category}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn("text-xs uppercase tracking-wider", statusColors[market.status])}
            >
              {market.status}
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">{market.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Closes: {market.closingTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{market.betsPlaced} bets placed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Created: {market.createdAt}</span>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Description */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Market Details
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {market.description}
              </p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resolution Source</span>
                  <span className="font-medium">{market.resolutionSource}</span>
                </div>
              </div>
            </div>

            {/* Outcome Selection */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-lg font-semibold mb-4">Outcomes</h2>
              <div className="flex gap-4">
                <OutcomeCard
                  outcome="Yes"
                  selected={false}
                  onSelect={() => setShowBetModal(true)}
                  disabled={market.status !== "Open"}
                />
                <OutcomeCard
                  outcome="No"
                  selected={false}
                  onSelect={() => setShowBetModal(true)}
                  disabled={market.status !== "Open"}
                />
              </div>
              
              {market.status !== "Open" && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  This market is no longer accepting bets
                </p>
              )}
            </div>

            {/* Activity (Abstract) */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-lg font-semibold mb-4">Market Activity</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Total Bets</span>
                  <span className="font-medium">{market.betsPlaced}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Total Volume</span>
                  <span className="font-mono encrypted-text">•••••• ALEO</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span className="text-sm">2 hours ago</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Bet Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* User's Bet Status */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Position</h2>
                <ZKBadge variant="encrypted" size="sm" />
              </div>

              {hasUserBet ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Your Bet</span>
                      <span className="font-mono encrypted-text">Hidden</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono encrypted-text">•••••• ALEO</span>
                    </div>
                  </div>
                  <ZKBadge variant="proof" className="w-full justify-center py-2" />
                </div>
              ) : (
                <div className="text-center py-6">
                  <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    You haven't placed a bet on this market yet
                  </p>
                  <Button 
                    onClick={() => setShowBetModal(true)}
                    disabled={market.status !== "Open"}
                    className="w-full btn-glow-primary"
                  >
                    Place Private Bet
                  </Button>
                </div>
              )}
            </div>

            {/* Privacy Info */}
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Privacy Protected
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Bet amounts are encrypted
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Your identity is hidden
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  All bets are verifiable on-chain
                </li>
              </ul>
            </div>

            {/* External Links */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h3 className="text-sm font-semibold mb-3">Verification</h3>
              <a 
                href="#" 
                className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View on Aleo Explorer</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      <PlaceBetModal
        open={showBetModal}
        onClose={() => {
          setShowBetModal(false);
          setHasUserBet(true);
        }}
        marketTitle={market.title}
      />
    </MainLayout>
  );
}
