import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  ArrowLeft,
  Shield,
  Calendar,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { OutcomeCard } from "@/components/betting/OutcomeCard";
import { PlaceBetModal } from "@/components/betting/PlaceBetModal";
import { ResolutionModal } from "@/components/resolution/ResolutionModal";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDateFriendly } from "@/lib/utils";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { ADMIN_ADDRESS } from "@/lib/constants";
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
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeStep, setFinalizeStep] = useState<"confirm" | "processing" | "success" | "failed">("confirm");
  const [finalizeTxId, setFinalizeTxId] = useState<string | null>(null);
  const [hasUserBet, setHasUserBet] = useState(false);
  const [userBetOutcome, setUserBetOutcome] = useState<"Yes" | "No" | null>(null);
  const [userBetResult, setUserBetResult] = useState<"Won" | "Lost" | "Cancelled" | null>(null);
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
    close_time: number;
    resolution_time: number;
    is_resolved: boolean;
    winningOutcome?: number;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [isOracle, setIsOracle] = useState<boolean | null>(null);
  const { fetchMarkets, fetchPoolStats, fetchResolutionProposal, fetchUserBets, resolveMarket, currentHeight, isOracleRegistered, refreshSignal } = useAleoPrograms();
  const { address } = useWallet();

  const loadMarket = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) {
      setNotFound(true);
      if (!opts?.silent) setLoadingMarket(false);
      return;
    }
    if (!opts?.silent) setLoadingMarket(true);

    try {
      const [allMarkets, stats, oracleStatus, userBets] = await Promise.all([
        fetchMarkets(),
        fetchPoolStats(id),
        isOracleRegistered(),
        fetchUserBets()
      ]);

      setPool(stats);
      setIsOracle(oracleStatus);

      // Flexible matching: check against market.id OR market.transactionId
      const cleanId = (sid: string) => (sid || "").replace("field", "").trim();
      const currentId = cleanId(id);

      const found = allMarkets.find((chainMarket) =>
        cleanId(chainMarket.id) === currentId
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

        const userBet = userBets.find((b) => cleanId(b.market_id) === currentId);
        if (userBet) {
          setHasUserBet(true);
          const outcomeLabel = userBet.outcome === "1" ? "Yes" : "No";
          setUserBetOutcome(outcomeLabel);
          if (found.is_resolved) {
            if (found.winning_outcome === 3) {
              setUserBetResult("Cancelled");
            } else if (found.winning_outcome === (userBet.outcome === "1" ? 1 : 0)) {
              setUserBetResult("Won");
            } else {
              setUserBetResult("Lost");
            }
          } else {
            setUserBetResult(null);
          }
        } else {
          setHasUserBet(false);
          setUserBetOutcome(null);
          setUserBetResult(null);
        }

        setMarket({
          id: found.id,
          title: found.title,
          description: found.description,
          category: categoryRevMap[found.category] || "Tech",
          status: found.is_resolved ? "Settled" : "Open",
          closingTime: formatDateFriendly(found.close_time),
          closingDate: new Date(found.close_time * 1000).toLocaleDateString(),
          betsPlaced: stats?.participant_count || 0,
          createdAt: "On-chain",
          resolutionSource: found.resolutionSource || "Creator",
          close_time: found.close_time,
          resolution_time: found.resolution_time || found.close_time + 3600, // Fallback if 0
          is_resolved: found.is_resolved,
          winningOutcome: found.winning_outcome,
        });
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error("Error loading market details:", error);
    } finally {
      if (!opts?.silent) setLoadingMarket(false);
    }
  }, [id, fetchMarkets, fetchPoolStats, fetchUserBets, isOracleRegistered]);

  const loadProposal = useCallback(async () => {
    if (!id) return;
    const p = await fetchResolutionProposal(id);
    setProposal(p);
    console.log("[MarketDetailPage] proposal:", p);
  }, [id, fetchResolutionProposal]);

  useEffect(() => {
    loadMarket();
    loadProposal();
  }, [loadMarket, loadProposal, refreshSignal]);

  useEffect(() => {
    if (!address) return;
    const normalized = address.replace(/address/g, "").trim().toLowerCase();
    const isAdminAddress = normalized === ADMIN_ADDRESS.toLowerCase();
    console.log("[MarketDetailPage] admin check:", { address: normalized, isAdmin: isAdminAddress });
  }, [address]);

  // Calculate status
  const nowTs = Math.floor(Date.now() / 1000);
  const isSettled = !!market?.is_resolved;
  const isClosed = !isSettled && market?.close_time && nowTs >= market.close_time;
  const marketStatus = isSettled ? "Settled" : isClosed ? "Closed" : "Open";

  // Calculate stats
  const totalVolume = pool ? (pool.total_yes + pool.total_no) / 1_000_000 : 0;
  const yesPercent = pool && (pool.total_yes + pool.total_no) > 0
    ? Math.round((pool.total_yes / (pool.total_yes + pool.total_no)) * 100)
    : 50;
  const noPercent = 100 - yesPercent;

  const resolvedOutcomeLabel =
    market?.winningOutcome === 1 ? "YES" :
      market?.winningOutcome === 0 ? "NO" :
        market?.winningOutcome === 3 ? "CANCELLED" :
          null;

  const isAdmin = address
    ? address.replace(/address/g, "").trim().toLowerCase() === ADMIN_ADDRESS.toLowerCase()
    : false;
  const isFinalizable = proposal && (!proposal.is_disputed ? nowTs >= proposal.challenge_deadline : true);

  // Countdown logic
  const secondsRemaining = market?.close_time && nowTs
    ? market.close_time - nowTs
    : null;

  const timeRemainingStr = (() => {
    if (secondsRemaining === null) return "Loading...";
    if (secondsRemaining <= 0) return "Expired";

    const totalSeconds = secondsRemaining;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  })();

  const handleFinalize = async () => {
    if (!proposal) return;
    setFinalizeStep("processing");
    const outcome = proposal.proposed_outcome;
    const tx = await resolveMarket(market.id, outcome);
    if (tx) {
      setFinalizeTxId(tx);
      setFinalizeStep("success");
      await Promise.all([loadMarket({ silent: true }), loadProposal()]);
    } else {
      setFinalizeStep("failed");
    }
  };

  if (notFound) {
    return (
      <MainLayout>
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
      <MainLayout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading market details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!market) return null;

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
              <span className={cn(secondsRemaining !== null && secondsRemaining < 3600 ? "text-warning" : "")}>
                {timeRemainingStr}
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
            {marketStatus === "Settled" && resolvedOutcomeLabel && (
              <div className="p-6 rounded-xl bg-card border border-border/50">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Resolved Outcome
                </h2>
                <div className={`text-3xl font-bold ${resolvedOutcomeLabel === "YES" ? "text-success" : resolvedOutcomeLabel === "NO" ? "text-destructive" : "text-muted-foreground"}`}>
                  {resolvedOutcomeLabel}
                </div>
                {userBetOutcome && (
                  <div className="mt-4 pt-4 border-t border-border/50 text-sm flex justify-between">
                    <span className="text-muted-foreground">Your Bet</span>
                    <span className="font-medium">{userBetOutcome}</span>
                  </div>
                )}
                {userBetResult && (
                  <div className="mt-2 text-sm flex justify-between">
                    <span className="text-muted-foreground">Your Result</span>
                    <span className={`font-semibold ${userBetResult === "Won" ? "text-success" : userBetResult === "Lost" ? "text-destructive" : "text-muted-foreground"}`}>
                      {userBetResult}
                    </span>
                  </div>
                )}
              </div>
            )}

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
                      <span className="font-mono encrypted-text">{userBetOutcome ?? "Hidden"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono encrypted-text">•••••• ALEO</span>
                    </div>
                  </div>
                  {marketStatus === "Settled" && userBetResult && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Result</span>
                      <span className={`font-semibold ${userBetResult === "Won" ? "text-success" : userBetResult === "Lost" ? "text-destructive" : "text-muted-foreground"}`}>
                        {userBetResult}
                      </span>
                    </div>
                  )}
                  <ZKBadge variant="proof" className="w-full justify-center py-2" />
                </div>
              ) : !address ? (
                <div className="text-center py-6 space-y-3">
                  <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Connect your wallet to place a bet or view your position
                  </p>
                  <ConnectWalletButton className="w-full justify-center" />
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
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Resolution</h2>
                <ZKBadge variant="verified" size="sm" />
              </div>

              <div className="space-y-3">
                {proposal ? (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Resolution Already Proposed</span>
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
                    {marketStatus === "Settled"
                      ? "This market is resolved."
                      : market?.resolution_time && nowTs < market.resolution_time
                        ? `Proposals open ${formatDateFriendly(market.resolution_time)}.`
                        : "Oracles can now propose the true outcome."
                    }
                  </p>
                )}

                {!address ? (
                  <ConnectWalletButton className="w-full justify-center" />
                ) : (
                  <Button
                    onClick={() => {
                      if (marketStatus !== "Settled") setShowResolutionModal(true);
                    }}
                    className="w-full btn-glow-primary"
                    variant={proposal ? "outline" : "default"}
                    disabled={marketStatus === "Settled" || !!proposal || (market?.resolution_time ? nowTs < market.resolution_time : false)}
                  >
                    {marketStatus === "Settled" ? "Resolved" : (proposal ? "Resolution Proposed" : "Propose Resolution")}
                  </Button>
                )}

                {proposal && marketStatus !== "Settled" && (
                  <Button
                    variant="link"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowResolutionModal(true)}
                  >
                    Manage / Dispute Resolution
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    onClick={() => {
                      if (proposal) {
                        setFinalizeStep("confirm");
                        setShowFinalizeModal(true);
                      }
                    }}
                    className="w-full btn-glow-success"
                    disabled={!proposal || !isFinalizable || proposal.is_disputed || marketStatus === "Settled"}
                  >
                    Resolve Market
                  </Button>
                )}

                {isAdmin && proposal && !isFinalizable && !proposal.is_disputed && (
                  <p className="text-[10px] text-center text-muted-foreground">
                    Challenge window active until {formatDateFriendly(proposal.challenge_deadline)}.
                  </p>
                )}

                {isAdmin && !proposal && (
                  <p className="text-[10px] text-center text-muted-foreground">
                    A resolution proposal is required before finalization.
                  </p>
                )}
              </div>
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
          close_block: market.close_time || 0,
          resolution_block: market.resolution_time || 0,
          is_resolved: market.is_resolved,
        } as any}
        proposal={proposal}
        nowTs={nowTs}
        isOracle={isOracle}
        onUpdate={async () => {
          await Promise.all([loadMarket({ silent: true }), loadProposal()]);
        }}
      />

      <Dialog
        open={showFinalizeModal}
        onOpenChange={(open) => {
          setShowFinalizeModal(open);
          if (!open) {
            setFinalizeStep("confirm");
            setFinalizeTxId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Resolve Market</DialogTitle>
          </DialogHeader>

          {finalizeStep === "confirm" && (
            <div className="space3">
              <p className="text-sm text-muted-foreground">
                You are about to finalize this market with the proposed outcome.
              </p>
              {proposal && (
                <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-sm flex justify-between">
                  <span className="text-muted-foreground">Proposed Outcome</span>
                  <span className={cn("font-bold", proposal.proposed_outcome === 1 ? "text-success" : "text-destructive")}>
                    {proposal.proposed_outcome === 1 ? "YES" : "NO"}
                  </span>
                </div>
              )}
              {proposal && !proposal.is_disputed && nowTs < proposal.challenge_deadline && (
                <p className="text-xs text-amber-500">
                  Challenge window active until {formatDateFriendly(proposal.challenge_deadline)}. Finalization may fail if submitted early.
                </p>
              )}
              <Button onClick={handleFinalize} className="w-full btn-glow-success" disabled={!proposal}>
                Confirm Resolve
              </Button>
            </div>
          )}

          {finalizeStep === "processing" && (
            <div className="py-12 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Resolving Market</h3>
                <p className="text-sm text-muted-foreground">
                  Submitting final resolution transaction...
                </p>
              </div>
            </div>
          )}

          {finalizeStep === "success" && (
            <div className="py-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Market Resolved!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The final outcome has been submitted to the network.
                </p>
              </div>
              {finalizeTxId && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Transaction ID</div>
                  <code className="text-sm font-mono text-primary break-all">
                    {finalizeTxId}
                  </code>
                </div>
              )}
              <Button onClick={() => setShowFinalizeModal(false)} className="w-full">
                Close
              </Button>
            </div>
          )}

          {finalizeStep === "failed" && (
            <div className="py-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Resolution Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The transaction was rejected or timed out.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setFinalizeStep("confirm")} className="flex-1">
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
