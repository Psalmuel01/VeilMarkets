import { Clock, Users, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { Badge } from "@/components/ui/badge";

export interface Market {
  id: string;
  title: string;
  description: string;
  category: "Sports" | "Finance" | "Crypto" | "Politics" | "Entertainment";
  status: "Open" | "Closed" | "Settled";
  closingTime: string;
  betsPlaced: number;
  outcome?: "Yes" | "No";
}

interface MarketCardProps {
  market: Market;
}

const categoryColors = {
  Sports: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Finance: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Crypto: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Politics: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Entertainment: "bg-pink-500/10 text-pink-400 border-pink-500/30",
};

const statusColors = {
  Open: "bg-success/10 text-success border-success/30",
  Closed: "bg-warning/10 text-warning border-warning/30",
  Settled: "bg-primary/10 text-primary border-primary/30",
};

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Link
      to={`/market/${market.id}`}
      className={cn(
        "block p-5 rounded-xl",
        "bg-card border border-border/50",
        "hover:border-primary/30 hover:bg-card/80",
        "transition-all duration-300",
        "group"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-[10px] uppercase tracking-wider", categoryColors[market.category])}
          >
            {market.category}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn("text-[10px] uppercase tracking-wider", statusColors[market.status])}
          >
            {market.status}
          </Badge>
        </div>
        {market.status === "Settled" && <ZKBadge variant="verified" size="sm" />}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {market.title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {market.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{market.closingTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{market.betsPlaced} bets</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Enter Market
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {market.status === "Settled" && market.outcome && (
        <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Resolved Outcome</span>
            <span className="text-sm font-semibold text-success">{market.outcome}</span>
          </div>
        </div>
      )}
    </Link>
  );
}
