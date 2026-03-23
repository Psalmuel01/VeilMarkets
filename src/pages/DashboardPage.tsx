import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { Wallet, TrendingUp, Clock, Trophy, CheckCircle2, Loader2 } from "lucide-react";
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
  const { address } = useWallet();

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Bets</h1>
            <p className="text-muted-foreground">
              Track your private predictions and winnings
            </p>
          </div>
          <ZKBadge variant="verified" size="lg" />
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-5 rounded-xl bg-card border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Wallet Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-card-gradient border border-border/50 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold font-mono">
                  {tokenBalance !== null ? `${tokenBalance.toLocaleString()} ALEO` : "•••••••• ALEO"}
                </p>
              </div>
            </div>
            <ZKBadge variant="encrypted" />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All Bets</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
            <TabsTrigger value="created">My Markets</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* My Markets Content */}
        {activeTab === "created" && (
          <div className="space-y-6">
            {myMarkets.length > 0 ? (
              myMarkets.map((m) => (
                <div key={m.id} className="p-6 rounded-xl bg-card border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{m.title}</h3>
                      <p className="text-sm text-muted-foreground">{m.description || `Market ID: ${m.id}`}</p>
                      <p className="text-xs text-muted-foreground">Title Hash: {m.title_hash}</p>
                    </div>
                    <Badge variant="outline" className={m.is_resolved ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}>
                      {m.is_resolved ? "Settled" : "Open"}
                    </Badge>
                  </div>
                  {!m.is_resolved && (
                    <p className="text-sm text-muted-foreground">
                      Resolution is oracle-driven. Finalization is only available after oracle proposal and voting.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    * Final resolution for on-chain state.
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-16 p-6 rounded-xl bg-muted/10 border border-dashed border-border">
                <p className="text-muted-foreground">You haven't created any markets yet</p>
                <Button
                  variant="link"
                  className="mt-2 text-primary"
                  onClick={() => navigate("/create")}
                >
                  Create your first market
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
        <DialogContent className="sm:max-w-md bg-card border-border/50">
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
