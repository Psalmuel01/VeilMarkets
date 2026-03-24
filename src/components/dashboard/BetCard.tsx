import { CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface UserBet {
  id: string;
  marketId: string;
  marketTitle: string;
  category: string;
  status: "Pending" | "Won" | "Lost" | "Cancelled";
  outcome: "Yes" | "No";
  placedAt: string;
  canClaim: boolean;
  claimedAmount?: number;
  claimedAt?: string;
  isClaimed?: boolean;
}

interface BetCardProps {
  bet: UserBet;
  onClaim?: (marketId: string) => void;
}

const statusConfig = {
  Pending: {
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    label: "Active Prediction",
  },
  Won: {
    color: "text-success bg-success/10 border-success/20",
    label: "Winning Prediction",
  },
  Lost: {
    color: "text-destructive bg-destructive/10 border-destructive/20",
    label: "Incorrect Prediction",
  },
  Cancelled: {
    color: "text-muted-foreground bg-white/5 border-white/10",
    label: "Market Cancelled",
  },
};

export function BetCard({ bet, onClaim }: BetCardProps) {
  const config = statusConfig[bet.status];
  const hasClaimed = Boolean(bet.isClaimed) || typeof bet.claimedAmount === "number";
  const claimedLabel =
    typeof bet.claimedAmount === "number" ? `+${bet.claimedAmount.toFixed(4)} ALEO` : "Claimed";

  return (
    <div className={cn(
      "glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300"
    )}>
      {/* Decorative Gradient Pulse */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all duration-500 rounded-full" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", config.color)}>
            {config.label}
          </Badge>
          {hasClaimed && (
            <Badge variant="outline" className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-success/20 text-success border-success/30 animate-pulse">
              Redeemed
            </Badge>
          )}
          <Badge variant="outline" className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 border-white/5 bg-white/[0.03]">
            {bet.category}
          </Badge>
        </div>
        <ZKBadge variant="proof" size="sm" />
      </div>

      <Link
        to={`/market/${bet.marketId}`}
        className="block text-xl font-black text-white hover:text-primary transition-colors mb-4 line-clamp-2 leading-tight tracking-tight"
      >
        {bet.marketTitle}
      </Link>

      <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-8">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary/60" />
          <span className="font-mono text-xs tracking-normal font-medium">{bet.placedAt}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/20">Wager:</span>
          <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">{bet.outcome} Outcome</span>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 space-y-3 relative z-10">
        {/* Encrypted bet info */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Protected Wager</span>
          <span className="font-mono text-xs text-white/40 encrypted-text">•••••• ALEO</span>
        </div>

        {bet.status === "Won" && !hasClaimed && (
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-success/60">Estimated Payout</span>
            <span className="font-mono text-xs text-success bg-success/5 px-2 py-1 rounded-lg border border-success/10">+•••••• ALEO</span>
          </div>
        )}

        {hasClaimed && (
          <div className="p-4 rounded-2xl bg-success/5 border border-success/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Assets Transferred
              </div>
              <span className="font-mono text-sm font-black text-success">{claimedLabel}</span>
            </div>
            {bet.claimedAt && (
              <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground/40 border-t border-success/10 pt-2">
                <span className="uppercase tracking-widest">Settlement Time</span>
                <span className="font-mono">{bet.claimedAt}</span>
              </div>
            )}
          </div>
        )}

        {bet.canClaim && !hasClaimed && (
          <Button
            onClick={() => onClaim?.(bet.marketId)}
            className="w-full h-14 rounded-2xl btn-premium mt-2 group/btn"
          >
            <span className="font-black uppercase tracking-[0.2em] text-xs">Claim Settlement Rewards</span>
            <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
          </Button>
        )}
      </div>
    </div>
  );
}
