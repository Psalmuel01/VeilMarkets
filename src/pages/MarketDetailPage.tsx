import { useCallback, useEffect, useState } from "react";
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
  Loader2,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Activity,
  Zap,
  Lock
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
import { ADMIN_ADDRESS, resolveTokenDisplayName, resolveTokenTicker } from "@/lib/constants";
import { PoolInfo } from "@/lib/aleo";


const categoryStyles: Record<string, string> = {
  Sports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Finance: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Crypto: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Politics: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Entertainment: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  Tech: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Other: "text-slate-300 bg-slate-300/10 border-slate-300/20",
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
    category: string;
    status: string;
    closingTime: string;
    closingDate: string;
    betsPlaced: number;
    createdAt: string;
    resolutionSource: string;
    close_time: number;
    resolution_time: number;
    is_resolved: boolean;
    winningOutcome?: number;
    token_id: string;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [isOracle, setIsOracle] = useState<boolean | null>(null);
  const { fetchMarkets, fetchPoolStats, fetchResolutionProposal, fetchUserBets, resolveMarket, currentHeight, isOracleRegistered, refreshSignal, publicKey } = useAleoPrograms();

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
        const categoryRevMap: Record<number, string> = {
          0: "Crypto",
          1: "Finance",
          2: "Sports",
          3: "Politics",
          4: "Entertainment",
          5: "Tech",
          6: "Other",
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
          category: categoryRevMap[found.category] || "Other",
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
          token_id: found.token_id,
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
    if (!publicKey) return;
    const normalized = publicKey.replace(/address/g, "").trim().toLowerCase();
    const isAdminAddress = normalized === ADMIN_ADDRESS.toLowerCase();
    console.log("[MarketDetailPage] admin check:", { address: normalized, isAdmin: isAdminAddress });
  }, [publicKey]);

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

  const isAdmin = publicKey
    ? publicKey.replace(/address/g, "").trim().toLowerCase() === ADMIN_ADDRESS.toLowerCase()
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

  const marketTokenTicker = resolveTokenTicker(market.token_id);
  const marketTokenName = resolveTokenDisplayName(market.token_id);

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

        {/* Market Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 relative"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn("px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] border", categoryStyles[market.category as string] || categoryStyles.Other)}
                >
                  {market.category as string}
                </Badge>

                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    marketStatus === "Open" ? "bg-success" : "bg-warning"
                  )} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80">
                    {marketStatus}
                  </span>
                </div>

                <ZKBadge variant="proof" size="sm" />
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-[1.1] tracking-tight">
                {market.title}
              </h1>

              <div className="flex flex-wrap items-center gap-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className={cn(secondsRemaining !== null && secondsRemaining < 3600 ? "text-warning animate-pulse" : "text-white/80")}>
                    {timeRemainingStr}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="text-white/80 font-mono tracking-normal text-sm">{market.betsPlaced} <span className="text-[10px] font-semibold uppercase text-muted-foreground/40 font-sans tracking-widest ml-1">Participants</span></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-success" />
                  <span className="text-white/80">Verifiable ZK Proofs</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Global Probability Bar (New) */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-4 px-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-success/60 mb-1">Yes Outcome</span>
              <span className="text-3xl font-bold text-success font-mono">{yesPercent}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-destructive/60 mb-1">No Outcome</span>
              <span className="text-3xl font-bold text-destructive font-mono">{noPercent}%</span>
            </div>
          </div>
          <div className="h-4 w-full bg-white/[0.03] rounded-full border border-white/5 p-1 flex overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesPercent}%` }}
              className="h-full bg-gradient-to-r from-success/40 to-success rounded-l-full shadow-[0_0_20px_hsla(160,84%,45%,0.3)] transition-all duration-1000"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${noPercent}%` }}
              className="h-full bg-gradient-to-l from-destructive/40 to-destructive rounded-r-full shadow-[0_0_20px_hsla(0,84%,60%,0.3)] transition-all duration-1000"
            />
          </div>
        </div>

        {/* Market Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Total Volume", value: `${totalVolume.toLocaleString()}`, unit: marketTokenTicker, icon: Activity, color: "text-primary" },
            { label: "Pool Size", value: "Locked", unit: "ZK-POOL", icon: Lock, color: "text-accent" },
            { label: "Resolution", value: "Oracle", unit: "SOURCE", icon: Shield, color: "text-success" },
            { label: "Closing", value: market.closingDate, unit: "EST", icon: Calendar, color: "text-muted-foreground" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="glass-card p-5 rounded-3xl border border-white/5 group hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className={cn("p-2 rounded-xl bg-white/[0.03] border border-white/5", stat.color)}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-white font-mono">{stat.value}</span>
                <span className="text-[10px] font-bold text-muted-foreground/40">{stat.unit}</span>
              </div>
            </motion.div>
          ))}
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
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CheckCircle2 className="w-16 h-16 text-success" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Resolved Outcome
                </h2>
                <div className={cn(
                  "text-5xl font-bold font-mono tracking-tighter",
                  resolvedOutcomeLabel === "YES" ? "text-success" : resolvedOutcomeLabel === "NO" ? "text-destructive" : "text-white/40"
                )}>
                  {resolvedOutcomeLabel}
                </div>

                {userBetOutcome && (
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Your Selection</span>
                      <span className="text-white font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/10">{userBetOutcome}</span>
                    </div>
                    {userBetResult && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Result</span>
                        <div className={cn(
                          "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          userBetResult === "Won" ? "bg-success/20 text-success border border-success/30" :
                            userBetResult === "Lost" ? "bg-destructive/20 text-destructive border border-destructive/30" :
                              "bg-white/10 text-white/40 border border-white/10"
                        )}>
                          {userBetResult}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Description Card */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Market Context
              </h2>
              <p className="text-white/80 leading-relaxed text-lg font-medium mb-6">
                {market.description}
              </p>
              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Data Source</span>
                    <span className="text-sm font-bold text-white/90">{market.resolutionSource}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Settlement Token</span>
                    <span className="text-sm font-semibold text-primary/90">{marketTokenName}</span>
                    <span className="text-[10px] font-mono text-primary/60">{market.token_id.slice(0, 8)}...{market.token_id.slice(-4)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome Selection */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
              {/* Decorative Gradient */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />

              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Available Outcomes
              </h2>
              <div className="flex gap-6">
                <OutcomeCard
                  outcome="Yes"
                  selected={false}
                  onSelect={() => { if (!hasUserBet && marketStatus === "Open") setShowBetModal(true); }}
                  disabled={marketStatus !== "Open"} //  || hasUserBet
                />
                <OutcomeCard
                  outcome="No"
                  selected={false}
                  onSelect={() => { if (!hasUserBet && marketStatus === "Open") setShowBetModal(true); }}
                  disabled={marketStatus !== "Open"} //  || hasUserBet
                />
              </div>

              {marketStatus !== "Open" && (
                <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    Bidding period has concluded
                  </p>
                </div>
              )}
            </div>

            {/* Activity Table */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-success" />
                Market Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Total Cumulative Bets</span>
                  <span className="text-2xl font-bold text-white font-mono">{market.betsPlaced}</span>
                </div>
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Aggregated Volume</span>
                  <span className="text-2xl font-bold text-primary font-mono">{totalVolume.toLocaleString()} {marketTokenTicker}</span>
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
            {/* User Position Status */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
              {/* Animated Background Pulse */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all duration-500 rounded-full" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Your Position</h2>
                <ZKBadge variant="encrypted" size="sm" />
              </div>

              {hasUserBet ? (
                <div className="space-y-6 relative z-10">
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 font-mono">Prediction</span>
                      <span className="font-mono encrypted-text text-white">{userBetOutcome ?? "Hidden"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 font-mono">Wager Size</span>
                      <span className="font-mono encrypted-text text-white">•••••• {marketTokenTicker}</span>
                    </div>
                  </div>
                  {marketStatus === "Settled" && userBetResult && (
                    <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5">
                      <span className="text-xs font-bold text-muted-foreground/60">Final Outcome</span>
                      <span className={cn(
                        "text-sm font-black uppercase tracking-widest",
                        userBetResult === "Won" ? "text-success" : userBetResult === "Lost" ? "text-destructive" : "text-white"
                      )}>
                        {userBetResult}
                      </span>
                    </div>
                  )}
                  <ZKBadge variant="proof" className="w-full justify-center py-4 rounded-2xl bg-primary/10 text-primary border border-primary/20" />
                </div>
              ) : !publicKey ? (
                <div className="text-center py-10 space-y-6 relative z-10">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Shield className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium max-w-[180px] mx-auto">
                    Link your wallet to access private position data
                  </p>
                  <ConnectWalletButton className="w-full justify-center" />
                </div>
              ) : (
                <div className="text-center py-10 space-y-6 relative z-10">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    No active position detected
                  </p>
                  <Button
                    onClick={() => setShowBetModal(true)}
                    disabled={marketStatus !== "Open"}
                    className="w-full btn-premium h-14 rounded-2xl group"
                  >
                    <span>Place Bet</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              )}
            </div>

            {/* Resolution Mechanics */}
            {publicKey && (
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-success/5 blur-3xl rounded-full" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Resolution</h2>
                  <ZKBadge variant="verified" size="sm" />
                </div>

                <div className="space-y-6 relative z-10">
                  {proposal ? (
                    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Proposed Outcome</span>
                        <div className={cn(
                          "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          proposal.proposed_outcome === 1 ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"
                        )}>
                          {proposal.proposed_outcome === 1 ? "YES" : "NO"}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Window Status</span>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.1em]",
                          proposal.is_disputed ? "text-destructive" : (currentHeight && currentHeight >= proposal.challenge_deadline) ? "text-white/40" : "text-amber-500"
                        )}>
                          {proposal.is_disputed ? "Disputed" : (currentHeight && currentHeight >= proposal.challenge_deadline) ? "Closed" : "Active"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {marketStatus === "Settled"
                        ? "Final resolution recorded on-chain."
                        : market?.resolution_time && nowTs < market.resolution_time
                          ? `Proposals will be accepted after ${formatDateFriendly(market.resolution_time)}.`
                          : "Oracle nodes may now submit a resolution proposal."
                      }
                    </p>
                  )}

                  <Button
                    onClick={() => {
                      if (marketStatus !== "Settled") setShowResolutionModal(true);
                    }}
                    className={cn(
                      "w-full h-14 rounded-2xl font-bold transition-all duration-300",
                      proposal ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white" : "btn-premium"
                    )}
                    disabled={marketStatus === "Settled" || !!proposal || (market?.resolution_time ? nowTs < market.resolution_time : false)}
                  >
                    {marketStatus === "Settled" ? "Finalized" : (proposal ? "Proposal Submitted" : "Propose Resolution")}
                  </Button>

                  {proposal && marketStatus !== "Settled" && (
                    <Button
                      variant="link"
                      className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-white"
                      onClick={() => setShowResolutionModal(true)}
                    >
                      Manage Resolution
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
                      className="w-full btn-premium bg-gradient-to-r from-success/80 to-success hover:from-success hover:to-success/90 h-14 rounded-2xl"
                      disabled={!proposal || !isFinalizable || proposal.is_disputed || marketStatus === "Settled"}
                    >
                      Resolve Market
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Compliance Info */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Privacy Standard</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Double-blind encryption for all wager amounts",
                  "Anonymized participant identities via ZK-SNARKs",
                  "Immutable on-chain verification without data leaks"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shadow-[0_0_8px_hsla(160,84%,45%,0.5)]" />
                    <span className="text-xs font-medium text-muted-foreground/80 leading-relaxed">{item}</span>
                  </li>
                ))}
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
        tokenId={market.token_id}
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
