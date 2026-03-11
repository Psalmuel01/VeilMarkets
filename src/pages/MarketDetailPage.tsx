import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  ArrowLeft,
  Shield,
  Calendar,
  Info,
  AlertCircle
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { OutcomeCard } from "@/components/betting/OutcomeCard";
import { PlaceBetModal } from "@/components/betting/PlaceBetModal";
import { ResolutionModal } from "@/components/resolution/ResolutionModal";
import { cn } from "@/lib/utils";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { PoolInfo } from "@/lib/aleo";


const categoryColors = {
  Sports: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Finance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Crypto: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Politics: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Entertainment: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  Tech: "bg-green-500/10 text-green-400 border-green-500/30",
};

const statusColors = {
  Open: "bg-success/10 text-success border-success/30",
  Closed: "bg-warning/10 text-warning border-warning/30",
  Settled: "bg-primary/10 text-primary border-primary/30",
};

export default function MarketDetailPage() {
  const { id } = useParams();
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [hasUserBet, setHasUserBet] = useState(false);
  const [proposal, setProposal] = useState<{
    proposed_outcome: number;
    challenge_deadline: number;
    is_disputed: boolean;
    proposer: string;
  } | null>(null);
  const [market, setMarket] = useState<{
    id: string;
    title: string;
    description: string;
    category: keyof typeof categoryColors;
    status: keyof typeof statusColors;
    closingTime: string;
    closingDate: string;
    betsPlaced: number;
    createdAt: string;
    resolutionSource: string;
    closeBlock?: number;
    resolutionBlock?: number;
    is_resolved: boolean;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [isOracle, setIsOracle] = useState<boolean | null>(null);
  const { fetchMarkets, fetchPoolStats, fetchResolutionProposal, currentHeight, isOracleRegistered } = useAleoPrograms();

  useEffect(() => {
    const loadMarket = async () => {
      if (!id) {
        setNotFound(true);
        setLoadingMarket(false);
        return;
      }
      setLoadingMarket(true);

      try {
        const [allMarkets, stats, oracleStatus] = await Promise.all([
          fetchMarkets(),
          fetchPoolStats(id),
          isOracleRegistered()
        ]);

        setPool(stats);
        setIsOracle(oracleStatus);

        // Flexible matching: check against market.id OR market.transactionId
        const cleanId = (sid: string) => (sid || "").replace("field", "").trim();
        const currentId = cleanId(id);

        const found = allMarkets.find((chainMarket) =>
          cleanId(chainMarket.id) === currentId || cleanId(chainMarket.transactionId ?? "") === currentId
        );

        if (found) {
          const categoryRevMap: Record<number, keyof typeof categoryColors> = {
            0: "Crypto",
            1: "Finance",
            2: "Sports",
            3: "Politics",
            4: "Entertainment",
            5: "Tech",
          };

          setMarket({
            id: found.id,
            title: found.title,
            description: found.description,
            category: categoryRevMap[found.category] || "Tech",
            status: found.is_resolved ? "Settled" : "Open",
            closingTime: `Block ${found.close_block}`,
            closingDate: "On-chain block time",
            betsPlaced: stats?.participant_count || 0,
            createdAt: "On-chain",
            resolutionSource: found.source || "Creator",
            closeBlock: found.close_block,
            resolutionBlock: found.resolution_block || found.close_block + 100, // Fallback if 0
            is_resolved: found.is_resolved,
          });
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error loading market details:", error);
      } finally {
        setLoadingMarket(false);
      }
    };

    const loadProposal = async () => {
      if (!id) return;
      const p = await fetchResolutionProposal(id);
      setProposal(p);
    };

    loadMarket();
    loadProposal();
  }, [id, fetchMarkets, fetchPoolStats, fetchResolutionProposal]);

  // Calculate status
  const isSettled = !!market?.is_resolved;
  const isClosed = !isSettled && currentHeight && market?.closeBlock && currentHeight >= market.closeBlock;
  const marketStatus = isSettled ? "Settled" : isClosed ? "Closed" : "Open";

  // Calculate stats
  const totalVolume = pool ? (pool.total_yes + pool.total_no) / 1_000_000 : 0;
  const yesPercent = pool && (pool.total_yes + pool.total_no) > 0
    ? Math.round((pool.total_yes / (pool.total_yes + pool.total_no)) * 100)
    : 50;
  const noPercent = 100 - yesPercent;

  // Countdown logic
  const blocksRemaining = market?.closeBlock && currentHeight ? market.closeBlock - currentHeight : null;
  const timeRemainingStr = blocksRemaining !== null && blocksRemaining > 0
    ? `~${Math.round((blocksRemaining * 15) / 60)} mins remaining`
    : blocksRemaining !== null && blocksRemaining <= 0 ? "Expired" : "Loading...";

  if (notFound) {
    return (
      <MainLayout requireWallet={true}>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Market Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find a market with ID: {id}
          </p>
          <Button asChild variant="outline">
            <Link to="/markets">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Markets
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (loadingMarket) {
    return (
      <MainLayout requireWallet={true}>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading market details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!market) return null;

  return (
    <MainLayout requireWallet={true}>
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
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-1 text-xs font-bold tracking-wider uppercase border-none bg-opacity-20",
                  marketStatus === "Open" ? "bg-success text-success-foreground" : 
                  marketStatus === "Closed" ? "bg-warning text-warning-foreground" : 
                  "bg-muted text-muted-foreground"
                )}
              >
                {marketStatus}
              </Badge>
              <ZKBadge variant="proof" size="sm" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">{market.title}</h1>


          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className={cn(blocksRemaining !== null && blocksRemaining < 100 ? "text-warning" : "")}>
                {timeRemainingStr} ({market.closingTime})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{market.betsPlaced} participants</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Created: {market.createdAt}</span>
            </div>
          </div>
        </motion.div>

        {/* Analytics Overview (New) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Yes Ratio</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-success">{yesPercent}%</span>
              <span className="text-xs text-muted-foreground mb-1">Implied Probability</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${yesPercent}%` }} />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">No Ratio</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-destructive">{noPercent}%</span>
              <span className="text-xs text-muted-foreground mb-1">Implied Probability</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-destructive" style={{ width: `${noPercent}%` }} />
            </div>
          </div>
        </div>

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
                  disabled={marketStatus !== "Open"}
                />
                <OutcomeCard
                  outcome="No"
                  selected={false}
                  onSelect={() => setShowBetModal(true)}
                  disabled={marketStatus !== "Open"}
                />
              </div>

              {marketStatus !== "Open" && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  This market is no longer accepting bets
                </p>
              )}
            </div>

            {/* Activity (Abstract) */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h2 className="text-lg font-semibold mb-4">Market Activity</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Total Bets</span>
                  <span className="font-medium">{market.betsPlaced}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Total Volume</span>
                  <span className="font-mono text-primary">{totalVolume.toLocaleString()} ALEO</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span className="text-sm">Recently</span>
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
                    disabled={marketStatus !== "Open"}
                    className="w-full btn-glow-primary"
                  >
                    Place Private Bet
                  </Button>
                </div>
              )}
            </div>

            {/* Resolution Control (Propose/Dispute/Finalize) */}
            {((market.closeBlock && currentHeight && currentHeight >= market.closeBlock) || proposal) && (marketStatus === "Closed" || marketStatus === "Settled") && (
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Resolution</h2>
                  <ZKBadge variant="verified" size="sm" />
                </div>
                
                <div className="space-y-3">
                  {proposal ? (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Proposed Outcome</span>
                        <span className={cn("font-bold", proposal.proposed_outcome === 1 ? "text-success" : "text-destructive")}>
                          {proposal.proposed_outcome === 1 ? "YES" : "NO"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Challenge Window</span>
                        <span className="text-amber-500 font-medium">
                          {proposal.is_disputed ? "Disputed" : (currentHeight && currentHeight >= proposal.challenge_deadline) ? "Ended" : "Active"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This market is entering its resolution phase. Oracles can now propose the true outcome.
                    </p>
                  )}

                  <Button 
                    onClick={() => setShowResolutionModal(true)}
                    className="w-full btn-glow-primary"
                    variant={proposal ? "outline" : "default"}
                  >
                    {proposal ? "Manage Resolution" : "Propose Resolution"}
                  </Button>
                </div>
              </div>
            )}

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
          </motion.div>
        </div>
      </div>

      <PlaceBetModal
        open={showBetModal}
        onClose={() => setShowBetModal(false)}
        onBetPlaced={() => setHasUserBet(true)}
        marketTitle={market.title}
        marketId={market.id}
      />
      
      <ResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        market={{
          id: market.id,
          title: market.title,
          close_block: market.closeBlock || 0,
          resolution_block: market.resolutionBlock || 0,
        }}
        proposal={proposal}
        currentHeight={currentHeight || 0}
        isOracle={isOracle === true}
        onUpdate={async () => {
          if (!id) return;
          const [p, oracleStatus] = await Promise.all([
            fetchResolutionProposal(id),
            isOracleRegistered()
          ]);
          setProposal(p);
          setIsOracle(oracleStatus);
        }}
      />
    </MainLayout>
  );
}
