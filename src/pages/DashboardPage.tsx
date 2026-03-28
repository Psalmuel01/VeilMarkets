import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Clock, Trophy, CheckCircle2, Loader2, Activity, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { BetCard, UserBet } from "@/components/dashboard/BetCard";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { resolveTokenTicker } from "@/lib/constants";
import { getOutcomeLabel, isCancelledOutcome } from "@/lib/outcomes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useClaimWinningsMutation,
  useCreditsBalancesQuery,
  useMarketsQuery,
  useUSADBalancesQuery,
  useUSDCxBalancesQuery,
  useUserBetsQuery,
} from "@/hooks/useVeilQuery";

const mapCategoryLabel = (value: number | undefined): string => {
  switch (value) {
    case 0: return "Crypto";
    case 1: return "Finance";
    case 2: return "Sports";
    case 3: return "Politics";
    case 4: return "Entertainment";
    case 5: return "Tech";
    case 6: return "Other";
    default: return "Other";
  }
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimStep, setClaimStep] = useState<"confirm" | "processing" | "success">("confirm");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const [claimedTicker, setClaimedTicker] = useState<string>("ALEO");
  const { publicKey } = useAleoPrograms();
  const claimMutation = useClaimWinningsMutation();
  const { data: records = [] } = useUserBetsQuery();
  const { data: allMarkets = [] } = useMarketsQuery();
  const { data: creditsBalances } = useCreditsBalancesQuery();
  const { data: usdcxBalances } = useUSDCxBalancesQuery();
  const { data: usadBalances } = useUSADBalancesQuery();

  const privateBalances = useMemo(() => {
    if (!publicKey) return null;
    if (!creditsBalances || !usdcxBalances || !usadBalances) return null;
    return {
      credits: creditsBalances.private,
      usdcx: usdcxBalances.private,
      usad: usadBalances.private,
    };
  }, [creditsBalances, usdcxBalances, usadBalances, publicKey]);

  const userBets = useMemo<UserBet[]>(() => {
    const marketMap = new Map(allMarkets.map((market) => [market.id.replace("field", "").trim(), market]));
    return records.map((record) => {
      const market = marketMap.get(record.market_id);
      const parsedOutcome = Number.parseInt(record.outcome, 10);
      const outcomeLabel = getOutcomeLabel(
        market?.market_type ?? 0,
        market?.outcome_count ?? 2,
        parsedOutcome,
        market?.outcome_labels,
      );

      let status: "Pending" | "Won" | "Lost" | "Cancelled" = "Pending";
      let canClaim = false;

      if (market?.is_resolved) {
        if (isCancelledOutcome(market.winning_outcome)) {
          status = "Cancelled";
        } else if (Number.isFinite(parsedOutcome) && market.winning_outcome === parsedOutcome) {
          status = "Won";
          canClaim = !record.position_spent;
        } else {
          status = "Lost";
        }
      }

      return {
        id: `${record.market_id}-${record.escrow_id}`,
        marketId: record.market_id,
        marketTitle: market?.title || `Market ${record.market_id.substring(0, 8)}...`,
        category: mapCategoryLabel(market?.category),
        tokenTicker: resolveTokenTicker(market?.token_id ?? ""),
        status,
        outcome: outcomeLabel,
        placedAt: "Recorded",
        canClaim,
        isClaimed: Boolean(record.position_spent),
      };
    });
  }, [allMarkets, records]);

  const stats = useMemo(() => {
    const total = userBets.length;
    const pending = userBets.filter((bet) => bet.status === "Pending").length;
    const resolved = userBets.filter((bet) => bet.status === "Won" || bet.status === "Lost");
    const won = resolved.filter((bet) => bet.status === "Won").length;
    const rate = resolved.length > 0 ? Math.round((won / resolved.length) * 100) : 0;

    return [
      { icon: Trophy, label: "Total Bets", value: total.toString() },
      { icon: TrendingUp, label: "Win Rate", value: `${rate}%` },
      { icon: Clock, label: "Pending", value: pending.toString() },
    ];
  }, [userBets]);

  const myMarkets = useMemo(() => {
    const currentAddr = (publicKey || "").replace(/address/g, "").trim();
    return allMarkets
      .filter((market) => market.creator && market.creator.replace(/address/g, "").trim() === currentAddr)
      .map((market) => ({
        id: market.id,
        title: market.title,
        description: market.description,
        title_hash: market.title_hash,
        is_resolved: market.is_resolved,
      }));
  }, [allMarkets, publicKey]);

  const filteredBets = userBets.filter((bet) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return bet.status === "Pending";
    if (activeTab === "won") return bet.status === "Won";
    if (activeTab === "lost") return bet.status === "Lost";
    return true;
  });

  const handleClaim = (marketId: string) => {
    setSelectedMarketId(marketId);
    const bet = userBets.find((entry) => entry.marketId === marketId);
    if (bet?.tokenTicker) setClaimedTicker(bet.tokenTicker);
    setShowClaimModal(true);
    setClaimStep("confirm");
    setClaimedAmount(null);
  };

  const processClaim = async () => {
    setClaimStep("processing");

    if (!selectedMarketId) {
      setClaimStep("confirm");
      return;
    }

    try {
      const result = await claimMutation.mutateAsync(selectedMarketId);
      setClaimedAmount(result.payoutAmount);
      setClaimedTicker(result.payoutTicker);
      setClaimStep("success");
    } catch (_error) {
      setClaimStep("confirm");
    }
  };

  return (
    <MainLayout requireWallet={true}>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] border-primary/20 text-primary bg-primary/5">
                User Dashboard
              </Badge>
              <ZKBadge variant="verified" size="sm" />
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
              My <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Positions</span>
            </h1>
            <p className="text-muted-foreground text- mt-2 max-w-md font-medium">
              Monitor your private predictions and settled winnings.
            </p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex -space-x-3 pointer-events-none opacity-50">
               {[1, 2, 3].map(i => (
                 <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800" />
               ))}
             </div>
             <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
               Network Verified <br/> Participant
             </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 rounded-3xl border border-white/5 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Active Status Card (New) */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 rounded-3xl border border-white/5 relative group overflow-hidden md:col-span-1 col-span-2"
          >
             <div className="flex flex-col h-full justify-between gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-success">Active Session</span>
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_theme(colors.success.DEFAULT)]" />
                </div>
                <div className="flex items-center gap-2">
                   <Activity className="w-4 h-4 text-muted-foreground/40" />
                   <span className="text-xs font-bold text-white/50">Node 0x4...2a9</span>
                </div>
             </div>
          </motion.div> */}
        </div>

        {/* Vault Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5 rounded-[3rem] border border-white/5 mb-6 relative overflow-hidden group"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-700" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.1)]">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Private Vault Balances</p>
                <div className="flex gap-5 items-center space-y-1">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-lg md:text-xl font-bold text-white font-mono tracking-tighter">
                      {privateBalances !== null ? privateBalances.credits.toLocaleString() : "••••••••"}
                    </h2>
                    <span className="text-sm font-medium text-primary/60 font-mono">{resolveTokenTicker("credits.aleo")}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-lg md:text-xl font-bold text-white font-mono tracking-tighter">
                      {privateBalances !== null ? privateBalances.usdcx.toLocaleString() : "••••••••"}
                    </h2>
                    <span className="text-sm font-medium text-accent/70 font-mono">{resolveTokenTicker("test_usdcx_stablecoin.aleo")}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-lg md:text-xl font-bold text-white font-mono tracking-tighter">
                      {privateBalances !== null ? privateBalances.usad.toLocaleString() : "••••••••"}
                    </h2>
                    <span className="text-sm font-medium text-accent/70 font-mono">{resolveTokenTicker("test_usad_stablecoin.aleo")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-help group/tip">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Fully Shielded on Chain</span>
                  <ZKBadge variant="encrypted" size="sm" />
               </div>
               <div className="flex items-center justify-end gap-2">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 font-mono">Last Sync: Just Now</span>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
          <TabsList className="bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl h-auto gap-1">
            {[
              { id: "all", label: "Overview" },
              { id: "pending", label: "Active" },
              { id: "won", label: "Winnings" },
              { id: "lost", label: "Historical" },
              { id: "created", label: "My Markets" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-xl px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] data-[state=active]:bg-primary h-10 data-[state=active]:text-slate-950 transition-all duration-300"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* My Markets Content */}
        {activeTab === "created" && (
          <div className="grid gap-6">
            {myMarkets.length > 0 ? (
              myMarkets.map((m) => (
                <div key={m.id} className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                     <Zap className="w-16 h-16 text-primary" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <h3 className="text-xl font-black text-white">{m.title}</h3>
                         <Badge variant="outline" className={cn(
                           "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                           m.is_resolved ? "text-primary border-primary/20 bg-primary/5" : "text-success border-success/20 bg-success/5"
                         )}>
                           {m.is_resolved ? "Settled" : "Live"}
                         </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground max-w-xl font-medium">{m.description || `Market Identifier: ${m.id}`}</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/20">
                         <span>HASH: {m.title_hash}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                       <Button
                         variant="outline"
                         onClick={() => navigate(`/market/${m.id}`)}
                         className="rounded-2xl border-white/10 text-white font-bold h-6 px-6 hover:bg-white/5"
                       >
                         VIEW DETAILS
                       </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24 p-6 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10">
                <Activity className="w-6 h-6 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium mb-6">No proprietary markets found in your registry</p>
                <Button
                  onClick={() => navigate("/create")}
                  className="btn-premium h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-xs"
                >
                  Initiate New Market
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bets Grid */}
        {activeTab !== "created" && (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredBets.map((bet, index) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BetCard bet={bet} onClaim={handleClaim} />
              </motion.div>
            ))}
          </div>
        )}

        {activeTab !== "created" && filteredBets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No bets found</p>
          </div>
        )}
      </div>

      {/* Claim Modal */}
      <Dialog open={showClaimModal} onOpenChange={() => setShowClaimModal(false)}>
        <DialogContent className="sm:max-w-md bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Claim Winnings</DialogTitle>
          </DialogHeader>

          {claimStep === "confirm" && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Amount to Claim</span>
                  <span className="font-mono encrypted-text">Calculated on-chain</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-mono text-muted-foreground">~0.001 ALEO</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div className="text-sm">
                  <p className="font-medium text-success">Settlement Verified</p>
                  <p className="text-muted-foreground">This payout is backed by ZK proof</p>
                </div>
              </div>

              <Button onClick={processClaim} className="w-full btn-glow-primary">
                Claim Now
              </Button>
            </div>
          )}

          {claimStep === "processing" && (
            <div className="py-6 text-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Processing Claim</h3>
                <p className="text-sm text-muted-foreground">
                  Verifying ZK proof and transferring funds...
                </p>
              </div>
            </div>
          )}

          {claimStep === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-success" />
              </motion.div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Winnings Claimed!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your winnings have been transferred privately
                </p>
                <ZKBadge variant="verified" size="lg" animated />
              </div>

              {claimedAmount !== null && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-success">
                  <div className="text-xs uppercase tracking-wide mb-1">Claimed Amount</div>
                  <div className="text-2xl font-bold">+{claimedAmount.toFixed(4)} {claimedTicker}</div>
                </div>
              )}

              <Button onClick={() => setShowClaimModal(false)} className="w-full">
                Done
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
