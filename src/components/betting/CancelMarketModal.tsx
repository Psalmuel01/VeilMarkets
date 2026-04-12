import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X, Trash2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCancelMarketMutation } from "@/hooks/useVeilQuery";
import { cn } from "@/lib/utils";

interface CancelMarketModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  onSuccess?: () => void;
}

type Step = "confirm" | "processing" | "success" | "failed";

export const CancelMarketModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  onSuccess,
}: CancelMarketModalProps) => {
  const [step, setStep] = useState<Step>("confirm");
  const [txId, setTxId] = useState<string | null>(null);
  const cancelMutation = useCancelMarketMutation();

  const resetForm = () => {
    setStep("confirm");
    setTxId(null);
  };

  const handleClose = () => {
    if (step === "processing") return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setStep("processing");
    try {
      const result = await cancelMutation.mutateAsync(marketId);
      setTxId(result);
      setStep("success");
      onSuccess?.();
    } catch (_error) {
      setStep("failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md glass-panel !rounded-[2.5rem] border-white/10 p-0 overflow-hidden">
        {/* Decorative Alert Background */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-destructive/10 to-transparent pointer-events-none" />

        <div className="relative p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                Cancel <span className="text-destructive">Market</span>
              </DialogTitle>
            </div>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-destructive/10 mt-0.5">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-destructive uppercase tracking-wider">
                        Irreversible Action
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You are about to cancel <span className="text-white font-bold">{marketTitle}</span>.
                        This will permanently resolve the market as "Cancelled" and close it for all future trading.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground italic text-center px-4">
                    "Cancellation is only possible because no bets or liquidity have been added to this market yet."
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="flex-1 h-12 rounded-xl"
                    >
                      Keep Market
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleSubmit}
                      className="flex-1 h-12 rounded-xl"
                    >
                      Confirm Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-12 text-center space-y-6"
              >
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-destructive animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Processing Cancellation</h3>
                  <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                    Sending ZK-proof instructions to the Aleo network...
                  </p>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-6"
              >
                <div className="mx-auto w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center">
                  <Trash2 className="w-10 h-10 text-success" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Market Cancelled</h3>
                  <p className="text-sm text-muted-foreground">
                    Transaction ID recorded:
                  </p>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-[10px] text-primary break-all">
                    {txId}
                  </div>
                </div>
                <Button onClick={handleClose} className="w-full btn-premium rounded-xl h-12">
                  Return to Dashboard
                </Button>
              </motion.div>
            )}

            {step === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-6"
              >
                <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
                  <X className="w-10 h-10 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Cancellation Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    The network rejected the cancellation or timed out.
                  </p>
                </div>
                <Button onClick={() => setStep("confirm")} className="w-full h-12 rounded-xl">
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
