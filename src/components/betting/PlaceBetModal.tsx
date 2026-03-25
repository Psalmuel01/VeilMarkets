import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, CheckCircle2, X, Wallet, ArrowRight, TrendingUp } from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OutcomeCard } from "./OutcomeCard";
import { WagerSlider } from "./WagerSlider";
import { PrivacyChecklist } from "@/components/ui/PrivacyChecklist";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { cn } from "@/lib/utils";

interface PlaceBetModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  tokenId: string; // The specific token contract for this market
  onBetPlaced?: () => void;
}

type Step = "select" | "confirm" | "processing" | "success" | "failed";

export const PlaceBetModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  tokenId,
  onBetPlaced,
}: PlaceBetModalProps) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No" | null>(null);
  const [wagerAmount, setWagerAmount] = useState(5);
  const [txId, setTxId] = useState<string | null>(null);
  const { placeBet, fetchPoolStats, fetchBalances, shieldCredits, publicKey } = useAleoPrograms();
  const [pool, setPool] = useState<{ total_yes: number; total_no: number } | null>(null);
  const [balances, setBalances] = useState<{ private: number; public: number } | null>(null);

  useEffect(() => {
    if (open) {
      fetchPoolStats(marketId).then(setPool);
      fetchBalances().then(setBalances);
    }
  }, [marketId, open, fetchPoolStats, fetchBalances]);

  const calculateReturn = () => {
    if (!pool || !selectedOutcome) return null;
    const x = wagerAmount * 1_000_000;
    const total_yes = pool.total_yes;
    const total_no = pool.total_no;

    let payout = 0;
    if (selectedOutcome === "Yes") {
      payout = (x / (total_yes + x)) * (total_yes + total_no + x);
    } else {
      payout = (x / (total_no + x)) * (total_yes + total_no + x);
    }

    return payout / 1_000_000;
  };

  const potentialReturn = calculateReturn();

  const handleSubmit = async () => {
    setStep("processing");

    const result = await placeBet(
      marketId,
      selectedOutcome === "Yes" ? 1 : 0,
      wagerAmount,
      tokenId
    );

    if (result) {
      setTxId(result);
      setStep("success");
      onBetPlaced?.();
    } else {
      setStep("failed");
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedOutcome(null);
    setWagerAmount(10);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl glass-panel !rounded-[2.5rem] border-white/10 p-0 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div className="relative p-8">
          <DialogHeader className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg btn-premium flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                    Place Private <span className="text-gradient">Bet</span>
                  </DialogTitle>
                </div>
                <p className="text-sm text-muted-foreground font-medium pl-10">
                  {marketTitle}
                </p>
              </div>
              {/* <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/5 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button> */}
            </div>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!publicKey ? (
              <motion.div
                key="connect"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12 space-y-6"
              >
                <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                  <Wallet className="w-10 h-10 text-primary relative z-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
                    To place a privacy-preserving bet on Aleo, you'll need to link your wallet.
                  </p>
                </div>
                <ConnectWalletButton className="w-full max-w-sm mx-auto" />
              </motion.div>
            ) : step === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Outcome Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Select Your Prediction
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <OutcomeCard
                      outcome="Yes"
                      selected={selectedOutcome === "Yes"}
                      onSelect={() => setSelectedOutcome("Yes")}
                    />
                    <OutcomeCard
                      outcome="No"
                      selected={selectedOutcome === "No"}
                      onSelect={() => setSelectedOutcome("No")}
                    />
                  </div>
                </div>

                {/* Wager Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-accent" />
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Wager Amount
                      </label>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">Max: 1000 ALEO</span>
                  </div>
                  <WagerSlider
                    value={wagerAmount}
                    onChange={setWagerAmount}
                  />
                </div>

                {balances && balances.private < wagerAmount && balances.public >= wagerAmount && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl bg-warning/5 border border-warning/10 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-warning/10 mt-0.5">
                        <Shield className="w-4 h-4 text-warning" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-warning uppercase tracking-wider">Top-up Required</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          You need <span className="text-white font-bold">{wagerAmount} Private Credits</span>. Your current public balance is sufficient for a private top-up.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-warning/10 border-warning/20 hover:bg-warning/20 hover:border-warning/30 text-warning text-xs font-bold h-12 rounded-2xl transition-all"
                      onClick={() => shieldCredits(wagerAmount)}
                    >
                      Shield {wagerAmount} Credits
                    </Button>
                  </motion.div>
                )}

                <Button
                  onClick={() => setStep("confirm")}
                  disabled={!selectedOutcome}
                  className="w-full btn-premium h-16 rounded-[1.5rem] group"
                >
                  <span className="text-base font-bold">Continue to Review</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Summary Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outcome</span>
                    <div className={cn(
                      "text-2xl font-bold",
                      selectedOutcome === "Yes" ? "text-success" : "text-destructive"
                    )}>
                      {selectedOutcome}
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Wager</span>
                    <div className="text-2xl font-bold text-white font-mono">
                      {wagerAmount} <span className="text-xs text-muted-foreground">ALEO</span>
                    </div>
                  </div>
                </div>

                {potentialReturn && (
                  <div className="p-6 rounded-3xl bg-success/5 border border-success/10 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-success/70">Estimated Max Return</span>
                      <div className="text-2xl font-bold text-success font-mono">
                        +{potentialReturn.toFixed(2)} <span className="text-xs">ALEO</span>
                      </div>
                    </div>
                    <TrendingUp className="w-10 h-10 text-success opacity-20" />
                  </div>
                )}

                {/* Privacy Proofing */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Privacy Verification
                    </label>
                  </div>
                  <div className="p-2 rounded-[2rem] bg-white/[0.02] border border-white/5">
                    <PrivacyChecklist />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => setStep("select")}
                    className="flex-1 h-14 rounded-2xl hover:bg-white/5 text-muted-foreground font-bold active:scale-95 transition-all outline-none border border-transparent hover:border-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-[2] btn-premium h-14 rounded-2xl font-bold"
                  >
                    Confirm Private Bet
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-16 text-center space-y-8"
              >
                <div className="relative mx-auto w-32 h-32">
                  <div className="absolute inset-0 rounded-[2.5rem] bg-primary/20 animate-pulse" />
                  <div className="relative w-32 h-32 rounded-[2.5rem] bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Generating ZK Proof</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Encrypting your transaction and generating a cryptographic proof to ensure your privacy.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-pulse"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-12 text-center space-y-8"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 10, delay: 0.2 }}
                  className="mx-auto w-32 h-32 rounded-[2.5rem] bg-success/10 border border-success/30 flex items-center justify-center shadow-[0_0_50px_hsla(160,84%,45%,0.15)]"
                >
                  <CheckCircle2 className="w-16 h-16 text-success" />
                </motion.div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Bet Confirmed</h3>
                    <p className="text-sm text-muted-foreground">
                      Your transaction has been securely broadcast to Aleo.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <ZKBadge variant="verified" size="lg" animated />
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 group">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Transaction Hash</div>
                  <code className="text-xs font-mono text-primary break-all group-hover:text-primary/100 transition-colors">
                    {txId || "aleo1tx..."}
                  </code>
                </div>

                <Button onClick={handleClose} className="w-full btn-premium h-14 rounded-2xl font-bold">
                  View My Bets
                </Button>
              </motion.div>
            )}

            {step === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-12 text-center space-y-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto w-32 h-32 rounded-[2.5rem] bg-destructive/10 border border-destructive/30 flex items-center justify-center shadow-[0_0_50px_hsla(0,84%,60%,0.15)]"
                >
                  <X className="w-16 h-16 text-destructive" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Transaction Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    We encountered an error while generating your private bet. Please check your wallet and try again.
                  </p>
                </div>

                <div className="flex gap-4 p-2">
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="flex-1 h-14 rounded-2xl font-bold hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-[2] bg-destructive hover:bg-destructive/90 text-white font-bold h-14 rounded-2xl active:scale-95 transition-all"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
