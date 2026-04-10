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
  const [stakeAmount, setStakeAmount] = useState<string>("30");
  const [txId, setTxId] = useState<string | null>(null);
  const [oracleStakeMicro, setOracleStakeMicro] = useState<number>(0);
  const [lockedStakeMicro, setLockedStakeMicro] = useState<number>(0);
  const [oracleActive, setOracleActive] = useState(false);
  const [lastAction, setLastAction] = useState<"register" | "unstake" | null>(null);

  const minStake = 30;
  const minStakeMicro = minStake * 1_000_000;

  useEffect(() => {
    if (!isOpen) return;

    setStep("input");
    setTxId(null);
    setLastAction(null);
  }, [isOpen]);

  useEffect(() => {
    setOracleStakeMicro(oracleStakeData);
    setOracleActive(oracleStakeData >= minStakeMicro);
  }, [oracleStakeData, minStakeMicro]);

  useEffect(() => {
    setLockedStakeMicro(lockedStakeData);
  }, [lockedStakeData]);

  const handleRegister = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount < minStake) {
      toast.error(`Minimum stake is ${minStake} credits.`);
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
    if (oracleStakeMicro <= 0) {
      toast.error("No oracle stake found to unstake.");
      return;
    }

    setStep("processing");
    setLastAction("unstake");
    const resultTx = await unstakeMutation.mutateAsync(oracleStakeMicro / 1_000_000).catch(() => null);

    if (resultTx) {
      setTxId(resultTx);
      setStep("success");
      setOracleActive(false);
      setOracleStakeMicro(0);
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
            Become an Oracle
          </DialogTitle>
          <DialogDescription>
            Register as an Oracle to propose and dispute market resolutions.
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
                      <p className="text-xs text-muted-foreground">
                        Current stake: <strong>{(oracleStakeMicro / 1_000_000).toLocaleString()} Credits</strong>
                      </p>
                      {lockedStakeMicro > 0 && (
                        <p className="text-xs text-amber-500">
                          Locked stake: <strong>{(lockedStakeMicro / 1_000_000).toLocaleString()} Credits</strong> until your proposed market is finalized.
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {lockedStakeMicro > 0
                          ? "Unstaking is disabled while stake is locked by an active proposal."
                          : "Unstaking all credits will remove your oracle status immediately."}
                      </p>
                    </div>

                    <Button
                      className="w-full bg-destructive hover:bg-destructive/90 text-white"
                      onClick={handleUnstakeAll}
                      disabled={loading || oracleStakeMicro <= 0 || lockedStakeMicro > 0}
                    >
                      {lockedStakeMicro > 0 ? "Stake Locked Until Finalization" : "Unstake All & Remove Oracle Status"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Staking Requirements</span>
                      </div>
                      <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
                        <li>Minimum stake: <strong>{minStake} ALEO Credits</strong></li>
                        <li>Oracles earn rewards for correct proposals.</li>
                        <li>Malicious proposals can be disputed, resulting in slashed bonds.</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="stake-amount">Stake Amount (ALEO)</Label>
                      <Input
                        id="stake-amount"
                        type="number"
                        min={minStake}
                        step="1"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="font-mono text-lg"
                        placeholder="30"
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
                    {lastAction === "unstake" ? "Unstake Successful!" : "Registration Successful!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {lastAction === "unstake"
                      ? "Your stake has been withdrawn and oracle status was removed."
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
