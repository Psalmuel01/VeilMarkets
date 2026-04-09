import type { SupportedTokenKind } from "@/lib/constants";
import { Clock, Users, Timer, ChevronRight, History, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { Badge } from "@/components/ui/badge";
import { getOutcomeTone, normalizeOutcomeCount } from "@/lib/outcomes";

export interface Market {
  id: string;
  title: string;
  description: string;
  category: "Sports" | "Finance" | "Crypto" | "Politics" | "Entertainment" | "Tech" | "Other";
  status: "Open" | "Closed" | "Settled";
  closingTime: string;
  creationTime?: string;
  betsPlaced: number;
  marketType: number;
  outcomeCount: number;
  winningOutcome?: number;
  outcome?: string;
  tokenId: string;
  tokenTicker: string;
  tokenKind: SupportedTokenKind | null;
}

interface MarketCardProps {
  market: Market;
}

const categoryStyles: Record<string, string> = {
  Sports: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Finance: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Crypto: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Politics: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Entertainment: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  Tech: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Other: "text-slate-300 bg-slate-300/10 border-slate-300/20",
};

export function MarketCard({ market }: MarketCardProps) {
  const outcomeTone = typeof market.winningOutcome === "number"
    ? getOutcomeTone(market.marketType, normalizeOutcomeCount(market.outcomeCount), market.winningOutcome)
    : "neutral";

  return (
    <Link
      to={`/market/${market.id}`}
      className="block group"
    >
      <div className={cn(
        "glass-card p-6 rounded-[2rem] overflow-hidden relative",
        "flex flex-col h-full min-h-[280px]"
      )}>
        {/* Hover Gradient Effect */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          market.status === "Settled" && outcomeTone === "no"
            ? "bg-gradient-to-br from-destructive/10 via-transparent to-destructive/5"
            : market.status === "Settled" && outcomeTone === "yes"
              ? "bg-gradient-to-br from-success/10 via-transparent to-success/5"
              : "bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
        )} />
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
              categoryStyles[market.category] || categoryStyles.Other
            )}>
              {market.category}
            </span>
            {market.status === "Open" && (
              <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-white/5 bg-white/5 text-white/60">
                Live
              </span>
            )}
          </div>
          
          {market.status === "Settled" ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20">
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-success">Settled</span>
            </div>
          ) : market.status === "Closed" ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Closed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active</span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="flex-1 relative z-10">
          <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
            {market.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6 group-hover:text-muted-foreground/80 transition-colors">
            {market.description}
          </p>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/35">
            {market.tokenTicker}
          </p>
        </div>

        {/* Footer Stats */}
        <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-0.5">Traders</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold font-mono text-white">{market.betsPlaced}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-0.5">Ends In</span>
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-bold font-mono text-white/80">{market.closingTime}</span>
              </div>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Settled Outcome Banner */}
        {market.status === "Settled" && market.outcome && (
          <div className="absolute top-0 right-0 left-0 bottom-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6 text-center">
            <div className={cn(
              "px-6 py-3 rounded-2xl border",
              outcomeTone === "yes"
                ? "bg-success/20 border-success/30"
                : outcomeTone === "no"
                  ? "bg-destructive/20 border-destructive/30"
                  : "bg-primary/20 border-primary/30"
            )}>
              <div className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.2em] mb-1",
                outcomeTone === "yes"
                  ? "text-success/80"
                  : outcomeTone === "no"
                    ? "text-destructive/80"
                    : "text-primary/80"
              )}>Final Result</div>
              <div className={cn(
                "text-2xl font-bold font-heading",
                outcomeTone === "yes"
                  ? "text-success"
                  : outcomeTone === "no"
                    ? "text-destructive"
                    : "text-primary"
              )}>{market.outcome.toUpperCase()}</div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
