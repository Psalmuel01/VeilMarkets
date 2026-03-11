import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Gavel, Timer } from "lucide-react";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { toast } from "sonner";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: {
    id: string;
    title: string;
    close_block: number;
    resolution_block: number;
  };
  proposal: {
    proposed_outcome: number;
    challenge_deadline: number;
    is_disputed: boolean;
    proposer: string;
  } | null;
  currentHeight: number;
  onUpdate: () => void;
}

export function ResolutionModal({
  isOpen,
  onClose,
  market,
  proposal,
  currentHeight,
  onUpdate,
}: ResolutionModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const { proposeResolution, disputeResolution, resolveMarket, loading } = useAleoPrograms();

  const handlePropose = async () => {
    if (selectedOutcome === null) {
      toast.error("Please select an outcome");
      return;
    }
    const txId = await proposeResolution(market.id, selectedOutcome);
    if (txId) {
      onUpdate();
      onClose();
    }
  };

  const handleDispute = async () => {
    const txId = await disputeResolution(market.id, 100); // 100 Credits bond as per contract
    if (txId) {
      onUpdate();
      onClose();
    }
  };

  const handleFinalize = async () => {
    const outcome = proposal ? proposal.proposed_outcome : selectedOutcome;
    if (outcome === null) return;
    
    const txId = await resolveMarket(market.id, outcome);
    if (txId) {
      onUpdate();
      onClose();
    }
  };

  const isWindowActive = proposal && currentHeight < proposal.challenge_deadline && !proposal.is_disputed;
  const isFinalizable = proposal && currentHeight >= proposal.challenge_deadline && !proposal.is_disputed;
  const canPropose = !proposal && currentHeight >= market.close_block;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            Market Resolution
          </DialogTitle>
          <DialogDescription>
            {market.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {proposal ? (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Proposal</p>
                  <p className="text-xl font-bold text-primary">
                    {proposal.proposed_outcome === 1 ? "YES" : "NO"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    {proposal.is_disputed ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-sm font-medium text-destructive">Disputed</span>
                      </>
                    ) : isWindowActive ? (
                      <>
                        <Timer className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-medium text-amber-500">Challenge Window</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        <span className="text-sm font-medium text-success">Confirmed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!proposal.is_disputed && (
                <div className="pt-3 border-t border-border/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Blocks remaining</span>
                    <span className="font-mono">
                      {isWindowActive ? (proposal.challenge_deadline - currentHeight).toLocaleString() : "None"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200/80 flex gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>
                  This market is closed. Registered oracles can now propose the finalized outcome. 
                  A 24h challenge window will follow.
                </p>
              </div>

              <RadioGroup value={selectedOutcome?.toString()} onValueChange={(v) => setSelectedOutcome(parseInt(v))}>
                <div className="grid grid-cols-2 gap-4">
                  <Label
                    htmlFor="yes"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all ${
                      selectedOutcome === 1 ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem value="1" id="yes" className="sr-only" />
                    <span className="text-lg font-bold">YES</span>
                  </Label>
                  <Label
                    htmlFor="no"
                    className={`flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all ${
                      selectedOutcome === 0 ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem value="0" id="no" className="sr-only" />
                    <span className="text-lg font-bold">NO</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {canPropose && (
              <Button 
                className="w-full btn-glow-primary" 
                onClick={handlePropose}
                disabled={loading || selectedOutcome === null}
              >
                Propose Outcome
              </Button>
            )}

            {isWindowActive && (
              <div className="space-y-3">
                <Button 
                  variant="outline"
                  className="w-full border-destructive/30 hover:bg-destructive/10 text-destructive"
                  onClick={handleDispute}
                  disabled={loading}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Dispute Proposal (Stake 100 Credits)
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Challenger gets proposer's bond if the dispute is successful.
                </p>
              </div>
            )}

            {isFinalizable && (
              <Button 
                className="w-full btn-glow-success" 
                onClick={handleFinalize}
                disabled={loading}
              >
                Finalize & Distribute Payouts
              </Button>
            )}

            {!canPropose && !proposal && (
              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center text-sm text-muted-foreground">
                <Timer className="w-5 h-5 mx-auto mb-2 opacity-50" />
                Wait for close block ({market.close_block}) to propose.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
