import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, CheckCircle2, X, Wallet } from "lucide-react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
  const { address } = useWallet();
  const [step, setStep] = useState<Step>("select");
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No" | null>(null);
  const [wagerAmount, setWagerAmount] = useState(5);
  const [txId, setTxId] = useState<string | null>(null);
  const { placeBet, fetchPoolStats, fetchBalances, shieldCredits } = useAleoPrograms();
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
      <DialogContent className="sm:max-w-lg bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Place Private Bet
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {marketTitle}
        </div>

        <AnimatePresence mode="wait">
          {!address ? (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-6 space-y-3"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Wallet Required</h3>
              <p className="text-sm text-muted-foreground pb-4">
                You need to connect an Aleo wallet to place private bets.
              </p>
              <ConnectWalletButton className="w-full justify-center" />
            </motion.div>
          ) : step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Outcome Selection */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Select Your Prediction
                </label>
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
              <WagerSlider
                value={wagerAmount}
                onChange={setWagerAmount}
              />

              {balances && balances.private < wagerAmount && balances.public >= wagerAmount && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-500 uppercase tracking-wider">Top-up Required</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You need **{wagerAmount} Private Credits**. You have enough Public balance to top up now.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-500/30 hover:bg-amber-500/10 text-amber-500 text-xs py-4 transition-all duration-200"
                    onClick={() => shieldCredits(wagerAmount)}
                  >
                    Shield {wagerAmount} Credits
                  </Button>
                </div>
              )}

              {/* <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                <p>Each bet requires Aleo Credits. If you're out of credits, use the <strong>Faucet</strong> in the sidebar.</p>
              </div> */}

              <Button
                onClick={() => setStep("confirm")}
                disabled={!selectedOutcome}
                className="w-full btn-glow-primary"
              >
                Continue to Privacy Review
              </Button>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Summary */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Prediction</span>
                  <span className="font-semibold">{selectedOutcome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wager Amount</span>
                  <span className="font-mono encrypted-text">Encrypted</span>
                </div>
                {potentialReturn && (
                  <div className="flex justify-between text-sm pt-2 border-t border-border/10">
                    <span className="text-muted-foreground">Potential Return</span>
                    <span className="font-semibold text-success">~{potentialReturn.toFixed(2)} ALEO</span>
                  </div>
                )}
              </div>

              {/* Privacy Checklist */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 block">
                  Privacy Verification
                </label>
                <PrivacyChecklist />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("select")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 btn-glow-primary"
                >
                  Submit Private Bet
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
              className="py-12 text-center space-y-6"
            >
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Generating ZK Proof</h3>
                <p className="text-sm text-muted-foreground">
                  Encrypting your bet and creating a zero-knowledge proof...
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
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
                <h3 className="text-lg font-semibold mb-2">Bet Placed Successfully!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your private bet has been recorded on Aleo
                </p>
                <ZKBadge variant="verified" size="lg" animated />
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Transaction ID</div>
                <code className="text-sm font-mono text-primary break-all">
                  {txId || "aleo1tx..."}
                </code>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </motion.div>
          )}

          {step === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center"
              >
                <X className="w-10 h-10 text-destructive" />
              </motion.div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Transaction Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your bet could not be securely placed.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("confirm")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
