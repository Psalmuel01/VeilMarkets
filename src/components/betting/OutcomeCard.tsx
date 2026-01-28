import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutcomeCardProps {
  outcome: "Yes" | "No";
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  isWinner?: boolean;
}

export function OutcomeCard({ 
  outcome, 
  selected, 
  onSelect,
  disabled = false,
  isWinner = false
}: OutcomeCardProps) {
  const isYes = outcome === "Yes";
  
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative flex-1 p-6 rounded-xl border-2 transition-all duration-300",
        "flex flex-col items-center justify-center gap-3",
        "hover:scale-[1.02] active:scale-[0.98]",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        selected && isYes && "border-success bg-success/10",
        selected && !isYes && "border-destructive bg-destructive/10",
        !selected && "border-border/50 bg-card hover:border-primary/30",
        isWinner && "border-success bg-success/10 ring-2 ring-success/50"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        isYes ? "bg-success/20" : "bg-destructive/20"
      )}>
        {isYes ? (
          <TrendingUp className={cn("w-6 h-6", isYes ? "text-success" : "text-destructive")} />
        ) : (
          <TrendingDown className={cn("w-6 h-6", !isYes ? "text-destructive" : "text-success")} />
        )}
      </div>

      {/* Label */}
      <span className={cn(
        "text-xl font-bold",
        selected && isYes && "text-success",
        selected && !isYes && "text-destructive",
        !selected && "text-foreground"
      )}>
        {outcome}
      </span>

      {/* Privacy indicator */}
      <span className="text-xs text-muted-foreground font-mono">
        Odds: ••••
      </span>

      {/* Selected checkmark */}
      {selected && (
        <div className={cn(
          "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center",
          isYes ? "bg-success text-white" : "bg-destructive text-white"
        )}>
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Winner badge */}
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-success text-white text-xs font-bold rounded-full">
          WINNER
        </div>
      )}
    </button>
  );
}
