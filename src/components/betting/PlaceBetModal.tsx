import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, CheckCircle2, X } from "lucide-react";
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

interface PlaceBetModalProps {
  open: boolean;
  onClose: () => void;
  marketTitle: string;
}

type Step = "select" | "confirm" | "processing" | "success";

export function PlaceBetModal({ open, onClose, marketTitle }: PlaceBetModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No" | null>(null);
  const [wagerAmount, setWagerAmount] = useState(50);

  const handleSubmit = () => {
    setStep("processing");
    // Simulate ZK proof generation
    setTimeout(() => {
      setStep("success");
    }, 3000);
  };

  const handleClose = () => {
    setStep("select");
    setSelectedOutcome(null);
    setWagerAmount(50);
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
          {step === "select" && (
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
                  aleo1...{Math.random().toString(36).substring(2, 8)}
                </code>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
