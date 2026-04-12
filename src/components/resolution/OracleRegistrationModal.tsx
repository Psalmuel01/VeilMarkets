import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Shield, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  useOracleLockedStakeQuery,
  useOracleStakeQuery,
  useRegisterOracleMutation,
  useUnstakeOracleMutation,
} from "@/hooks/useVeilQuery";

interface OracleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "input" | "processing" | "success" | "failed";

export function OracleRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: OracleRegistrationModalProps) {
  const registerMutation = useRegisterOracleMutation();
  const unstakeMutation = useUnstakeOracleMutation();
  const { data: oracleStakeData = 0, isLoading: oracleStatusLoading } = useOracleStakeQuery();
  const { data: lockedStakeData = 0, isLoading: oracleLockLoading } = useOracleLockedStakeQuery();
  const loading = registerMutation.isPending || unstakeMutation.isPending;
  const [step, setStep] = useState<Step>("input");
  const [stakeAmount, setStakeAmount] = useState<string>("20");
  const [unstakeAmount, setUnstakeAmount] = useState<string>("");
  const [txId, setTxId] = useState<string | null>(null);
  const [oracleStakeMicro, setOracleStakeMicro] = useState<number>(0);
  const [lockedStakeMicro, setLockedStakeMicro] = useState<number>(0);
  const [oracleActive, setOracleActive] = useState(false);
  const [lastAction, setLastAction] = useState<"register" | "unstake" | null>(null);

  const minStake = 20;
  const minStakeMicro = minStake * 1_000_000;
  const availableToUnstakeMicro = Math.max(0, oracleStakeMicro - lockedStakeMicro);
  const parsedStakeAmount = Number.parseFloat(stakeAmount);
  const parsedUnstakeAmount = Number.parseFloat(unstakeAmount);

  useEffect(() => {
    if (!isOpen) return;

    setStep("input");
    setTxId(null);
    setLastAction(null);
    setStakeAmount((prev) => prev || String(minStake));
    setUnstakeAmount("");
  }, [isOpen, minStake]);

  useEffect(() => {
    setOracleStakeMicro(oracleStakeData);
    setOracleActive(oracleStakeData >= minStakeMicro);
  }, [oracleStakeData, minStakeMicro]);

  useEffect(() => {
    setLockedStakeMicro(lockedStakeData);
  }, [lockedStakeData]);

  const handleRegister = async () => {
    const amount = Number.parseFloat(stakeAmount);
    if (Number.isNaN(amount) || amount < minStake) {
      toast.error(`Minimum add-stake transaction is ${minStake} credits.`);
      return;
    }

    setStep("processing");
    setLastAction("register");
    const resultTx = await registerMutation.mutateAsync(amount).catch(() => null);

    if (resultTx) {
      setTxId(resultTx);
      setStep("success");
      setOracleActive(true);
      onSuccess?.();
    } else {
      setStep("failed");
    }
  };

  const handleUnstakeAll = async () => {
    const amount = Number.parseFloat(unstakeAmount);
    if (availableToUnstakeMicro <= 0) {
      toast.error("No unlocked oracle stake is currently available to unstake.");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount to unstake.");
      return;
    }
    const amountMicro = Math.floor(amount * 1_000_000);
    if (amountMicro > availableToUnstakeMicro) {
      toast.error("Unstake amount exceeds your available unlocked stake.");
      return;
    }

    setStep("processing");
    setLastAction("unstake");
    const resultTx = await unstakeMutation.mutateAsync(amountMicro / 1_000_000).catch(() => null);

    if (resultTx) {
      setTxId(resultTx);
      setStep("success");
      const nextStake = Math.max(0, oracleStakeMicro - amountMicro);
      setOracleStakeMicro(nextStake);
      setOracleActive(nextStake >= minStakeMicro);
      onSuccess?.();
    } else {
      setStep("failed");
    }
  };

  const handleClose = () => {
    if (step === "processing") return; // Prevent closing while processing
    // Reset state on close if we finished
    if (step === "success" || step === "failed") {
      setTimeout(() => setStep("input"), 500);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Manage Oracle Stake
          </DialogTitle>
          <DialogDescription>
            Register, top up, and manage the unlocked portion of your oracle stake.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <AnimatePresence mode="wait">
            {step === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {oracleStatusLoading || oracleLockLoading ? (
                  <div className="py-10 text-center space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                    <p className="text-sm text-muted-foreground">Checking oracle stake status...</p>
                  </div>
                ) : oracleActive ? (
                  <>
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20 space-y-3">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-semibold">Active Oracle</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <p className="text-muted-foreground">
                          Total stake: <strong>{(oracleStakeMicro / 1_000_000).toLocaleString()} Credits</strong>
                        </p>
                        <p className="text-amber-500">
                          Locked stake: <strong>{(lockedStakeMicro / 1_000_000).toLocaleString()} Credits</strong>
                        </p>
                        <p className="text-muted-foreground">
                          Available to unstake: <strong>{(availableToUnstakeMicro / 1_000_000).toLocaleString()} Credits</strong>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vote rewards are credited back into your active oracle stake after you claim them on disputed resolved markets.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="add-stake-amount">Add More Stake (Credits)</Label>
                        <Input
                          id="add-stake-amount"
                          type="number"
                          min={minStake}
                          step="1"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className="font-mono text-lg"
                          placeholder="20"
                        />
                        <p className="text-xs text-muted-foreground">
                          Each top-up transaction must be at least {minStake} credits under the current contract.
                        </p>
                        <Button
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                          onClick={handleRegister}
                          disabled={loading || Number.isNaN(parsedStakeAmount) || parsedStakeAmount < minStake}
                        >
                          Add {stakeAmount || 0} Credits
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unstake-amount">Unstake Open Amount (Credits)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="unstake-amount"
                            type="number"
                            min="0"
                            step="0.000001"
                            value={unstakeAmount}
                            onChange={(e) => setUnstakeAmount(e.target.value)}
                            className="font-mono text-lg"
                            placeholder="0"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setUnstakeAmount((availableToUnstakeMicro / 1_000_000).toFixed(6))}
                            disabled={availableToUnstakeMicro <= 0 || loading}
                          >
                            Max
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You can unstake any unlocked amount. Locked proposal stake stays reserved until finalization.
                        </p>
                        <Button
                          className="w-full bg-destructive hover:bg-destructive/90 text-white"
                          onClick={handleUnstakeAll}
                          disabled={
                            loading
                            || availableToUnstakeMicro <= 0
                            || Number.isNaN(parsedUnstakeAmount)
                            || parsedUnstakeAmount <= 0
                            || Math.floor(parsedUnstakeAmount * 1_000_000) > availableToUnstakeMicro
                          }
                        >
                          Unstake Selected Amount
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Staking Requirements</span>
                      </div>
                      <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
                        <li>Minimum stake: <strong>{minStake} Credits</strong></li>
                        <li>Proposers lock the minimum stake per active proposal.</li>
                        <li>Winning-side vote rewards credit back into oracle stake.</li>
                        <li>Malicious proposals can be disputed, resulting in slashed bonds.</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="stake-amount">Stake Amount (Credits)</Label>
                      <Input
                        id="stake-amount"
                        type="number"
                        min={minStake}
                        step="1"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="font-mono text-lg"
                        placeholder="20"
                      />
                      {parseFloat(stakeAmount) < minStake && (
                        <p className="text-xs text-destructive">Amount must be at least {minStake} credits.</p>
                      )}
                    </div>

                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                      onClick={handleRegister}
                      disabled={loading || parseFloat(stakeAmount) < minStake || isNaN(parseFloat(stakeAmount))}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Stake {stakeAmount || 0} Credits & Register
                    </Button>
                  </>
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
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Registering Oracle</h3>
                  <p className="text-sm text-muted-foreground">
                    {lastAction === "unstake"
                      ? "Withdrawing your oracle stake and updating status..."
                      : "Securing your stake and generating proof..."}
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
                  <h3 className="text-lg font-semibold mb-2">
                    {lastAction === "unstake" ? "Stake Updated!" : "Stake Added!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {lastAction === "unstake"
                      ? "Your unlocked oracle stake has been withdrawn."
                      : oracleActive
                        ? "Your oracle stake has been increased."
                        : "You are now a registered Oracle. You can propose and dispute outcomes."}
                  </p>
                </div>

                {txId && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">Transaction ID</div>
                    <code className="text-sm font-mono text-primary break-all">
                      {txId}
                    </code>
                  </div>
                )}

                <Button onClick={handleClose} className="w-full">
                  Continue
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
                  <h3 className="text-lg font-semibold mb-2">Registration Failed</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The transaction timed out or was rejected by the network.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep("input")}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
