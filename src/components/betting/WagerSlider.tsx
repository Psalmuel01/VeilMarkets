import { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface WagerSliderProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}

export function WagerSlider({
  value,
  onChange,
  max = 100,
  disabled = false
}: WagerSliderProps) {
  const percentage = (value / max) * 100;

  // Abstract labels instead of actual amounts
  const getWagerLevel = (val: number) => {
    if (val < 25) return { label: "Conservative", color: "text-success" };
    if (val < 50) return { label: "Moderate", color: "text-primary" };
    if (val < 75) return { label: "Confident", color: "text-warning" };
    return { label: "Maximum", color: "text-destructive" };
  };

  const level = getWagerLevel(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Wager Amount</span>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span className={cn("text-sm font-semibold", level.color)}>
            {level.label}
          </span>
        </div>
      </div>

      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={([val]) => onChange(val)}
          max={max}
          step={1}
          disabled={disabled}
          className="cursor-pointer"
        />

        {/* Visual representation without actual numbers */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
          <span>Min</span>
          <span>Low</span>
          <span>Mid</span>
          <span>High</span>
          <span>Max</span>
        </div>
      </div>

      {/* Encrypted amount display */}
      <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Your wager (encrypted)</span>
          <span className="font-mono text-lg encrypted-text">
            •••••••• ALEO
          </span>
        </div>
      </div>

      {value > 75 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
          <p className="text-xs text-warning">
            High wager amount. This is encrypted and private, but ensure you're comfortable with this level.
          </p>
        </div>
      )}
    </div>
  );
}
