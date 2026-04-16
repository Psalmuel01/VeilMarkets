import { useMemo, useState } from "react";
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
  Lock,
  Trash2,
  ShieldAlert,
  Scale,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { OutcomeCard } from "@/components/betting/OutcomeCard";
import { PlaceBetModal } from "@/components/betting/PlaceBetModal";
import { SellSharesModal } from "@/components/betting/SellSharesModal";
import { FundPoolModal } from "@/components/betting/FundPoolModal";
import { WithdrawLiquidityModal } from "@/components/betting/WithdrawLiquidityModal";
import { DisputeModal } from "@/components/betting/DisputeModal";
import { CancelMarketModal } from "@/components/betting/CancelMarketModal";
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
import { getOutcomeLabel, getOutcomeLabels, getOutcomeTone, isCancelledOutcome, normalizeOutcomeCount } from "@/lib/outcomes";
import {
  useMarketUserPositionQuery,
  useMarketPoolQuery,
  useMarketsQuery,
  useOutcomeTotalsQuery,
  useOracleStatusQuery,
  useResolutionProposalQuery,
  useResolveMarketMutation,
  useResolutionFinalizeRequirementsQuery,
  useUserBetsQuery,
  useCancelMarketMutation,
  useClaimWinningsMutation,
} from "@/hooks/useVeilQuery";
import { normalizeMarketIdKey } from "@/lib/queryKeys";

const categoryStyles: Record<string, string> = {
  Sports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Finance: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Crypto: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Politics: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Entertainment: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  Tech: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Other: "text-slate-300 bg-slate-300/10 border-slate-300/20",
};

const categoryRevMap: Record<number, string> = {
  0: "Crypto",
  1: "Finance",
  2: "Sports",
  3: "Politics",
  4: "Entertainment",
  5: "Tech",
  6: "Other",
};

export default function MarketDetailPage() {
  const { id } = useParams();
  const [showBetModal, setShowBetModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellOutcome, setSellOutcome] = useState<number | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeStep, setFinalizeStep] = useState<"confirm" | "processing" | "success" | "failed">("confirm");
  const [finalizeTxId, setFinalizeTxId] = useState<string | null>(null);

  const { publicKey } = useAleoPrograms();
  const resolveMutation = useResolveMarketMutation();
  const cancelMutation = useCancelMarketMutation();

  const { data: allMarkets = [], isLoading: isMarketsLoading } = useMarketsQuery();
  const normalizedRouteId = normalizeMarketIdKey(id ?? "");
  const foundMarket = useMemo(
    () => allMarkets.find((market) => normalizeMarketIdKey(market.id) === normalizedRouteId),
    [allMarkets, normalizedRouteId],
  );
  const { data: pool } = useMarketPoolQuery(id, true, foundMarket?.program_id);
  const { data: proposal = null } = useResolutionProposalQuery(id);
  const { data: userBets = [] } = useUserBetsQuery();
  const { data: isOracle = false } = useOracleStatusQuery();

  const { data: finalizeRequirements = null } = useResolutionFinalizeRequirementsQuery(
    id,
    foundMarket?.outcome_count ?? 2,
    Boolean(foundMarket && proposal),
  );

  const normalizedOutcomeCount = normalizeOutcomeCount(foundMarket?.outcome_count ?? 2);
  const { data: outcomeTotalsData } = useOutcomeTotalsQuery(
    id,
    normalizedOutcomeCount,
    foundMarket?.program_id,
    Boolean(foundMarket),
  );

  const market = useMemo(() => {
    if (!foundMarket) return null;
    return {
      id: foundMarket.id,
      title: foundMarket.title,
      description: foundMarket.description,
      category: categoryRevMap[foundMarket.category] || "Other",
      status: foundMarket.is_resolved ? "Settled" : "Open",
      closingTime: formatDateFriendly(foundMarket.close_time),
      closingDate: new Date(foundMarket.close_time * 1000).toLocaleDateString(),
      betsPlaced: pool?.trader_count || pool?.participant_count || 0,
      createdAt: "On-chain",
      resolutionSource: foundMarket.resolutionSource || "Creator",
      close_time: foundMarket.close_time,
      resolution_time: foundMarket.resolution_time || foundMarket.close_time + 3600,
      is_resolved: foundMarket.is_resolved,
      market_type: foundMarket.market_type,
      outcome_count: foundMarket.outcome_count,
      outcome_labels: foundMarket.outcome_labels ?? [],
      winningOutcome: foundMarket.winning_outcome,
      token_id: foundMarket.token_id,
      creator: foundMarket.creator,
    };
  }, [foundMarket, pool?.participant_count, pool?.trader_count]);

  const userBet = useMemo(
    () => userBets.find((entry) => normalizeMarketIdKey(entry.market_id) === normalizedRouteId),
    [normalizedRouteId, userBets],
  );

  const hasUserBet = Boolean(userBet);
  const numericUserOutcome = userBet ? Number.parseInt(userBet.outcome, 10) : null;
  const userBetOutcome =
    userBet && market && Number.isFinite(numericUserOutcome)
      ? getOutcomeLabel(
        market.market_type,
        market.outcome_count,
        numericUserOutcome as number,
        market.outcome_labels,
      )
      : null;
  const userBetResult: "Won" | "Lost" | "Cancelled" | null =
    userBet && market?.is_resolved && Number.isFinite(numericUserOutcome)
      ? isCancelledOutcome(market.winningOutcome)
        ? "Cancelled"
        : market.winningOutcome === (numericUserOutcome as number)
          ? "Won"
          : "Lost"
      : null;
  const { data: userPosition } = useMarketUserPositionQuery(
    id,
    null,
    Boolean(publicKey && id),
    foundMarket?.program_id,
  );
  const sellableOutcomeEntries = useMemo(
    () =>
      Object.entries(userPosition?.outcomeShares ?? {})
        .map(([outcomeKey, shares]) => ({
          outcome: Number.parseInt(outcomeKey, 10),
          shares: Number.isFinite(shares) ? shares : 0,
        }))
        .filter((entry) => Number.isFinite(entry.outcome) && entry.shares > 0)
        .sort((a, b) => b.shares - a.shares),
    [userPosition?.outcomeShares],
  );
  const defaultSellOutcome =
    sellOutcome !== null ? sellOutcome : sellableOutcomeEntries[0]?.outcome ?? null;
  const lpShares = userPosition?.lpShares ?? 0;
  const lpCollateral = (userPosition?.lpCollateral ?? 0) / 1_000_000;
  const lpFeeAccrued = (userPosition?.lpFeeAccrued ?? 0) / 1_000_000;
  const lpWithdrawable = (userPosition?.lpWithdrawable ?? 0) / 1_000_000;

  const notFound = Boolean(id) && !isMarketsLoading && !foundMarket;
  const loadingMarket = !id || (isMarketsLoading && !foundMarket);

  const nowTs = Math.floor(Date.now() / 1000);
  const isSettled = !!market?.is_resolved;
  const isCancelled = isSettled && isCancelledOutcome(market?.winningOutcome);
  const isClosed = !isSettled && market?.close_time && nowTs >= market.close_time;
  const marketStatus = isCancelled ? "Cancelled" : isSettled ? "Settled" : isClosed ? "Resolving" : "Open";
  const outcomeLabels = getOutcomeLabels(market?.market_type ?? 0, normalizedOutcomeCount, market?.outcome_labels);

  const outcomeTotals =
    outcomeTotalsData ?? Array.from({ length: normalizedOutcomeCount }, () => 0);
  const activeOutcomeTotals = outcomeTotals.slice(0, normalizedOutcomeCount);
  const totalPoolMicro = activeOutcomeTotals.reduce((acc, value) => acc + value, 0);
  const sharesOutstanding = totalPoolMicro / 1_000_000;
  const activeCollateral = (pool?.total_collateral ?? 0) / 1_000_000;
  const cumulativeVolume = (pool?.cumulative_volume ?? 0) / 1_000_000;
  const outcomePercents = activeOutcomeTotals.map((amount) =>
    totalPoolMicro > 0 ? Math.round((amount / totalPoolMicro) * 100) : Math.round(100 / normalizedOutcomeCount),
  );

  const resolvedOutcomeLabel = isCancelledOutcome(market?.winningOutcome)
    ? "CANCELLED"
    : getOutcomeLabel(market?.market_type ?? 0, normalizedOutcomeCount, market?.winningOutcome, market?.outcome_labels);
  const resolvedOutcomeTone = isCancelledOutcome(market?.winningOutcome)
    ? "neutral"
    : getOutcomeTone(market?.market_type ?? 0, normalizedOutcomeCount, market?.winningOutcome ?? 0);

  const finalizationOutcome =
    proposal?.is_disputed
      ? (finalizeRequirements?.recommendedOutcome ?? null)
      : (proposal?.proposed_outcome ?? null);
  const isFinalizable = Boolean(
    proposal &&
    marketStatus !== "Settled" &&
    finalizeRequirements?.canFinalize &&
    finalizationOutcome !== null,
  );

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
    if (!proposal || !market || finalizationOutcome === null) return;
    setFinalizeStep("processing");
    try {
      const txId = await resolveMutation.mutateAsync({
        marketId: market.id,
        outcome: finalizationOutcome,
      });
      setFinalizeTxId(txId);
      setFinalizeStep("success");
    } catch (_error) {
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
  const isMarketCreator = publicKey && market.creator === publicKey;
  const isAdmin = publicKey === ADMIN_ADDRESS;
  const hasBets = (pool?.total_shares ?? 0) > 0;

  // Market is cancellable ONLY if it's the creator, not resolved, NOT expired, 
  // and has zero financial activity (no bets, no LP).
  const isCancellable = Boolean(
    isMarketCreator &&
    !market.is_resolved &&
    nowTs < (market.close_time || 0) &&
    (pool?.trading_collateral ?? 0) === 0 &&
    (pool?.lp_collateral ?? 0) === 0 &&
    !hasBets
  );

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <Link
          to="/markets"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

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

                <div className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full border",
                  marketStatus === "Cancelled"
                    ? "bg-white/5 border-white/10"
                    : "bg-white/5 border-white/10"
                )}>
                  {marketStatus === "Cancelled" ? null : (
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      marketStatus === "Open" ? "bg-success" : "bg-warning"
                    )} />
                  )}
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.15em]",
                    marketStatus === "Cancelled" ? "text-white/40" : "text-white/80"
                  )}>
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
                  <span className="text-white/80 font-mono tracking-normal text-sm">{pool?.trader_count || 0} <span className="text-[10px] font-semibold uppercase text-muted-foreground/40 font-sans tracking-widest ml-1">Traders</span></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-success" />
                  <span className="text-white/80">Verifiable ZK Proofs</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mb-12 space-y-3">
          {outcomeLabels.map((label, index) => {
            const tone = getOutcomeTone(market.market_type, normalizedOutcomeCount, index);
            const percent = outcomePercents[index] ?? 0;
            return (
              <div key={label} className="space-y-2">
                <div className="flex justify-between items-end px-2">
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-widest",
                    tone === "yes"
                      ? "text-success/60"
                      : tone === "no"
                        ? "text-destructive/60"
                        : "text-primary/60",
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    "text-2xl font-bold font-mono",
                    tone === "yes"
                      ? "text-success"
                      : tone === "no"
                        ? "text-destructive"
                        : "text-primary",
                  )}>
                    {percent}%
                  </span>
                </div>
                <div className="h-3 w-full bg-white/[0.03] rounded-full border border-white/5 p-0.5 flex overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      tone === "yes"
                        ? "bg-gradient-to-r from-success/30 to-success"
                        : tone === "no"
                          ? "bg-gradient-to-r from-destructive/30 to-destructive"
                          : "bg-gradient-to-r from-primary/30 to-primary",
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {[
            // {
            //   label: "Outstanding Shares",
            //   value: `${sharesOutstanding.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
            //   unit: marketTokenTicker,
            //   icon: Activity,
            //   color: "text-primary",
            // },
            {
              label: "Pool Collateral",
              value: `${activeCollateral.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
              unit: marketTokenTicker,
              icon: Lock,
              color: "text-accent",
            },
            {
              label: "Trading Volume",
              value: `${cumulativeVolume.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
              unit: marketTokenTicker,
              icon: TrendingUp,
              color: "text-success",
            },
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

        {/* <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-white">Metric note:</span> Outstanding Shares is the total trader-held outcome shares across outcomes, Pool Collateral is the active market collateral currently sitting in the pool, and Trading Volume is cumulative turnover from buys plus sells.
        </div> */}

        <div className="grid lg:grid-cols-3 gap-6">
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
                  "text-3xl font-bold font-mono tracking-tighter",
                  resolvedOutcomeLabel === "CANCELLED"
                    ? "text-white/40"
                    : resolvedOutcomeTone === "yes"
                      ? "text-success"
                      : resolvedOutcomeTone === "no"
                        ? "text-destructive"
                        : "text-primary"
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

            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />

              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Available Outcomes
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {outcomeLabels.map((label, index) => (
                  <OutcomeCard
                    key={label}
                    outcome={label}
                    tone={getOutcomeTone(market.market_type, normalizedOutcomeCount, index)}
                    selected={false}
                    onSelect={() => {
                      if (marketStatus === "Open") setShowBetModal(true);
                    }}
                    disabled={marketStatus !== "Open"}
                  />
                ))}
              </div>

              {marketStatus !== "Open" && (
                <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    Bidding period has concluded
                  </p>
                </div>
              )}
            </div>

            {/* Resolution Action Card */}
            {marketStatus === "Resolving" && !proposal && hasBets && (
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-primary/5">
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Scale className="w-5 h-5 text-primary" />
                      Resolve Market
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      The voting period has ended. Only registered oracles can propose the initial resolution outcome.
                    </p>
                  </div>
                  <Button
                    className="w-full btn-premium py-6 rounded-2xl"
                    onClick={() => setShowResolutionModal(true)}
                    disabled={!isOracle}
                  >
                    {isOracle ? "Propose Resolution" : "Oracle Access Only"}
                  </Button>
                  {!isOracle && (
                    <p className="text-[11px] text-center text-muted-foreground">
                      Become an oracle in the Sidebar to participate in resolution.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cancel Market (Creator Only) */}
            {isCancellable && (
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-destructive/5">
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-destructive" />
                      Cancel Market
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      As the creator, you can cancel this market before any trading activity or liquidity occurs. This is an irreversible action.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full py-6 rounded-2xl"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Cancel Market
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
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
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 font-mono">Total Sellable Shares</span>
                      <span className="font-mono text-white">
                        {sellableOutcomeEntries.reduce((sum, entry) => sum + entry.shares, 0).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </span>
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
                  {marketStatus === "Open" && (
                    <Button
                      onClick={() => setShowBetModal(true)}
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                    >
                      Buy More Shares
                    </Button>
                  )}
                  {marketStatus === "Open" && sellableOutcomeEntries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Sell By Outcome
                      </p>
                      <div>
                        {sellableOutcomeEntries.slice(0, 4).map((entry) => (
                          <Button
                            key={`sell-${entry.outcome}`}
                            type="button"
                            variant="outline"
                            className="w-full h-10 rounded-xl border border-white/10 hover:bg-white/10 text-white text-sm"
                            onClick={() => {
                              setSellOutcome(entry.outcome);
                              setShowSellModal(true);
                            }}
                          >
                            {getOutcomeLabel(
                              market.market_type,
                              normalizedOutcomeCount,
                              entry.outcome,
                              market.outcome_labels,
                            )} ({entry.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })})
                          </Button>
                        ))}
                      </div>
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
                <div className="text-center py-6 space-y-6 relative z-10">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    No active position detected
                  </p>
                  <Button
                    onClick={() => setShowBetModal(true)}
                    disabled={marketStatus !== "Open"}
                    className="w-full text-sm btn-premium h-14 rounded-2xl group"
                  >
                    <span>Buy Shares</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              )}

              {publicKey && marketStatus === "Open" && (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => setShowFundModal(true)}
                    className="w-full h-14 text-[13px] rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                  >
                    Provide Liquidity
                  </Button>
                </div>
              )}
              {/* {publicKey && (
                <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-5">
                  {lpShares <= 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      No LP position detected for this wallet on this market yet. If you funded liquidity recently, give the wallet a moment to sync the updated on-chain balance.
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {market.is_resolved ? "Settled LP Claim" : "Current Pool Claim"}
                    </span>
                    <span className="text-white font-mono">
                      {lpCollateral.toLocaleString(undefined, { maximumFractionDigits: 4 })} {marketTokenTicker}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">LP Shares</span>
                    <span className="text-white font-mono">
                      {(lpShares / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Accrued LP Fees</span>
                    <span className="text-white font-mono">
                      {lpFeeAccrued.toLocaleString(undefined, { maximumFractionDigits: 4 })} {marketTokenTicker}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {market.is_resolved ? "Withdrawable Now" : "Withdrawable After Resolution"}
                    </span>
                    <span className="text-white font-mono">
                      {lpWithdrawable.toLocaleString(undefined, { maximumFractionDigits: 4 })} {marketTokenTicker}
                    </span>
                  </div>
                  {!market.is_resolved && lpShares > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      Liquidity becomes withdrawable after the market resolves. LP fees continue to accrue while trading is open.
                    </div>
                  )}
                  {market.is_resolved && lpShares > 0 && (
                    <Button
                      onClick={() => setShowWithdrawModal(true)}
                      className="w-full mt-2 h-10 text-xs rounded-xl bg-success/10 border border-success/30 hover:bg-success/15 text-success"
                    >
                      Withdraw Liquidity
                    </Button>
                  )}
                </div>
              )} */}
            </div>

            {/* Resolution Mechanics — only shown when market is no longer Open */}
            {(isClosed || isSettled) && marketStatus !== "Cancelled" && (
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-success/5 blur-3xl rounded-full" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Resolution</h2>
                  <ZKBadge variant="verified" size="sm" />
                </div>

                <div className="space-y-6 relative z-10">
                  {/* Current proposal state */}
                  {proposal ? (
                    <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Proposed Outcome</span>
                        <div className={cn(
                          "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          getOutcomeTone(market.market_type, normalizedOutcomeCount, proposal.proposed_outcome) === "yes"
                            ? "bg-success/20 text-success border-success/30"
                            : getOutcomeTone(market.market_type, normalizedOutcomeCount, proposal.proposed_outcome) === "no"
                              ? "bg-destructive/20 text-destructive border-destructive/30"
                              : "bg-primary/20 text-primary border-primary/30"
                        )}>
                          {getOutcomeLabel(
                            market.market_type,
                            normalizedOutcomeCount,
                            proposal.proposed_outcome,
                            market.outcome_labels,
                          ).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Window Status</span>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-[0.1em]",
                          proposal.is_disputed ? "text-destructive" : nowTs >= proposal.challenge_deadline ? "text-white/40" : "text-amber-500"
                        )}>
                          {proposal.is_disputed ? "Disputed" : nowTs >= proposal.challenge_deadline ? "Closed" : "Active"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {isSettled
                        ? "Final resolution recorded on-chain."
                        : "Oracle nodes may now submit a resolution proposal."
                      }
                    </p>
                  )}

                  {/* 1. Propose Resolution — open to all, oracle registration happens inside the modal */}
                  {!proposal && !isSettled && (
                    <Button
                      onClick={() => setShowResolutionModal(true)}
                      className="w-full h-14 rounded-2xl font-bold btn-premium transition-all duration-300"
                      disabled={market?.resolution_time ? nowTs < market.resolution_time : false}
                    >
                      Propose Resolution
                    </Button>
                  )}

                  {/* 2. Resolution Panel — available to anyone who needs to view, vote, or claim */}
                  {proposal && (
                    <Button
                      variant="ghost"
                      className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold"
                      onClick={() => setShowResolutionModal(true)}
                    >
                      <Scale className="w-4 h-4 mr-2" />
                      {isSettled
                        ? "View Resolution"
                        : proposal.is_disputed
                          ? "Open Resolution Panel"
                          : publicKey === proposal.proposer
                            ? "Manage Resolution"
                            : "View Resolution"}
                    </Button>
                  )}

                  {/* 3. Dispute Proposal — everyone except the proposer, while window open */}
                  {proposal && !isSettled && publicKey !== proposal.proposer && !proposal.is_disputed && (
                    <Button
                      variant="ghost"
                      className="w-full hover:bg-amber-500/10 hover:text-amber-500 border border-white/5 h-14 rounded-2xl group"
                      onClick={() => setShowDisputeModal(true)}
                    >
                      <ShieldAlert className="w-5 h-5 mr-3 text-amber-500 group-hover:scale-110 transition-transform" />
                      Dispute Proposal
                    </Button>
                  )}

                  {/* 4. Resolve Market — available to all once challenge has passed */}
                  {proposal && !isSettled && (
                    <Button
                      onClick={() => {
                        if (proposal && finalizationOutcome !== null) {
                          setFinalizeStep("confirm");
                          setShowFinalizeModal(true);
                        }
                      }}
                      className="w-full btn-premium bg-gradient-to-r from-success/80 to-success hover:from-success hover:to-success/90 h-14 rounded-2xl"
                      disabled={!publicKey || !proposal || !isFinalizable}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      {publicKey ? "Resolve Market" : "Connect Wallet To Resolve"}
                    </Button>
                  )}

                  {/* 5. Finalization Requirements */}
                  {proposal && !isSettled && (
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Finalization Requirements
                      </p>
                      {(finalizeRequirements?.blockers?.length ?? 0) > 0 ? (
                        <>
                          {finalizeRequirements?.blockers.map((blocker) => (
                            <p key={blocker} className="text-xs text-amber-500 leading-relaxed">
                              • {blocker}
                            </p>
                          ))}
                        </>
                      ) : (
                        <p className="text-xs text-success">All requirements satisfied. Market can be finalized.</p>
                      )}
                      {proposal.is_disputed && finalizeRequirements && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">
                            Quorum: {(finalizeRequirements.totalVoteWeightMicro / 1_000_000).toFixed(2)} /{" "}
                            {(finalizeRequirements.quorumWeightMicro / 1_000_000).toFixed(2)} ALEO
                            {" • "}
                            Voters: {finalizeRequirements.voterCount}/{finalizeRequirements.minVoters}
                          </p>
                          {finalizeRequirements.fallbackMode && (
                            <p className="text-[11px] text-amber-500">
                              Quorum timeout reached. Finalization can now fall back to the originally proposed outcome.
                            </p>
                          )}
                          {!finalizeRequirements.fallbackMode && finalizeRequirements.timeoutAt && (
                            <p className="text-[11px] text-muted-foreground">
                              Fallback unlock: {formatDateFriendly(finalizeRequirements.timeoutAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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
                  "Private wallet records and payout claims stay shielded in Aleo records",
                  "Stored position and LP ownership use commitment-style keys to reduce linkage",
                  "Trade execution and aggregate market accounting remain publicly verifiable"
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
          marketTitle={market.title}
          marketId={market.id}
          tokenId={market.token_id}
          marketProgramId={foundMarket?.program_id}
          marketType={market.market_type}
          outcomeCount={market.outcome_count}
        outcomeLabels={market.outcome_labels}
      />

      {defaultSellOutcome !== null && (
        <SellSharesModal
          open={showSellModal}
          onClose={() => {
            setShowSellModal(false);
            setSellOutcome(null);
          }}
          marketTitle={market.title}
          marketId={market.id}
          tokenId={market.token_id}
          outcome={defaultSellOutcome}
          marketType={market.market_type}
          outcomeCount={market.outcome_count}
          outcomeLabels={market.outcome_labels}
          closeTime={market.close_time}
        />
      )}

      <FundPoolModal
        open={showFundModal}
        onClose={() => setShowFundModal(false)}
        marketTitle={market.title}
        marketId={market.id}
        tokenId={market.token_id}
        marketProgramId={foundMarket?.program_id}
      />

      <CancelMarketModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        marketTitle={market.title}
        marketId={market.id}
      />

      <WithdrawLiquidityModal
        open={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        marketTitle={market.title}
        marketId={market.id}
        tokenId={market.token_id}
        lpShares={lpShares}
        estimatedWithdrawableMicro={userPosition?.lpWithdrawable ?? 0}
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
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Any connected wallet can trigger finalization once the oracle requirements are satisfied. This will finalize the market with the currently valid outcome.
              </p>
              {proposal && (
                <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-sm flex justify-between">
                  <span className="text-muted-foreground">
                    {proposal.is_disputed ? "Finalizing Outcome" : "Proposed Outcome"}
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      getOutcomeTone(
                        market.market_type,
                        normalizedOutcomeCount,
                        finalizationOutcome ?? proposal.proposed_outcome,
                      ) === "yes"
                        ? "text-success"
                        : getOutcomeTone(
                          market.market_type,
                          normalizedOutcomeCount,
                          finalizationOutcome ?? proposal.proposed_outcome,
                        ) === "no"
                          ? "text-destructive"
                          : "text-primary",
                    )}
                  >
                    {getOutcomeLabel(
                      market.market_type,
                      normalizedOutcomeCount,
                      finalizationOutcome ?? proposal.proposed_outcome,
                      market.outcome_labels,
                    ).toUpperCase()}
                  </span>
                </div>
              )}
              {proposal && !proposal.is_disputed && nowTs < proposal.challenge_deadline && (
                <p className="text-xs text-amber-500">
                  Challenge window active until {formatDateFriendly(proposal.challenge_deadline)}. Finalization may fail if submitted early.
                </p>
              )}
              {(finalizeRequirements?.blockers?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  {finalizeRequirements?.blockers.map((blocker) => (
                    <p key={blocker} className="text-xs text-amber-500">
                      • {blocker}
                    </p>
                  ))}
                </div>
              )}
              {proposal?.is_disputed && finalizeRequirements?.fallbackMode && (
                <p className="text-xs text-amber-500">
                  Quorum timeout reached. This resolve call will use the original proposal as the fallback outcome.
                </p>
              )}
              <Button onClick={handleFinalize} className="w-full btn-glow-success" disabled={!publicKey || !isFinalizable}>
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
      <ResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        market={{
          id: market.id,
          title: market.title,
          close_time: market.close_time || 0,
          resolution_time: market.resolution_time || 0,
          is_resolved: market.is_resolved,
          market_type: market.market_type,
          outcome_count: market.outcome_count,
          outcome_labels: market.outcome_labels,
          winningOutcome: market.winningOutcome,
        }}
        proposal={proposal}
        outcomeTotals={outcomeTotals}
        nowTs={nowTs}
        isOracle={isOracle}
        onUpdate={() => { }}
      />

      <DisputeModal
        open={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        marketId={market?.id ?? ""}
        marketTitle={market?.title ?? ""}
        proposedOutcomeLabel={outcomeLabels[proposal?.proposed_outcome ?? 0]}
      />
    </MainLayout>
  );
}
