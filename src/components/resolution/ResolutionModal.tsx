import React, { useEffect, useState } from "react";
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
import { AlertTriangle, CheckCircle2, Gavel, Timer, Shield, Loader2, X } from "lucide-react";
import { formatDateFriendly } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { OracleRegistrationModal } from "@/components/resolution/OracleRegistrationModal";
import { getOutcomeLabel, getOutcomeLabels, getOutcomeTone, normalizeOutcomeCount } from "@/lib/outcomes";
import {
  useClaimOracleVoteRewardMutation,
  useDisputeResolutionMutation,
  useProposeResolutionMutation,
} from "@/hooks/useVeilQuery";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: {
    id: string;
    title: string;
    close_time: number;
    resolution_time: number;
    is_resolved: boolean;
    market_type: number;
    outcome_count: number;
    outcome_labels?: string[];
  };
  proposal: {
    proposed_outcome: number;
    challenge_deadline: number;
    is_disputed: boolean;
    proposer: string;
  } | null;
  nowTs: number;
  isOracle: boolean;
  outcomeTotals?: number[];
  onUpdate: () => void;
}

type Step = "action" | "processing" | "success" | "failed";
const DISPUTE_BOND_CREDITS = 20;

export function ResolutionModal({
  isOpen,
  onClose,
  market,
  proposal,
  nowTs,
  isOracle,
  outcomeTotals = [],
  onUpdate,
}: ResolutionModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const proposeMutation = useProposeResolutionMutation();
  const disputeMutation = useDisputeResolutionMutation();
  const claimVoterRewardMutation = useClaimOracleVoteRewardMutation();
  const loading = proposeMutation.isPending || disputeMutation.isPending || claimVoterRewardMutation.isPending;
  const normalizedOutcomeCount = normalizeOutcomeCount(market.outcome_count);
  const outcomeLabels = getOutcomeLabels(market.market_type, normalizedOutcomeCount, market.outcome_labels);

  const [step, setStep] = useState<Step>("action");
  const [txId, setTxId] = useState<string | null>(null);
  const [isOracleModalOpen, setIsOracleModalOpen] = useState(false);
  const [didPropose, setDidPropose] = useState(false);
  const selectedOutcomeSupply = selectedOutcome !== null ? (outcomeTotals[selectedOutcome] ?? 0) : null;
  const isOutcomeEmpty = selectedOutcome !== null && selectedOutcomeSupply === 0;
  useEffect(() => {
    if (!isOpen) {
      setSelectedOutcome(null);
      setDidPropose(false);
    }
  }, [isOpen]);

  const handleAction = async (actionFn: () => Promise<string | null | undefined>) => {
    setStep("processing");
    const resultTx = await actionFn();
    if (resultTx) {
      setTxId(resultTx);
      setStep("success");
      onUpdate();
    } else {
      setStep("failed");
    }
  };

  const handlePropose = async () => {
    if (selectedOutcome === null) {
      toast.error("Please select an outcome");
      return;
    }
    await handleAction(async () => {
      const tx = await proposeMutation.mutateAsync({ marketId: market.id, outcome: selectedOutcome });
      if (tx) setDidPropose(true);
      return tx;
    });
  };

  const handleDispute = async () => {
    await handleAction(() =>
      disputeMutation.mutateAsync({ marketId: market.id, amountCredits: DISPUTE_BOND_CREDITS }),
    );
  };

  const handleClaimVoteReward = async () => {
    await handleAction(() => claimVoterRewardMutation.mutateAsync(market.id));
  };

  const isResolved = market.is_resolved;
  const isWindowActive = proposal && nowTs < proposal.challenge_deadline && !proposal.is_disputed && !isResolved;
  const isFinalizable = proposal && nowTs >= proposal.challenge_deadline && !proposal.is_disputed && !isResolved;
  const canPropose = !proposal && nowTs >= market.resolution_time && !isResolved;
  const secondsToResolution = nowTs && market.resolution_time
    ? market.resolution_time - nowTs
    : null;

  const proposeDisabledReason = (() => {
    if (isResolved) return "Market is already resolved.";
    if (proposal) return "Resolution already proposed.";
    if (!nowTs) return "Waiting for network time...";
    if (secondsToResolution !== null && secondsToResolution > 0) {
      return `Proposals open ${formatDateFriendly(market.resolution_time)}.`;
    }
    if (!isOracle) return "Only registered oracles can propose outcomes.";
    if (selectedOutcome === null) return "Select an outcome to propose.";
    if (didPropose) return "Proposal already submitted.";
    return "";
  })();

  const isProposeDisabled = !!proposeDisabledReason || loading;

  const handleOpenOracleModal = () => {
    setIsOracleModalOpen(true);
    onClose();
  };

  return (
    <>
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
            <AnimatePresence mode="wait">
              {step === "action" && (
                <motion.div
                  key="action"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                {proposal ? (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Proposal</p>
                        <p className="text-xl font-bold text-primary">
                          {getOutcomeLabel(
                            market.market_type,
                            normalizedOutcomeCount,
                            proposal.proposed_outcome,
                            market.outcome_labels,
                          ).toUpperCase()}
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
                          <span className="text-muted-foreground">Challenge Deadline</span>
                          <span className="font-mono">
                            {isWindowActive ? formatDateFriendly(proposal.challenge_deadline) : "Ended"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200/80 flex gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>
                  {canPropose 
                    ? "This market is closed. Registered oracles can now propose the finalized outcome. A short challenge window will follow."
                    : `This market is closed. Awaiting resolution block (${market.resolution_block}). Only ${market.resolution_block - currentHeight} blocks left.`}
                </p>
              </div> */}

                    <RadioGroup value={selectedOutcome?.toString()} onValueChange={(v) => setSelectedOutcome(parseInt(v, 10))}>
                      <div className="grid grid-cols-2 gap-4">
                        {outcomeLabels.map((label, index) => {
                          const optionId = `outcome-${index}`;
                          const tone = getOutcomeTone(market.market_type, normalizedOutcomeCount, index);
                          return (
                            <Label
                              key={optionId}
                              htmlFor={optionId}
                              className={`flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all ${
                                selectedOutcome === index
                                  ? tone === "yes"
                                    ? "border-success bg-success/10"
                                    : tone === "no"
                                      ? "border-destructive bg-destructive/10"
                                      : "border-primary bg-primary/10"
                                  : ""
                              }`}
                            >
                              <RadioGroupItem value={String(index)} id={optionId} className="sr-only" disabled={!isOracle}/>
                              <span className="text-lg font-bold">{label.toUpperCase()}</span>
                            </Label>
                          );
                        })}
                      </div>
                    </RadioGroup>

                    {isOutcomeEmpty && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex gap-3"
                      >
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <p>
                          <strong>Heads up:</strong> This outcome currently has zero matching trader shares. Resolution is still allowed. If it wins, no trader payouts will be created and the remaining pool value stays with LP return accounting.
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {isResolved && (
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-sm text-success">
                    This market is resolved.
                  </div>
                )}

                {!isResolved && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-3">
                      {!isOracle && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                          <div className="flex items-center gap-2 text-amber-500">
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-semibold">Oracle Credentials Required</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            You must be a registered Oracle to propose outcomes. This ensures high-quality resolutions via economic stake.
                            <button
                              type="button"
                              className="ml-1 text-amber-500 hover:text-amber-400 underline underline-offset-2"
                              onClick={handleOpenOracleModal}
                            >
                              Register Oracle
                            </button>
                            .
                          </p>
                        </div>
                      )}

                      {isOracle && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-success">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active Oracle
                          </div>
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                            onClick={handleOpenOracleModal}
                          >
                            Manage Stake
                          </button>
                        </div>
                      )}

                      <Button
                        className={`w-full btn-glow-primary ${isProposeDisabled ? "opacity-60" : ""}`}
                        onClick={handlePropose}
                        disabled={isProposeDisabled}
                      >
                        {proposal ? "Resolution Proposed" : didPropose ? "Proposal Submitted" : "Propose Outcome"}
                      </Button>

                      {proposeDisabledReason && (
                        <p className="text-[10px] text-center text-muted-foreground">
                          {proposeDisabledReason}
                        </p>
                      )}
                    </div>

                    {proposal && (
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground">
                        Finalization is available to the oracle owner on the market page.
                      </div>
                    )}

                    {isWindowActive && (
                      <div className="space-y-3">
                        {!isOracle ? (
                          <Button
                            variant="outline"
                            className="w-full border-amber-500/30 hover:bg-amber-500/10 text-amber-500"
                            onClick={handleOpenOracleModal}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Register as Oracle to Dispute
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full border-destructive/30 hover:bg-destructive/10 text-destructive"
                            onClick={handleDispute}
                            disabled={loading}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Dispute Proposal (Stake {DISPUTE_BOND_CREDITS} Credits)
                          </Button>
                        )}
                        <p className="text-[10px] text-center text-muted-foreground">
                          Disputes require a {DISPUTE_BOND_CREDITS} Credit bond during the challenge window.
                        </p>
                      </div>
                    )}

                    {proposal?.is_disputed && isResolved && isOracle && (
                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          className="w-full border-success/30 hover:bg-success/10 text-success"
                          onClick={handleClaimVoteReward}
                          disabled={loading}
                        >
                          Claim Dispute Vote Reward
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                          Winning-side dispute voters can claim rewards credited to oracle stake.
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                    Encrypting and propagating transaction...
                  </p>
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
                  <h3 className="text-lg font-semibold mb-2">Transaction Confirmed!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The network has processed your action.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Transaction ID</div>
                  <code className="text-sm font-mono text-primary break-all">
                    {txId || "aleo1tx..."}
                  </code>
                </div>

                <Button onClick={() => {
                  setStep("action");
                  onClose();
                }} className="w-full">
                  Close
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
                    The transaction timed out or was rejected by the network.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("action")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </DialogContent>
      </Dialog>
      <OracleRegistrationModal
        isOpen={isOracleModalOpen}
        onClose={() => setIsOracleModalOpen(false)}
        onSuccess={async () => {
          setIsOracleModalOpen(false);
          await onUpdate();
        }}
      />
    </>
  );
}
