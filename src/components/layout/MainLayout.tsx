import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { WalletGuard } from "../auth/WalletGuard";
import { useSidebar } from "@/context/SidebarContext";

interface MainLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  requireWallet?: boolean;
}

export function MainLayout({ children, fullWidth = false, requireWallet = false }: MainLayoutProps) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="noise-texture" />
      <Sidebar />
      <main className={cn(
        "min-h-screen transition-all duration-300 relative z-10",
        isCollapsed ? "ml-20" : "ml-72"
      )}>
        <div className={cn(
          "w-full",
          fullWidth ? "p-0" : "p-8 max-w-7xl mx-auto"
        )}>
          {requireWallet ? (
            <WalletGuard>{children}</WalletGuard>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
