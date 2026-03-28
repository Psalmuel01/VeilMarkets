import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Plus,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { useSidebar } from "@/context/SidebarContext";
import { useCreditsBalancesQuery, useMarketsQuery, useUSADBalancesQuery, useUSDCxBalancesQuery } from "@/hooks/useVeilQuery";

const navItems = [
  { icon: LayoutGrid, label: "Markets", path: "/markets" },
  { icon: Plus, label: "Create Market", path: "/create" },
  { icon: Trophy, label: "My Bets", path: "/dashboard" },
  { icon: FileText, label: "Docs", path: "/docs" },
];

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const collapsed = isCollapsed;
  const location = useLocation();
  const { publicKey } = useAleoPrograms();
  const { data: markets = [] } = useMarketsQuery();
  const { data: balances } = useCreditsBalancesQuery();
  const { data: usdcxBalances } = useUSDCxBalancesQuery();
  const { data: usadBalances } = useUSADBalancesQuery();
  const activeMarketsCount = markets.length;

  return (
    <aside
      className={cn(
        "flex flex-col fixed left-0 top-0 h-screen glass-sidebar shadow-2xl transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 bg-white/[0.02]">
        <NavLink to="/" className="flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00e4b4] to-[#6c8eff] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
            <Shield className="w-6 h-6 text-[#080b10]" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-xl tracking-tight font-heading text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">
              VeilMarkets
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl",
                "transition-all duration-300 group",
                isActive
                  ? "bg-primary/20 text-white border border-primary/30 shadow-[0_0_20px_hsla(var(--primary),0.1)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive && "text-primary")} />
              {!collapsed && (
                <span className="font-semibold tracking-wide text-sm">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Stats Card */}
      {!collapsed && (
        <div className="p-4">
          <div className="p-5 rounded-2xl glass-card relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Network Pulse</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Markets</span>
                  <span className="text-lg font-semibold font-mono text-white leading-none">
                    {activeMarketsCount}
                  </span>
                </div>
                {publicKey && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center group/bal">
                      <span className="text-[10px] text-muted-foreground group-hover/bal:text-white transition-colors">Aleo Credits (Private)</span>
                      <span className="text-sm font-semibold font-mono text-primary">
                        {balances ? `${balances.private.toLocaleString()}` : "..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center group/bal">
                      <span className="text-[10px] text-muted-foreground group-hover/bal:text-white transition-colors">USDCx (Private)</span>
                      <span className="text-sm font-semibold font-mono text-accent">
                        {usdcxBalances ? `${usdcxBalances.private.toLocaleString()}` : "..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center group/bal">
                      <span className="text-[10px] text-muted-foreground group-hover/bal:text-white transition-colors">USAD (Private)</span>
                      <span className="text-sm font-semibold font-mono text-accent">
                        {usadBalances ? `${usadBalances.private.toLocaleString()}` : "..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connect & Faucet */}
      <div className="p-3 border-t border-border/50 space-y-2">
        <ConnectWalletButton className={collapsed ? "w-12 h-12 px-0 justify-center rounded-xl" : "w-full"} collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>

    </aside>
  );
}
