import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Loader2,
  Scale,
  Shield,
  Timer,
  Users,
  X,
} from "lucide-react";
import { formatDateFriendly } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { OracleRegistrationModal } from "@/components/resolution/OracleRegistrationModal";
import { getOutcomeLabel, getOutcomeLabels, getOutcomeTone, normalizeOutcomeCount } from "@/lib/outcomes";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import {
  useClaimOracleVoteRewardMutation,
  useDisputeResolutionMutation,
  useOracleLockedStakeQuery,
  useOracleStakeQuery,
  useOracleVoteStatusQuery,
  useProposeResolutionMutation,
  useResolutionDisputeQuery,
  useResolutionFinalizeRequirementsQuery,
  useVoteOnResolutionMutation,
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
    winningOutcome?: number;
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
type ActionKind = "propose" | "dispute" | "vote" | "claim" | null;

const DISPUTE_BOND_CREDITS = 20;
const MIN_ORACLE_STAKE_MICRO = 20_000_000;

const formatAleo = (micro: number) =>
  `${(micro / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: micro % 1_000_000 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ALEO`;

const shortAddress = (value: string | null | undefined) => {
  if (!value) return "Unknown";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
};

const buildActionCopy = (action: ActionKind) => {
  if (action === "propose") {
    return {
      processingTitle: "Submitting Resolution Proposal",
      processingBody: "Broadcasting your proposed outcome to the oracle contract.",
      successTitle: "Proposal Submitted",
      successBody: "The challenge window is now open. A challenger can post a bond if they disagree.",
    };
  }
  if (action === "dispute") {
    return {
      processingTitle: "Posting Dispute Bond",
      processingBody: "Becoming the challenger and opening quorum voting for this market.",
      successTitle: "Dispute Opened",
      successBody: "You are now the challenger. Registered oracles can vote on the correct outcome during quorum.",
    };
  }
  if (action === "vote") {
    return {
      processingTitle: "Casting Quorum Vote",
      processingBody: "Submitting your oracle vote and updating the dispute leader on-chain.",
      successTitle: "Vote Submitted",
      successBody: "Your vote weight is now part of the dispute quorum for this market.",
    };
  }
  if (action === "claim") {
    return {
      processingTitle: "Claiming Vote Reward",
      processingBody: "Settling your winning-side oracle reward back into active stake.",
      successTitle: "Reward Claimed",
      successBody: "Your oracle reward has been credited into active oracle stake.",
    };
  }
  return {
    processingTitle: "Submitting Transaction",
    processingBody: "Broadcasting your transaction to the Aleo network.",
    successTitle: "Transaction Confirmed",
    successBody: "The network has processed your action.",
  };
};

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
  const { publicKey } = useAleoPrograms();
  const proposeMutation = useProposeResolutionMutation();
  const disputeMutation = useDisputeResolutionMutation();
  const voteMutation = useVoteOnResolutionMutation();
  const claimVoterRewardMutation = useClaimOracleVoteRewardMutation();
  const oracleStakeQuery = useOracleStakeQuery();
  const oracleLockedStakeQuery = useOracleLockedStakeQuery();

  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("action");
  const [txId, setTxId] = useState<string | null>(null);
  const [isOracleModalOpen, setIsOracleModalOpen] = useState(false);
  const [didPropose, setDidPropose] = useState(false);
  const [lastAction, setLastAction] = useState<ActionKind>(null);

  const loading =
    proposeMutation.isPending
    || disputeMutation.isPending
    || voteMutation.isPending
    || claimVoterRewardMutation.isPending;

  const normalizedOutcomeCount = normalizeOutcomeCount(market.outcome_count);
  const outcomeLabels = getOutcomeLabels(market.market_type, normalizedOutcomeCount, market.outcome_labels);
  const selectedOutcomeSupply = selectedOutcome !== null ? (outcomeTotals[selectedOutcome] ?? 0) : null;
  const isOutcomeEmpty = selectedOutcome !== null && selectedOutcomeSupply === 0;

  const finalizeRequirementsQuery = useResolutionFinalizeRequirementsQuery(
    market.id,
    normalizedOutcomeCount,
    isOpen && Boolean(proposal),
  );
  const disputeInfoQuery = useResolutionDisputeQuery(
    market.id,
    isOpen && Boolean(proposal?.is_disputed),
  );
  const voteStatusQuery = useOracleVoteStatusQuery(
    market.id,
    isOpen && Boolean(publicKey && proposal?.is_disputed),
  );

  const oracleStakeMicro = oracleStakeQuery.data ?? 0;
  const oracleLockedStakeMicro = oracleLockedStakeQuery.data ?? 0;
  const availableOracleStakeMicro = Math.max(0, oracleStakeMicro - oracleLockedStakeMicro);
  const isOracleActive = isOracle || oracleStakeMicro >= MIN_ORACLE_STAKE_MICRO;
  const finalizeRequirements = finalizeRequirementsQuery.data ?? null;
  const disputeInfo = disputeInfoQuery.data ?? null;
  const voteStatus = voteStatusQuery.data ?? null;
  const isResolved = market.is_resolved;
  const userIsProposer = Boolean(publicKey && proposal?.proposer === publicKey);
  const userIsChallenger = Boolean(publicKey && disputeInfo?.challenger === publicKey);
  const userHasVoted = Boolean(voteStatus?.hasVoted);
  const winningOutcome =
    typeof market.winningOutcome === "number" && market.winningOutcome >= 0
      ? market.winningOutcome
      : null;
  const winningVoteMatchesUser = Boolean(userHasVoted && winningOutcome !== null && voteStatus?.outcome === winningOutcome);
  const canClaimVoteReward = Boolean(
    proposal?.is_disputed
    && isResolved
    && userHasVoted
    && winningVoteMatchesUser
    && voteStatus
    && !voteStatus.rewardClaimed,
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedOutcome(null);
      setDidPropose(false);
      setStep("action");
      setTxId(null);
      setLastAction(null);
    }
  }, [isOpen]);

  const handleAction = async (
    actionKind: Exclude<ActionKind, null>,
    actionFn: () => Promise<string | null | undefined>,
  ) => {
    setLastAction(actionKind);
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
    await handleAction("propose", async () => {
      const tx = await proposeMutation.mutateAsync({ marketId: market.id, outcome: selectedOutcome });
      if (tx) setDidPropose(true);
      return tx;
    });
  };

  const handleDispute = async () => {
    await handleAction("dispute", () =>
      disputeMutation.mutateAsync({ marketId: market.id, amountCredits: DISPUTE_BOND_CREDITS }),
    );
  };

  const handleVote = async () => {
    if (selectedOutcome === null) {
      toast.error("Select the outcome you want to support before voting.");
      return;
    }
    await handleAction("vote", () =>
      voteMutation.mutateAsync({ marketId: market.id, outcome: selectedOutcome }),
    );
  };

  const handleClaimVoteReward = async () => {
    await handleAction("claim", () => claimVoterRewardMutation.mutateAsync(market.id));
  };

  const actionCopy = buildActionCopy(lastAction);
  const isWindowActive = Boolean(proposal && nowTs < proposal.challenge_deadline && !proposal.is_disputed && !isResolved);
  const secondsToResolution =
    nowTs && market.resolution_time
      ? market.resolution_time - nowTs
      : null;

  const proposeDisabledReason = (() => {
    if (isResolved) return "Market is already resolved.";
    if (proposal) return "Resolution already proposed.";
    if (!nowTs) return "Waiting for network time...";
    if (secondsToResolution !== null && secondsToResolution > 0) {
      return `Proposals open ${formatDateFriendly(market.resolution_time)}.`;
    }
    if (!isOracleActive) return "Only active oracles can propose outcomes.";
    if (selectedOutcome === null) return "Select an outcome to propose.";
    if (didPropose) return "Proposal already submitted.";
    return "";
  })();

  const voteDisabledReason = (() => {
    if (isResolved) return "Market is already resolved.";
    if (!proposal?.is_disputed) return "Voting opens only after a proposal has been disputed.";
    if (!isOracleActive) return "Only active oracles can cast quorum votes.";
    if (userHasVoted) return "You have already voted on this dispute.";
    if (selectedOutcome === null) return "Select an outcome to vote for.";
    return "";
  })();

  const canShowSelection = !proposal || (proposal.is_disputed && !isResolved && !userHasVoted && isOracleActive);
  const showVoteAction = Boolean(proposal?.is_disputed && !isResolved);
  const connectWalletRequired = !publicKey;

  const settlementSummary = useMemo(() => {
    if (!proposal || !isResolved || winningOutcome === null) return null;

    if (!proposal.is_disputed) {
      return {
        title: "Proposal Confirmed",
        body: "The original proposal finalized without a successful dispute.",
        tone: "success" as const,
      };
    }

    if (winningOutcome !== proposal.proposed_outcome) {
      return {
        title: "Dispute Won",
        body: "Oracle voting overturned the original proposal. The challenger reward is credited into oracle stake during settlement.",
        tone: "amber" as const,
      };
    }

    if (finalizeRequirements?.fallbackMode) {
      return {
        title: "Fallback To Proposal",
        body: "The dispute did not reach quorum in time, so the market fell back to the original proposal after timeout.",
        tone: "muted" as const,
      };
    }

    return {
      title: "Proposal Upheld",
      body: "Dispute voting resolved in favor of the original proposal and funded the winning-side voter reward pool.",
      tone: "success" as const,
    };
  }, [finalizeRequirements?.fallbackMode, isResolved, proposal, winningOutcome]);

  const statusToneClass = (tone: "success" | "amber" | "muted") => {
    if (tone === "success") return "bg-success/10 border-success/20 text-success";
    if (tone === "amber") return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    return "bg-muted/30 border-border/50 text-muted-foreground";
  };

  const handleOpenOracleModal = () => {
    setIsOracleModalOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Market Resolution
            </DialogTitle>
            <DialogDescription>{market.title}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 pr-1">
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
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Proposal</p>
                          <p className="text-xl font-bold text-primary">
                            {getOutcomeLabel(
                              market.market_type,
                              normalizedOutcomeCount,
                              proposal.proposed_outcome,
                              market.outcome_labels,
                            ).toUpperCase()}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 justify-start sm:justify-end">
                            {proposal.is_disputed ? (
                              <>
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="font-medium text-amber-500">Disputed</span>
                              </>
                            ) : isWindowActive ? (
                              <>
                                <Timer className="w-4 h-4 text-amber-500" />
                                <span className="font-medium text-amber-500">Challenge Window</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-success" />
                                <span className="font-medium text-success">Awaiting Finalization</span>
                              </>
                            )}
                          </div>
                          {!proposal.is_disputed && (
                            <p className="text-xs text-muted-foreground sm:text-right">
                              Challenge deadline: {formatDateFriendly(proposal.challenge_deadline)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Proposer</p>
                          <p className="mt-1 font-mono text-sm text-foreground">{shortAddress(proposal.proposer)}</p>
                          {userIsProposer && (
                            <p className="mt-2 text-xs text-primary">You posted the original proposal for this market.</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Challenger</p>
                          <p className="mt-1 font-mono text-sm text-foreground">
                            {disputeInfo?.challenger ? shortAddress(disputeInfo.challenger) : "No challenger yet"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {disputeInfo
                              ? `${formatAleo(disputeInfo.stake)} dispute bond posted`
                              : "Anyone can become the challenger by posting the dispute bond during the challenge window."}
                          </p>
                        </div>
                      </div> */}

                      {settlementSummary && (
                        <div className={`rounded-xl border p-4 ${statusToneClass(settlementSummary.tone)}`}>
                          <p className="text-sm font-semibold">{settlementSummary.title}</p>
                          <p className="mt-1 text-xs leading-relaxed opacity-80">{settlementSummary.body}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Resolution Window</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Registered oracles can propose an outcome once the market reaches its resolution timestamp.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Your Oracle Status</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className={isOracleActive ? "text-success font-medium" : "text-amber-500 font-medium"}>
                            {isOracleActive ? "Active Oracle" : "Not Active"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Stake</span>
                          <span className="font-mono">{formatAleo(oracleStakeMicro)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Locked</span>
                          <span className="font-mono">{formatAleo(oracleLockedStakeMicro)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Available</span>
                          <span className="font-mono">{formatAleo(availableOracleStakeMicro)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isOracleActive ? (
                          <Button variant="outline" className="w-full" onClick={handleOpenOracleModal}>
                            Manage Stake
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" onClick={handleOpenOracleModal}>
                            Register Oracle
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-background/50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Your Role On This Market</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                          {publicKey ? "Wallet connected" : "Wallet not connected"}
                        </span>
                        {userIsProposer && (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                            Proposer
                          </span>
                        )}
                        {userIsChallenger && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
                            Challenger
                          </span>
                        )}
                        {userHasVoted && (
                          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
                            Voted
                          </span>
                        )}
                        {isOracleActive && !userHasVoted && (
                          <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
                            Eligible To Vote
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Disputing does not require oracle registration. Oracle stake is only required to propose outcomes and cast quorum votes.
                      </p>
                      {userHasVoted && voteStatus && voteStatus.outcome !== null && (
                        <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success space-y-1">
                          <p className="font-medium">
                            You voted for{" "}
                            {getOutcomeLabel(
                              market.market_type,
                              normalizedOutcomeCount,
                              voteStatus.outcome,
                              market.outcome_labels,
                            )}
                          </p>
                          <p className="text-success/80">Vote weight: {formatAleo(voteStatus.weightMicro)}</p>
                          {voteStatus.rewardClaimed && (
                            <p className="text-success/80">Reward already claimed.</p>
                          )}
                        </div>
                      )}
                      {userIsChallenger && !isResolved && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                          <p className="font-medium text-amber-400">You are the active challenger on this market.</p>
                          <p>
                            If oracle quorum overturns the original proposal, the challenger reward is credited into your oracle stake during settlement.
                          </p>
                        </div>
                      )}
                      {userIsProposer && proposal?.is_disputed && !isResolved && (
                        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary space-y-1">
                          <p className="font-medium">Your proposal is currently under dispute.</p>
                          <p className="text-primary/80">
                            The proposal bond remains locked until the dispute is settled on-chain.
                          </p>
                        </div>
                      )}
                      {userIsChallenger && settlementSummary?.title === "Dispute Won" && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                          Your challenge overturned the original proposal. The challenger reward was settled to your oracle stake.
                        </div>
                      )}
                    </div>
                  </div>

                  {proposal?.is_disputed && finalizeRequirements && (
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Dispute Quorum</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Voters</p>
                          <p className="mt-1 text-lg font-semibold">
                            {finalizeRequirements.voterCount} / {finalizeRequirements.minVoters}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Vote Weight</p>
                          <p className="mt-1 text-lg font-semibold">
                            {formatAleo(finalizeRequirements.totalVoteWeightMicro)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Quorum target {formatAleo(finalizeRequirements.quorumWeightMicro)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current Leader</p>
                          <p className="mt-1 text-lg font-semibold">
                            {finalizeRequirements.leadingOutcome !== null
                              ? getOutcomeLabel(
                                market.market_type,
                                normalizedOutcomeCount,
                                finalizeRequirements.leadingOutcome,
                                market.outcome_labels,
                              )
                              : "No votes yet"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            <span>Unique Voter Progress</span>
                            <span>{Math.min(100, Math.round((finalizeRequirements.voterCount / Math.max(1, finalizeRequirements.minVoters)) * 100))}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${Math.min(100, (finalizeRequirements.voterCount / Math.max(1, finalizeRequirements.minVoters)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            <span>Vote Weight Progress</span>
                            <span>{Math.min(100, Math.round((finalizeRequirements.totalVoteWeightMicro / Math.max(1, finalizeRequirements.quorumWeightMicro)) * 100))}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-success transition-all"
                              style={{
                                width: `${Math.min(100, (finalizeRequirements.totalVoteWeightMicro / Math.max(1, finalizeRequirements.quorumWeightMicro)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {finalizeRequirements.timeoutAt && (
                        <p className="text-xs text-muted-foreground">
                          If quorum is not met, the market can fall back to the original proposal after{" "}
                          {formatDateFriendly(finalizeRequirements.timeoutAt)}.
                        </p>
                      )}

                      {finalizeRequirements.blockers.length > 0 && !isResolved && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
                            Finalization blockers
                          </p>
                          <ul className="space-y-1 text-xs text-amber-100/80">
                            {finalizeRequirements.blockers.map((blocker) => (
                              <li key={blocker}>• {blocker}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {canShowSelection && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {!proposal
                            ? "Select the outcome to propose"
                            : proposal.is_disputed
                              ? "Select the outcome you want to support"
                              : "Select an outcome"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {!proposal
                            ? "The first proposal opens the challenge window."
                            : "Your vote weight follows your active oracle stake."}
                        </p>
                      </div>

                      <RadioGroup
                        value={selectedOutcome?.toString()}
                        onValueChange={(value) => setSelectedOutcome(Number.parseInt(value, 10))}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {outcomeLabels.map((label, index) => {
                            const optionId = `resolution-outcome-${index}`;
                            const tone = getOutcomeTone(market.market_type, normalizedOutcomeCount, index);
                            return (
                              <Label
                                key={optionId}
                                htmlFor={optionId}
                                className={`flex cursor-pointer flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 transition-all hover:bg-accent hover:text-accent-foreground ${selectedOutcome === index
                                    ? tone === "yes"
                                      ? "border-success bg-success/10"
                                      : tone === "no"
                                        ? "border-destructive bg-destructive/10"
                                        : "border-primary bg-primary/10"
                                    : ""
                                  }`}
                              >
                                <RadioGroupItem value={String(index)} id={optionId} className="sr-only" />
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
                          className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200"
                        >
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <p>
                            <strong>Heads up:</strong> this outcome currently has no trader-side shares. It can still be proposed or voted for, but it would not pay trader winnings if it resolved here.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {isResolved && (
                    <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-success">
                      This market is already resolved.
                    </div>
                  )}

                  {!isResolved && (
                    <div className="space-y-3">
                      {!proposal && (
                        <div className="space-y-3">
                          {!isOracleActive && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-muted-foreground">
                              Only active oracles can submit the first resolution proposal for a market.
                            </div>
                          )}

                          <Button
                            className={`w-full btn-glow-primary ${proposeDisabledReason ? "opacity-60" : ""}`}
                            onClick={handlePropose}
                            disabled={Boolean(proposeDisabledReason) || loading}
                          >
                            {didPropose ? "Proposal Submitted" : "Propose Outcome"}
                          </Button>

                          {proposeDisabledReason && (
                            <p className="text-center text-[10px] text-muted-foreground">{proposeDisabledReason}</p>
                          )}
                        </div>
                      )}

                      {/* {isWindowActive && (
                        <div className="space-y-3">
                          <Button
                            variant="outline"
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={handleDispute}
                            disabled={loading || connectWalletRequired}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Dispute Proposal (Bond {DISPUTE_BOND_CREDITS} ALEO)
                          </Button>
                          <p className="text-center text-[10px] text-muted-foreground">
                            Disputing makes you the challenger. Oracle registration is only required if you also want to vote in quorum.
                          </p>
                        </div>
                      )} */}

                      {showVoteAction && (
                        <div className="space-y-3">
                          {!isOracleActive && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-muted-foreground">
                              {userIsChallenger
                                ? "You are the challenger on this dispute, but you still need active oracle stake if you want to cast a quorum vote yourself."
                                : "Only active oracles can cast quorum votes on disputed markets."}
                            </div>
                          )}

                          <Button
                            variant="outline"
                            className="w-full border-primary/30 text-primary hover:bg-primary/10"
                            onClick={handleVote}
                            disabled={Boolean(voteDisabledReason) || loading}
                          >
                            <Scale className="w-4 h-4 mr-2" />
                            {userHasVoted ? "Vote Submitted" : "Vote On Dispute"}
                          </Button>

                          {voteDisabledReason && (
                            <p className="text-center text-[10px] text-muted-foreground">{voteDisabledReason}</p>
                          )}
                        </div>
                      )}

                      {canClaimVoteReward && (
                        <div className="space-y-3">
                          <Button
                            variant="outline"
                            className="w-full border-success/30 text-success hover:bg-success/10"
                            onClick={handleClaimVoteReward}
                            disabled={loading}
                          >
                            Claim Dispute Vote Reward
                          </Button>
                          <p className="text-center text-[10px] text-muted-foreground">
                            Winning-side dispute voters can claim their reward back into active oracle stake.
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
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{actionCopy.processingTitle}</h3>
                    <p className="text-sm text-muted-foreground">{actionCopy.processingBody}</p>
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
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-success bg-success/10"
                  >
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </motion.div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">{actionCopy.successTitle}</h3>
                    <p className="mb-4 text-sm text-muted-foreground">{actionCopy.successBody}</p>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                    <div className="mb-1 text-xs text-muted-foreground">Transaction ID</div>
                    <code className="break-all font-mono text-sm text-primary">{txId || "aleo1tx..."}</code>
                  </div>

                  <Button
                    onClick={() => {
                      setStep("action");
                      onClose();
                    }}
                    className="w-full"
                  >
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
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10"
                  >
                    <X className="h-10 w-10 text-destructive" />
                  </motion.div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">Transaction Failed</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      The transaction timed out or was rejected by the wallet or network.
                    </p>
                  </div>

                  <Button variant="outline" onClick={() => setStep("action")} className="w-full">
                    Back
                  </Button>
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
