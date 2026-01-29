import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketFiltersProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const categories = [
  { id: "all", label: "All Markets" },
  { id: "Sports", label: "Sports" },
  { id: "Finance", label: "Finance" },
  { id: "Crypto", label: "Crypto" },
  { id: "Politics", label: "Politics" },
  { id: "Entertainment", label: "Entertainment" },
];

export function MarketFilters({
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange
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

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>
    </div>
  );
}
