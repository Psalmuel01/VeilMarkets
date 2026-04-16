import { Check, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutcomeCardProps {
  outcome: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  isWinner?: boolean;
  tone?: "yes" | "no" | "neutral";
}

export function OutcomeCard({
  outcome,
  selected, 
  onSelect,
  disabled = false,
  isWinner = false,
  tone = "neutral",
}: OutcomeCardProps) {
  const isYes = tone === "yes";
  const isNo = tone === "no";
  
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
        selected && isNo && "border-destructive bg-destructive/10",
        selected && !isYes && !isNo && "border-primary/40 bg-primary/10",
        !selected && "border-border/50 bg-card hover:border-primary/30",
        isWinner && "border-success bg-success/10 ring-2 ring-success/50"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        isYes
          ? "bg-success/20"
          : isNo
            ? "bg-destructive/20"
            : "bg-primary/20"
      )}>
        {isYes ? (
          <TrendingUp className="w-6 h-6 text-success" />
        ) : isNo ? (
          <TrendingDown className="w-6 h-6 text-destructive" />
        ) : (
          <TrendingUp className="w-6 h-6 text-primary" />
        )}
      </div>

      {/* Label */}
      <span className={cn(
        "text-lg font-bold",
        selected && isYes && "text-success",
        selected && isNo && "text-destructive",
        selected && !isYes && !isNo && "text-primary",
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
          isYes ? "bg-success text-white" : isNo ? "bg-destructive text-white" : "bg-primary text-primary-foreground"
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
