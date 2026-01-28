import { Check, Lock, Eye, Shield, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ChecklistItem {
  icon: React.ElementType;
  label: string;
  checked: boolean;
}

interface PrivacyChecklistProps {
  items?: ChecklistItem[];
  className?: string;
  animated?: boolean;
}

const defaultItems: ChecklistItem[] = [
  { icon: Lock, label: "Amount encrypted", checked: true },
  { icon: Eye, label: "Identity hidden", checked: true },
  { icon: Link, label: "Bet verifiable on-chain", checked: true },
  { icon: Shield, label: "ZK proof generated", checked: true },
];

export function PrivacyChecklist({ 
  items = defaultItems, 
  className,
  animated = true 
}: PrivacyChecklistProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const content = (
          <div
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              "bg-muted/50 border border-border/50",
              "transition-all duration-300",
              item.checked && "border-success/30 bg-success/5"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                item.checked 
                  ? "bg-success/20 text-success" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {item.checked ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <span className={cn(
              "text-sm font-medium",
              item.checked ? "text-foreground" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
            {item.checked && (
              <Icon className="w-4 h-4 text-success ml-auto" />
            )}
          </div>
        );

        if (animated) {
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {content}
            </motion.div>
          );
        }

        return <div key={item.label}>{content}</div>;
      })}
    </div>
  );
}
