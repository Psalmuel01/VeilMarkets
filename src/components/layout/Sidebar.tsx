import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Wallet,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { OracleRegistrationModal } from "@/components/resolution/OracleRegistrationModal";

const navItems = [
  { icon: LayoutGrid, label: "Markets", path: "/markets" },
  { icon: Wallet, label: "My Bets", path: "/dashboard" },
  { icon: Plus, label: "Create Market", path: "/create" },
  { icon: FileText, label: "Docs", path: "/docs" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { requestCredits, fetchMarkets, fetchBalances, shieldCredits, publicKey, isOracleRegistered, registerAsOracle, refreshSignal } = useAleoPrograms();
  const [activeMarketsCount, setActiveMarketsCount] = useState<number | null>(null);
  const [balances, setBalances] = useState<{ private: number; public: number } | null>(null);
  const [isOracle, setIsOracle] = useState<boolean | null>(null);
  const [isOracleModalOpen, setIsOracleModalOpen] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [markets, bal, oracleStatus] = await Promise.all([
          fetchMarkets(),
          fetchBalances(),
          isOracleRegistered()
        ]);
        setActiveMarketsCount(markets.length);
        setBalances(bal);
        setIsOracle(oracleStatus);
        // console.log(oracleStatus);
      } catch (error) {
        console.error("Failed to fetch sidebar stats:", error);
      }
    };
    loadStats();
  }, [fetchMarkets, fetchBalances, isOracleRegistered, publicKey, refreshSignal]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-border/50",
        "flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border/50">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-gradient flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">VeilMarkets</span>
          )}
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "transition-all duration-200",
                "hover:bg-sidebar-accent",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
              {!collapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Stats Card */}
      {!collapsed && (
        <div className="p-3">
          <div className="p-4 rounded-xl bg-card-gradient border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Network Stats</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Markets</span>
                <span className="font-medium text-foreground">
                  {activeMarketsCount !== null ? activeMarketsCount : "..."}
                </span>
              </div>
              {publicKey && (
                <div className="space-y-2 pt-2 border-t border-border/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Betting Balance</span>
                    <span className="font-bold text-primary">
                      {balances !== null ? `${balances.private.toLocaleString()} Credits` : "..."}
                    </span>
                  </div>
                  {balances && balances.public > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>Available to Shield</span>
                      <span>{balances.public.toLocaleString()} Credits</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connect & Faucet */}
      <div className="p-3 border-t border-border/50 space-y-2">
        {/* {!collapsed && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full text-xs transition-all duration-200",
              balances && balances.public > 0 
                ? "border-amber-500/30 hover:bg-amber-500/10 text-amber-500" 
                : "border-primary/30 hover:border-primary/50 text-primary"
            )}
            onClick={() => balances && balances.public > 0 ? shieldCredits(balances.public) : requestCredits()}
          >
            <Shield className="w-3.5 h-3.5" />
            {balances && balances.public > 0 ? "Shield for Betting" : "Request faucet credits"}
          </Button>
        )} */}
        
        {/* {!collapsed && isOracle === false && publicKey && (
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-white border-none shadow-lg shadow-amber-500/20"
            onClick={() => setIsOracleModalOpen(true)}
          >
            <Shield className="w-3.5 h-3.5 mr-2" />
            Become an Oracle
          </Button>
        )} */}
        <ConnectWalletButton className={collapsed ? "w-10 px-0 justify-center" : "w-full"} />
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
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

      {/* Oracle Registration Modal */}
      <OracleRegistrationModal
        isOpen={isOracleModalOpen}
        onClose={() => setIsOracleModalOpen(false)}
        onSuccess={() => setIsOracle(true)}
      />
    </aside>
  );
}
