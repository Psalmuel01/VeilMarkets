import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Clock, Trophy, CheckCircle2, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { BetCard, UserBet } from "@/components/dashboard/BetCard";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock data
const mockBets: UserBet[] = [
  {
    id: "1",
    marketId: "1",
    marketTitle: "Will Bitcoin reach $100,000 by end of Q2 2024?",
    category: "Crypto",
    status: "Pending",
    outcome: "Yes",
    placedAt: "Jan 20, 2024",
    canClaim: false,
  },
  {
    id: "2",
    marketId: "3",
    marketTitle: "Will Manchester City win the Premier League 2023-24?",
    category: "Sports",
    status: "Won",
    outcome: "Yes",
    placedAt: "Dec 15, 2023",
    canClaim: true,
  },
  {
    id: "3",
    marketId: "5",
    marketTitle: "Will the Oscar for Best Picture go to Oppenheimer?",
    category: "Entertainment",
    status: "Won",
    outcome: "Yes",
    placedAt: "Feb 28, 2024",
    canClaim: false,
  },
  {
    id: "4",
    marketId: "2",
    marketTitle: "Will the Fed cut interest rates in March 2024?",
    category: "Finance",
    status: "Lost",
    outcome: "Yes",
    placedAt: "Feb 10, 2024",
    canClaim: false,
  },
];

const stats = [
  { icon: Trophy, label: "Total Bets", value: "12" },
  { icon: TrendingUp, label: "Win Rate", value: "66%" },
  { icon: Clock, label: "Pending", value: "3" },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimStep, setClaimStep] = useState<"confirm" | "processing" | "success">("confirm");

  const filteredBets = mockBets.filter((bet) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return bet.status === "Pending";
    if (activeTab === "won") return bet.status === "Won";
    if (activeTab === "lost") return bet.status === "Lost";
    return true;
  });

  const handleClaim = () => {
    setShowClaimModal(true);
    setClaimStep("confirm");
  };

  const processClaim = () => {
    setClaimStep("processing");
    setTimeout(() => {
      setClaimStep("success");
    }, 2500);
  };

  return (
    <MainLayout>
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
                <p className="text-sm text-muted-foreground">Total Winnings (Private)</p>
                <p className="text-2xl font-bold font-mono encrypted-text">•••••••• ALEO</p>
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
          </TabsList>
        </Tabs>

        {/* Bets Grid */}
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

        {filteredBets.length === 0 && (
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
                  <span className="font-mono encrypted-text">•••••• ALEO</span>
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
