import { useMemo, useState } from "react";
import { Loader2, TrendingDown, Wallet } from "lucide-react";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { useSellQuoteQuery, useSellSharesMutation } from "@/hooks/useVeilQuery";
import { resolveTokenTicker } from "@/lib/constants";
import { getOutcomeLabel, normalizeOutcomeCount } from "@/lib/outcomes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

interface SellSharesModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  tokenId: string;
  outcome: number;
  marketType: number;
  outcomeCount: number;
  outcomeLabels?: string[];
  onSold?: () => void;
}

type Step = "form" | "processing" | "success" | "failed";

export const SellSharesModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  tokenId,
  outcome,
  marketType,
  outcomeCount,
  outcomeLabels,
  onSold,
}: SellSharesModalProps) => {
  const SLIPPAGE_BPS = 200;
  const tokenTicker = resolveTokenTicker(tokenId);
  const normalizedOutcomeCount = normalizeOutcomeCount(outcomeCount);
  const outcomeLabel = useMemo(
    () => getOutcomeLabel(marketType, normalizedOutcomeCount, outcome, outcomeLabels),
    [marketType, normalizedOutcomeCount, outcome, outcomeLabels],
  );
  const [step, setStep] = useState<Step>("form");
  const [sharesToSell, setSharesToSell] = useState("1");
  const [txId, setTxId] = useState<string | null>(null);
  const { publicKey } = useAleoPrograms();
  const sellMutation = useSellSharesMutation();
  const sellAmount = Math.max(1, Math.floor(Number(sharesToSell) || 0));
  const quoteQuery = useSellQuoteQuery(
    marketId,
    outcome,
    sellAmount,
    SLIPPAGE_BPS,
    open && Boolean(publicKey),
  );
  const quote = quoteQuery.data ?? null;

  const resetState = () => {
    setStep("form");
    setSharesToSell("1");
    setTxId(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSell = async () => {
    setStep("processing");
    try {
      const result = await sellMutation.mutateAsync({
        marketId,
        sharesToSell: sellAmount,
        slippageBps: SLIPPAGE_BPS,
      });
      setTxId(result.transactionId);
      setStep("success");
      onSold?.();
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
              <TrendingDown className="w-5 h-5 text-primary" />
              Sell Shares
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{marketTitle}</p>
          </DialogHeader>

          {!publicKey ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your wallet to sell position shares.
              </p>
              <ConnectWalletButton className="w-full" />
            </div>
          ) : step === "form" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">Outcome</div>
                <div className="text-sm font-semibold text-white">{outcomeLabel}</div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                  Shares To Sell
                </label>
                <Input
                  value={sharesToSell}
                  onChange={(event) => setSharesToSell(event.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="1"
                />
              </div>

              {quote && (
                <div className="rounded-2xl border border-success/20 bg-success/5 p-4 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-success/70 font-bold">Estimated Proceeds</div>
                  <div className="text-xl font-bold text-success">
                    {(quote.netPayoutMicro / 1_000_000).toFixed(4)} {tokenTicker}
                  </div>
                  <div className="text-xs text-success/80">
                    Min receive: {(quote.minPayoutMicro / 1_000_000).toFixed(4)} {tokenTicker} • Fee: {(quote.feeMicro / 1_000_000).toFixed(4)} {tokenTicker}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 btn-premium"
                  onClick={handleSell}
                  disabled={!quote || quoteQuery.isFetching || sellAmount <= 0}
                >
                  Sell Shares
                </Button>
              </div>
            </div>
          ) : step === "processing" ? (
            <div className="py-10 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Submitting private sell transaction...</p>
            </div>
          ) : step === "success" ? (
            <div className="py-4 space-y-4 text-center">
              <h3 className="text-lg font-bold text-white">Shares Sold</h3>
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
            <div className="py-4 space-y-4 text-center">
              <h3 className="text-lg font-bold text-white">Sell Failed</h3>
              <p className="text-sm text-muted-foreground">
                The transaction was rejected or timed out.
              </p>
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
