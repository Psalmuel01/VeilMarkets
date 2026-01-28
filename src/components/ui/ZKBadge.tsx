import { Shield, CheckCircle2, Lock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZKBadgeProps {
  variant?: "verified" | "encrypted" | "hidden" | "proof";
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

const badgeConfig = {
  verified: {
    icon: CheckCircle2,
    label: "ZK Verified",
    className: "bg-success/10 text-success border-success/30",
  },
  encrypted: {
    icon: Lock,
    label: "Encrypted",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  hidden: {
    icon: Eye,
    label: "Hidden",
    className: "bg-accent/10 text-accent border-accent/30",
  },
  proof: {
    icon: Shield,
    label: "ZK Proof",
    className: "bg-success/10 text-success border-success/30",
  },
};

const sizeConfig = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
};

const iconSizeConfig = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

export function ZKBadge({ 
  variant = "verified", 
  size = "md", 
  className,
  animated = false 
}: ZKBadgeProps) {
  const config = badgeConfig[variant];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        sizeConfig[size],
        config.className,
        animated && "animate-glow-pulse",
        className
      )}
    >
      <Icon className={iconSizeConfig[size]} />
      <span>{config.label}</span>
    </span>
  );
}
