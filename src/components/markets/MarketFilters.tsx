import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SupportedTokenKind } from "@/lib/constants";

interface MarketFiltersProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeToken: "all" | SupportedTokenKind;
  onTokenChange: (token: "all" | SupportedTokenKind) => void;
}

const categories = [
  { id: "all", label: "All Markets" },
  { id: "Sports", label: "Sports" },
  { id: "Finance", label: "Finance" },
  { id: "Crypto", label: "Crypto" },
  { id: "Politics", label: "Politics" },
  { id: "Entertainment", label: "Entertainment" },
  { id: "Tech", label: "Tech" },
  { id: "Other", label: "Other" },
];

const tokens: Array<{ id: "all" | SupportedTokenKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "credits", label: "ALEO" },
  { id: "usdcx", label: "USDCx" },
  { id: "usad", label: "USAD" },
];

export function MarketFilters({
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  activeToken,
  onTokenChange,
}: MarketFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50"
        />
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "rounded-full border transition-all",
              activeCategory === category.id
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {category.label}
          </Button>
        ))}

        <Select value={activeToken} onValueChange={(value) => onTokenChange(value as "all" | SupportedTokenKind)}>
          <SelectTrigger className="ml-auto h-9 w-full sm:w-[120px] bg-background/50 border-border/60">
            <SelectValue placeholder="token" />
          </SelectTrigger>
          <SelectContent>
            {tokens.map((token) => (
              <SelectItem key={token.id} value={token.id}>
                {token.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
