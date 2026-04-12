import { useEffect, useMemo, useState } from "react";
import { Coins, Loader2, Wallet } from "lucide-react";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { useWithdrawLiquidityMutation } from "@/hooks/useVeilQuery";
import { resolveTokenTicker } from "@/lib/constants";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WithdrawLiquidityModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  tokenId: string;
  lpShares: number;
  estimatedWithdrawableMicro: number;
}

type Step = "form" | "processing" | "success" | "failed";

const SLIPPAGE_BPS = 200;

export const WithdrawLiquidityModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  tokenId,
  lpShares,
  estimatedWithdrawableMicro,
}: WithdrawLiquidityModalProps) => {
  const { publicKey } = useAleoPrograms();
  const withdrawMutation = useWithdrawLiquidityMutation();
  const tokenTicker = resolveTokenTicker(tokenId);
  const maxTokenAmount = lpShares / 1_000_000;

  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(maxTokenAmount > 0 ? maxTokenAmount.toFixed(4) : "");
  }, [maxTokenAmount, open]);

  const withdrawShares = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.max(0, Math.floor(parsed * 1_000_000));
  }, [amount]);

  const invalidAmount = withdrawShares <= 0 || withdrawShares > lpShares;
  const estimatedPayoutMicro = useMemo(() => {
    if (lpShares <= 0 || withdrawShares <= 0) return 0;
    return Math.floor((estimatedWithdrawableMicro * withdrawShares) / lpShares);
  }, [estimatedWithdrawableMicro, lpShares, withdrawShares]);
  const minPayoutMicro = Math.floor((estimatedPayoutMicro * (10_000 - SLIPPAGE_BPS)) / 10_000);

  const resetState = () => {
    setStep("form");
    setTxId(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleWithdraw = async () => {
    if (invalidAmount) return;
    setStep("processing");
    try {
      const result = await withdrawMutation.mutateAsync({
        marketId,
        lpShares: withdrawShares,
        minPayoutMicro,
      });
      setTxId(result.transactionId);
      setStep("success");
    } catch {
      setStep("failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg glass-panel !rounded-[2rem] border-white/10 p-0 overflow-hidden">
        <div className="p-7 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-success" />
              Remove Liquidity
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{marketTitle}</p>
          </DialogHeader>

          {!publicKey ? (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Connect your wallet to remove liquidity.</p>
              <ConnectWalletButton className="w-full" />
            </div>
          ) : step === "form" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Max removable</span>
                  <span className="font-semibold text-white">
                    {maxTokenAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenTicker}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estimated proceeds</span>
                  <span className="font-semibold text-white">
                    {(estimatedPayoutMicro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                    {tokenTicker}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Min receive after slippage guard: {(minPayoutMicro / 1_000_000).toFixed(4)} {tokenTicker}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                  Liquidity to remove ({tokenTicker})
                </label>
                <div className="flex gap-2">
                  <Input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAmount(maxTokenAmount.toFixed(4))}
                    disabled={maxTokenAmount <= 0}
                  >
                    Max
                  </Button>
                </div>
                {invalidAmount && (
                  <div className="text-xs text-warning">Enter an amount between 0 and your available LP shares.</div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="flex-1 btn-premium" onClick={handleWithdraw} disabled={invalidAmount}>
                  Withdraw
                </Button>
              </div>
            </div>
          ) : step === "processing" ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Submitting withdrawal transaction...</p>
            </div>
          ) : step === "success" ? (
            <div className="py-4 space-y-3 text-center">
              <h3 className="text-lg font-bold text-white">Liquidity Removed</h3>
              {txId && (
                <code className="block rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-primary break-all">
                  {txId}
                </code>
              )}
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="py-4 space-y-3 text-center">
              <h3 className="text-lg font-bold text-white">Withdrawal Failed</h3>
              <p className="text-sm text-muted-foreground">The transaction was rejected or timed out.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                  Retry
                </Button>
                <Button className="flex-1" onClick={handleClose}>
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
