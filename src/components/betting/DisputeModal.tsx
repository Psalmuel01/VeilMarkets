import { useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { useDisputeResolutionMutation } from "@/hooks/useVeilQuery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DisputeModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  proposedOutcomeLabel: string;
}

const DISPUTE_BOND_ALEO = 20; // testing default dispute bond

export const DisputeModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  proposedOutcomeLabel,
}: DisputeModalProps) => {
  const { publicKey } = useAleoPrograms();
  const disputeMutation = useDisputeResolutionMutation();
  const [step, setStep] = useState<"warning" | "processing" | "success" | "failed">("warning");
  const [txId, setTxId] = useState<string | null>(null);

  const handleClose = () => {
    setStep("warning");
    setTxId(null);
    onClose();
  };

  const handleDispute = async () => {
    setStep("processing");
    try {
      const tx = await disputeMutation.mutateAsync({
        marketId,
        amountCredits: DISPUTE_BOND_ALEO,
      });
      setTxId(tx);
      setStep("success");
    } catch (error) {
      console.error("Dispute failed:", error);
      setStep("failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg glass-panel !rounded-[2.5rem] border-white/10 p-0 overflow-hidden">
        <div className="p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              Dispute Resolution
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{marketTitle}</p>
          </DialogHeader>

          {step === "warning" ? (
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-3 text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">Stake Required</span>
                </div>
                <p className="text-sm text-amber-200/80 leading-relaxed">
                  To challenge the proposed outcome (<span className="text-white font-bold">"{proposedOutcomeLabel}"</span>),
                  you must stake <span className="text-white font-bold">{DISPUTE_BOND_ALEO} Credits</span> as a dispute bond.
                </p>
                <div className="pt-2">
                  <p className="text-[11px] text-amber-500/60 font-medium">
                    Disputing makes you the challenger. Oracle registration is only required if you also want to vote in quorum.
                    If the proposal is found incorrect, your bond is returned plus a portion of the proposer&apos;s slashed stake.
                    If the proposal was correct, your bond may be slashed.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1 rounded-2xl" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  onClick={handleDispute}
                  disabled={!publicKey}
                >
                  Stake {DISPUTE_BOND_ALEO} ALEO & Dispute
                </Button>
              </div>
              {!publicKey && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Connect your wallet to post the dispute bond.
                </p>
              )}
            </div>
          ) : step === "processing" ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-white font-bold">Initiating Dispute...</p>
                <p className="text-xs text-muted-foreground">Broadcasting transaction to Aleo network</p>
              </div>
            </div>
          ) : step === "success" ? (
            <div className="py-6 space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2">
                <ShieldAlert className="w-8 h-8 text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Dispute Broadcasted</h3>
                <p className="text-sm text-muted-foreground px-4">
                  You are now the challenger. The market has entered the quorum voting phase, and active oracles can now vote on the correct outcome.
                </p>
              </div>
              {txId && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Transaction ID</p>
                  <code className="block text-[11px] text-primary break-all font-mono leading-relaxed">
                    {txId}
                  </code>
                </div>
              )}
              <Button className="w-full rounded-2xl" onClick={handleClose}>
                Return to Market
              </Button>
            </div>
          ) : (
            <div className="py-6 space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-white">Dispute Failed</h3>
              <p className="text-sm text-muted-foreground">The transaction was rejected or you have insufficient private credits.</p>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setStep("warning")}>
                  Retry
                </Button>
                <Button className="flex-1 rounded-2xl" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
