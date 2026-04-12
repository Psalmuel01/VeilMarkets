import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, X, Wallet, ArrowRight, TrendingUp, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OutcomeCard } from "./OutcomeCard";
import { WagerSlider } from "./WagerSlider";
import { PrivacyChecklist } from "@/components/ui/PrivacyChecklist";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { cn } from "@/lib/utils";
import { resolveTokenDisplayName, resolveTokenTicker } from "@/lib/constants";
import { getOutcomeLabel, getOutcomeLabels, getOutcomeTone, normalizeOutcomeCount } from "@/lib/outcomes";
import {
  useBuyQuoteQuery,
  useMarketPoolQuery,
  usePlaceBetMutation,
  useProtocolConfigQuery,
  useTokenBalanceQuery,
} from "@/hooks/useVeilQuery";

interface PlaceBetModalProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketTitle: string;
  tokenId: string; // The specific token contract for this market
  marketType: number;
  outcomeCount: number;
  outcomeLabels?: string[];
  onBetPlaced?: () => void;
}

type Step = "select" | "confirm" | "processing" | "success" | "failed";

export const PlaceBetModal = ({
  open,
  onClose,
  marketId,
  marketTitle,
  tokenId,
  marketType,
  outcomeCount,
  outcomeLabels,
  onBetPlaced,
}: PlaceBetModalProps) => {
  const SLIPPAGE_BPS = 200;
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("select");
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [wagerAmount, setWagerAmount] = useState(5);
  const [txId, setTxId] = useState<string | null>(null);
  const { publicKey } = useAleoPrograms();
  const placeBetMutation = usePlaceBetMutation();
  const protocolConfigQuery = useProtocolConfigQuery();
  const quoteQuery = useBuyQuoteQuery(
    marketId,
    selectedOutcome,
    wagerAmount,
    SLIPPAGE_BPS,
    open && Boolean(publicKey),
  );
  const poolQuery = useMarketPoolQuery(marketId, open);
  const balanceQuery = useTokenBalanceQuery(tokenId, open && Boolean(publicKey));
  const balances = balanceQuery.data ?? null;
  const pool = poolQuery.data ?? null;
  const quote = quoteQuery.data ?? null;
  const tokenTicker = resolveTokenTicker(tokenId);
  const tokenDisplayName = resolveTokenDisplayName(tokenId);
  const normalizedOutcomeCount = normalizeOutcomeCount(outcomeCount);
  const resolvedOutcomeLabels = getOutcomeLabels(marketType, normalizedOutcomeCount, outcomeLabels);
  const availableRequiredBalance = balances ? balances.private : 0;
  const hasLowBalance = !!balances && availableRequiredBalance < wagerAmount;
  const minTradeMicro = protocolConfigQuery.data?.minTrade ?? 1_000_000;
  
  const isTradeTooSmall =
    selectedOutcome !== null &&
    Math.floor(wagerAmount * 1_000_000) > 0 &&
    Math.floor(wagerAmount * 1_000_000) < minTradeMicro;

  const isInsufficientLiquidity =
    selectedOutcome !== null &&
    pool &&
    (pool.lp_collateral ?? 0) <= 0;


  const quoteUnavailable =
    selectedOutcome !== null && !quote && !quoteQuery.isFetching;

  // We only show liquidity warnings as information, but it blocks the 'Review' button
  const quoteErrorMessage = isInsufficientLiquidity
    ? "Market needs liquidity before trading opens. Please add LP first."
    : isTradeTooSmall
    ? `Trade too small. Minimum trade is ${(minTradeMicro / 1_000_000).toFixed(6)} ${tokenTicker}.`
    : quoteQuery.isError
    ? "Unable to compute quote right now. Please retry."
    : null;

  const resetForm = () => {
    setStep("select");
    setSelectedOutcome(null);
    setWagerAmount(5);
    setTxId(null);
  };

  const handleSubmit = async () => {
    if (selectedOutcome === null) return;

    setStep("processing");

    try {
      const result = await placeBetMutation.mutateAsync({
        marketId,
        outcome: selectedOutcome,
        amountCredits: wagerAmount,
        tokenId,
        slippageBps: SLIPPAGE_BPS,
      });
      setTxId(result);
      setStep("success");
      onBetPlaced?.();
    } catch (_error) {
      setStep("failed");
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleViewBets = () => {
    handleClose();
    navigate("/dashboard");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-xl glass-panel !rounded-[2.5rem] border-white/10 p-0 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div className="relative p-8">
          <DialogHeader className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg btn-premium flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                    Buy Private <span className="text-gradient">Shares</span>
                  </DialogTitle>
                </div>
                <p className="text-sm text-muted-foreground font-medium pl-10">
                  {marketTitle}
                </p>
              </div>
              {/* <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/5 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button> */}
            </div>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!publicKey ? (
              <motion.div
                key="connect"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12 space-y-6"
              >
                <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                  <Wallet className="w-10 h-10 text-primary relative z-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
                    To trade private shares on Aleo, you'll need to link your wallet.
                  </p>
                </div>
                <ConnectWalletButton className="w-full max-w-sm mx-auto" />
              </motion.div>
            ) : step === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Outcome Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Select Outcome
                      </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <OutcomeCard
                      outcome={resolvedOutcomeLabels[0]}
                      selected={selectedOutcome === 0}
                      onSelect={() => setSelectedOutcome(0)}
                      tone={getOutcomeTone(marketType, normalizedOutcomeCount, 0)}
                    />
                    {resolvedOutcomeLabels.slice(1).map((label, index) => {
                      const outcomeIndex = index + 1;
                      return (
                        <OutcomeCard
                          key={label}
                          outcome={label}
                          selected={selectedOutcome === outcomeIndex}
                          onSelect={() => setSelectedOutcome(outcomeIndex)}
                          tone={getOutcomeTone(marketType, normalizedOutcomeCount, outcomeIndex)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Wager Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-accent" />
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Collateral Amount
                      </label>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">Max: 20 {tokenTicker}</span>
                  </div>
                  <WagerSlider
                    value={wagerAmount}
                    onChange={setWagerAmount}
                    tokenTicker={tokenTicker}
                  />
                </div>

                {hasLowBalance && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl bg-warning/5 border border-warning/10 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-warning/10 mt-0.5">
                        <Shield className="w-4 h-4 text-warning" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-warning uppercase tracking-wider">
                          Low Private Balance
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This market requires <span className="text-white font-bold">{wagerAmount} {tokenDisplayName}</span> from your private balance. Available private balance: <span className="text-white font-bold">{availableRequiredBalance.toLocaleString()} {tokenTicker}</span>.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isInsufficientLiquidity && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 mt-0.5">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-primary uppercase tracking-wider">
                          Liquidity Required
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This market needs initial LP funding before share trading can open. Current LP collateral: <span className="text-white font-bold">{((pool?.lp_collateral ?? 0) / 1_000_000).toFixed(4)} {tokenTicker}</span>.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Button
                  onClick={() => setStep("confirm")}
                  disabled={selectedOutcome === null || hasLowBalance || (quoteUnavailable && !isInsufficientLiquidity) || !!quoteErrorMessage || quoteQuery.isFetching}
                  className="w-full btn-premium h-16 rounded-[1.5rem] group"
                >
                  <span className="text-base font-bold">{hasLowBalance ? "Insufficient Balance" : isInsufficientLiquidity ? "Liquidity Needed" : "Review Trade"}</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                {(quoteErrorMessage || (quoteUnavailable && !isInsufficientLiquidity)) && (
                  <div className="px-1 text-xs text-warning">
                    {quoteErrorMessage || "Unable to load share quote for this market right now. Please retry."}
                  </div>
                )}
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Summary Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outcome</span>
                    <div className={cn(
                      "text-2xl font-bold",
                      selectedOutcome === null
                        ? "text-white"
                        : getOutcomeTone(marketType, normalizedOutcomeCount, selectedOutcome) === "yes"
                          ? "text-success"
                          : getOutcomeTone(marketType, normalizedOutcomeCount, selectedOutcome) === "no"
                            ? "text-destructive"
                            : "text-primary"
                    )}>
                      {getOutcomeLabel(marketType, normalizedOutcomeCount, selectedOutcome, outcomeLabels)}
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Collateral</span>
                    <div className="text-2xl font-bold text-white font-mono">
                      {wagerAmount} <span className="text-xs text-muted-foreground">{tokenTicker}</span>
                    </div>
                  </div>
                </div>

                {quote && (
                  <div className="p-6 rounded-3xl bg-success/5 border border-success/10 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-success/70">Estimated Shares / Min Receive</span>
                      <div className="text-2xl font-bold text-success font-mono">
                        {quote.sharesOut.toLocaleString()} <span className="text-xs">shares</span>
                      </div>
                      <div className="text-xs text-success/80 font-medium">
                        Min receive: {quote.minSharesOut.toLocaleString()} shares • Fee: {(quote.feeMicro / 1_000_000).toFixed(4)} {tokenTicker}
                      </div>
                    </div>
                    <TrendingUp className="w-10 h-10 text-success opacity-20" />
                  </div>
                )}

                {/* Privacy Proofing */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Privacy Verification
                    </label>
                  </div>
                  <div className="p-2 rounded-[2rem] bg-white/[0.02] border border-white/5">
                    <PrivacyChecklist />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => setStep("select")}
                    className="flex-1 h-14 rounded-2xl hover:bg-white/5 text-muted-foreground font-bold active:scale-95 transition-all outline-none border border-transparent hover:border-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-[2] btn-premium h-14 rounded-2xl font-bold"
                  >
                    Confirm Buy
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-16 text-center space-y-8"
              >
                <div className="relative mx-auto w-32 h-32">
                  <div className="absolute inset-0 rounded-[2.5rem] bg-primary/20 animate-pulse" />
                  <div className="relative w-32 h-32 rounded-[2.5rem] bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Preparing Private Trade</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Encrypting your transaction and generating a cryptographic proof to ensure your privacy.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-pulse"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-8 text-center space-y-8 overflow-hidden relative"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-success/50 to-transparent" />

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="mx-auto w-24 h-24 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shadow-[0_0_40px_hsla(160,84%,45%,0.2)]"
                >
                  <CheckCircle2 className="w-12 h-12 text-success" />
                </motion.div>

                <div className="space-y-3">
                  <h3 className="text-3xl font-black text-white tracking-tight">Trade Confirmed</h3>
                  <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                    Your private share purchase is now recorded on-chain and secured by ZK proofs.
                  </p>
                  <div className="flex justify-center pt-2">
                    <ZKBadge variant="verified" size="lg" animated />
                  </div>
                </div>

                <div className="max-w-md mx-auto p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Transaction Signature</span>
                    <code className="text-xs font-mono text-primary/80 break-all bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                      {txId || "aleo1tx..."}
                    </code>
                  </div>
                </div>

                <div className="flex gap-4 max-w-md mx-auto">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 h-14 rounded-2xl border-white/10 text-white font-bold"
                  >
                    BACK TO MARKET
                  </Button>
                  <Button
                    onClick={handleViewBets}
                    className="flex-[2] h-14 rounded-2xl btn-premium text-base font-black"
                  >
                    VIEW MY BETS
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "failed" && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-12 text-center space-y-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto w-32 h-32 rounded-[2.5rem] bg-destructive/10 border border-destructive/30 flex items-center justify-center shadow-[0_0_50px_hsla(0,84%,60%,0.15)]"
                >
                  <X className="w-16 h-16 text-destructive" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Transaction Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    We encountered an error while submitting your private trade. Please check your wallet and try again.
                  </p>
                </div>

                <div className="flex gap-4 p-2">
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="flex-1 h-14 rounded-2xl font-bold hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-[2] bg-destructive hover:bg-destructive/90 text-white font-bold h-14 rounded-2xl active:scale-95 transition-all"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  </>);
};
