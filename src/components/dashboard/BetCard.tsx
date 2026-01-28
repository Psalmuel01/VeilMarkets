import { Clock, ExternalLink } from "lucide-react";
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
  status: "Pending" | "Won" | "Lost";
  outcome: "Yes" | "No";
  placedAt: string;
  canClaim: boolean;
}

interface BetCardProps {
  bet: UserBet;
  onClaim?: () => void;
}

const statusConfig = {
  Pending: {
    color: "bg-warning/10 text-warning border-warning/30",
    label: "Pending",
  },
  Won: {
    color: "bg-success/10 text-success border-success/30",
    label: "Won",
  },
  Lost: {
    color: "bg-destructive/10 text-destructive border-destructive/30",
    label: "Lost",
  },
};

export function BetCard({ bet, onClaim }: BetCardProps) {
  const config = statusConfig[bet.status];

  return (
    <div className={cn(
      "p-5 rounded-xl bg-card border border-border/50",
      "hover:border-border transition-colors"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[10px] uppercase", config.color)}>
            {config.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground border-border">
            {bet.category}
          </Badge>
        </div>
        <ZKBadge variant="proof" size="sm" />
      </div>

      <Link 
        to={`/market/${bet.marketId}`}
        className="block text-lg font-semibold text-foreground hover:text-primary transition-colors mb-2 line-clamp-2"
      >
        {bet.marketTitle}
      </Link>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{bet.placedAt}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Your bet:</span>
          <span className="font-semibold text-foreground">{bet.outcome}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-border/50 space-y-3">
        {/* Encrypted bet info */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Wager Amount</span>
          <span className="font-mono encrypted-text">•••••• ALEO</span>
        </div>
        
        {bet.status === "Won" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Winnings</span>
            <span className="font-mono text-success">+•••••• ALEO</span>
          </div>
        )}

        {bet.canClaim && (
          <Button onClick={onClaim} className="w-full btn-glow-primary mt-2">
            Claim Winnings
          </Button>
        )}
      </div>
    </div>
  );
}
