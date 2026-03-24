import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Wallet, TrendingUp, Clock, Trophy, CheckCircle2, Loader2, ArrowUpRight, Activity, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { BetCard, UserBet } from "@/components/dashboard/BetCard";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { fetchMappingValue, parseMarketInfo } from "@/lib/aleo";
import { PROGRAM_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimStep, setClaimStep] = useState<"confirm" | "processing" | "success">("confirm");
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [stats, setStats] = useState([
    { icon: Trophy, label: "Total Bets", value: "0" },
    { icon: TrendingUp, label: "Win Rate", value: "0%" },
    { icon: Clock, label: "Pending", value: "0" },
  ]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const [myMarkets, setMyMarkets] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      title_hash: string;
      is_resolved: boolean;
    }>
  >([]);
  const { fetchUserBets, fetchMarkets, fetchTokenBalance, loading, claimWinnings, refreshSignal } = useAleoPrograms();
  const { publicKey } = useWallet();
  const address = publicKey; 

  useEffect(() => {
    const loadData = async () => {
      if (!address) return;

      try {
        const [records, allMarkets, balance] = await Promise.all([
          fetchUserBets(),
          fetchMarkets(),
          fetchTokenBalance()
        ]);

        setTokenBalance(balance);

        const marketMap = new Map(allMarkets.map(m => [m.id.replace("field", "").trim(), m]));
        const missingMarketIds = Array.from(
          new Set(records.map(r => r.market_id).filter((id) => !marketMap.has(id)))
        );

        if (missingMarketIds.length > 0) {
          const fetched = await Promise.all(
            missingMarketIds.map(async (id) => {
              const fieldId = id.endsWith("field") ? id : `${id}field`;
              const raw = await fetchMappingValue(PROGRAM_ID, "markets", fieldId);
              if (!raw) return null;
              return parseMarketInfo(raw as string | object, fieldId);
            })
          );
          fetched.filter(Boolean).forEach((m: any) => {
            marketMap.set(m.id.replace("field", "").trim(), m);
          });
        }

        const mapped: UserBet[] = records.map((record) => {
          // record.market_id is already cleaned by the hook
          const market = marketMap.get(record.market_id);
          const outcomeLabel = record.outcome === "1" ? "Yes" : "No";
          const betId = `${record.market_id}-${record.escrow_id}`;

          let status: "Pending" | "Won" | "Lost" | "Cancelled" = "Pending";
          let canClaim = false;

          if (market?.is_resolved) {
            if (market.winning_outcome === 3) {
              status = "Cancelled";
              canClaim = !record.position_spent;
            } else if (market.winning_outcome === (record.outcome === "1" ? 1 : 0)) {
              status = "Won";
              canClaim = !record.position_spent;
            } else {
              status = "Lost";
            }
          }

          return {
            id: betId,
            marketId: record.market_id,
            marketTitle: market?.title || `Market ${record.market_id.substring(0, 8)}...`,
            category: market?.category === 0 ? "Crypto" : market?.category === 1 ? "Sports" : "Misc",
            status,
            outcome: outcomeLabel,
            placedAt: "Recorded", // TODO - need timestamp in the record
            canClaim,
            isClaimed: Boolean(record.position_spent),
          };
        });

        setUserBets(mapped);

        // Calculate Stats
        const total = mapped.length;
        const pending = mapped.filter(b => b.status === "Pending").length;
        const resolved = mapped.filter(b => b.status === "Won" || b.status === "Lost");
        const won = resolved.filter(b => b.status === "Won").length;
        const rate = resolved.length > 0 ? Math.round((won / resolved.length) * 100) : 0;

        setStats([
          { icon: Trophy, label: "Total Bets", value: total.toString() },
          { icon: TrendingUp, label: "Win Rate", value: `${rate}%` },
          { icon: Clock, label: "Pending", value: pending.toString() },
        ]);

        // Filter created markets
        const currentAddr = (address || "").replace(/address/g, "").trim();
        const filtered = allMarkets.filter((market) =>
          market.creator && market.creator.replace(/address/g, "").trim() === currentAddr
        );
        setMyMarkets(
          filtered.map((market) => ({
            id: market.id,
            title: market.title,
            description: market.description,
            title_hash: market.title_hash,
            is_resolved: market.is_resolved,
          })),
        );
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    };

    loadData();
  }, [fetchUserBets, fetchMarkets, fetchTokenBalance, address, refreshSignal]);

  const filteredBets = userBets.filter((bet) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return bet.status === "Pending";
    if (activeTab === "won") return bet.status === "Won";
    if (activeTab === "lost") return bet.status === "Lost";
    return true;
  });

  const [txId, setTxId] = useState<string | null>(null);

  const handleClaim = (marketId: string) => {
    setSelectedMarketId(marketId);
    setShowClaimModal(true);
    setClaimStep("confirm");
    setClaimedAmount(null);
  };

  const processClaim = async () => {
    setClaimStep("processing");

    if (!selectedMarketId) return;
    const result = await claimWinnings(selectedMarketId);

    if (result) {
      setTxId(result.transactionId);
      setClaimedAmount(result.payoutAmount);
      const claimedAt = new Date().toLocaleString();
      setUserBets((prev) =>
        prev.map((bet) =>
          bet.marketId === selectedMarketId && bet.status === "Won"
            ? {
                ...bet,
                canClaim: false,
                isClaimed: true,
                claimedAmount: result.payoutAmount,
                claimedAt,
              }
            : bet,
        ),
      );
      setClaimStep("success");
    } else {
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
          className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border-primary/20 text-primary bg-primary/5">
                User Dashboard
              </Badge>
              <ZKBadge variant="verified" size="sm" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              My <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Positions</span>
            </h1>
            <p className="text-muted-foreground text-lg mt-2 max-w-md font-medium">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 rounded-3xl border border-white/5 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className="w-12 h-12" />
              </div>
              <div className="flex flex-col gap-4 relative z-10">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-white font-mono">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Active Status Card (New) */}
          <motion.div
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
          </motion.div>
        </div>

        {/* Vault Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-10 rounded-[3rem] border border-white/5 mb-12 relative overflow-hidden group"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-700" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 blur-[60px] rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.1)]">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Total Vault Balance</p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter">
                    {tokenBalance !== null ? tokenBalance.toLocaleString() : "••••••••"}
                  </h2>
                  <span className="text-lg font-bold text-primary/60 font-mono">ALEO</span>
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
                className="rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] data-[state=active]:bg-primary h-10 data-[state=active]:text-slate-950 transition-all duration-300"
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
                         className="rounded-2xl border-white/10 text-white font-bold h-12 px-6 hover:bg-white/5"
                       >
                         VIEW DETAILS
                       </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24 p-12 rounded-[3rem] bg-white/[0.02] border border-dashed border-white/10">
                <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
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
        <DialogContent className="sm:max-w-md bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-0 overflow-hidden">
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
            <div className="py-12 text-center space-y-6">
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
                  <div className="text-2xl font-bold">+{claimedAmount.toFixed(4)} ALEO</div>
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
