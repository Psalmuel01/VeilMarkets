import { useEffect, useState } from "react";
import { Coins, Loader2, Wallet } from "lucide-react";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import {
  useFundPoolMutation,
  useMarketPoolQuery,
  useMarketUserPositionQuery,
  useProtocolConfigQuery,
} from "@/hooks/useVeilQuery";
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

interface FundPoolModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  tokenId: string;
  marketProgramId?: string;
  onFunded?: () => void;
}

type Step = "form" | "processing" | "success" | "failed";

export const FundPoolModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  tokenId,
  marketProgramId,
  onFunded,
}: FundPoolModalProps) => {
  const tokenTicker = resolveTokenTicker(tokenId);
  const { publicKey } = useAleoPrograms();
  const fundPoolMutation = useFundPoolMutation();
  const protocolConfigQuery = useProtocolConfigQuery();
  const poolQuery = useMarketPoolQuery(marketId, open && Boolean(publicKey), marketProgramId);
  const positionQuery = useMarketUserPositionQuery(marketId, null, open && Boolean(publicKey), marketProgramId);
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("10");
  const [txId, setTxId] = useState<string | null>(null);
  const poolCollateral = (poolQuery.data?.total_collateral ?? 0) / 1_000_000;
  const lpCollateral = (positionQuery.data?.lpCollateral ?? 0) / 1_000_000;
  const lpFeeAccrued = (positionQuery.data?.lpFeeAccrued ?? 0) / 1_000_000;
  const lpWithdrawable = (positionQuery.data?.lpWithdrawable ?? 0) / 1_000_000;
  const lpShares = positionQuery.data?.lpShares ?? 0;
  const minLiquidity = (protocolConfigQuery.data?.minLiquidity ?? 10_000_000) / 1_000_000;

  useEffect(() => {
    if (!open) return;
    setAmount((current) => {
      const parsed = Number.parseFloat(current);
      if (Number.isFinite(parsed) && parsed >= minLiquidity) return current;
      return minLiquidity.toFixed(minLiquidity % 1 === 0 ? 0 : 2);
    });
  }, [minLiquidity, open]);

  const resetState = () => {
    setStep("form");
    setAmount("10");
    setTxId(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFund = async () => {
    const amountCredits = Number.parseFloat(amount);
    if (!Number.isFinite(amountCredits) || amountCredits <= 0) return;

    setStep("processing");
    try {
      const tx = await fundPoolMutation.mutateAsync({
        marketId,
        amountCredits,
        tokenId,
        marketProgramId,
      });
      setTxId(tx);
      setStep("success");
      onFunded?.();
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
              <Coins className="w-5 h-5 text-primary" />
              Fund Liquidity Pool
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{marketTitle}</p>
          </DialogHeader>

          {!publicKey ? (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Connect your wallet to provide liquidity.</p>
              <ConnectWalletButton className="w-full" />
            </div>
          ) : step === "form" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Pool</span>
                  <span className="font-semibold text-white">
                    {poolCollateral.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenTicker}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Your LP Position</span>
                  <span className="font-semibold text-white">
                    {lpCollateral.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenTicker}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  LP shares tracked: {(lpShares / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 })}.
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Accrued LP fees: {lpFeeAccrued.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenTicker}.
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Estimated withdrawable: {lpWithdrawable.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenTicker}.
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Minimum liquidity: {minLiquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenTicker}.
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                  Amount ({tokenTicker})
                </label>
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="10"
                />
                <p className="text-[11px] text-muted-foreground">
                  The contract currently requires at least {minLiquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenTicker} to seed or add liquidity.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="flex-1 btn-premium" onClick={handleFund}>
                  Fund Pool
                </Button>
              </div>
            </div>
          ) : step === "processing" ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Submitting liquidity transaction...</p>
            </div>
          ) : step === "success" ? (
            <div className="py-4 space-y-3 text-center">
              <h3 className="text-lg font-bold text-white">Liquidity Added</h3>
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
              <h3 className="text-lg font-bold text-white">Funding Failed</h3>
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
