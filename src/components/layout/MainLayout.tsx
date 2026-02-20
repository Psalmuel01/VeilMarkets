import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { WalletGuard } from "../auth/WalletGuard";

interface MainLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
  requireWallet?: boolean;
}

export function MainLayout({ children, fullWidth = false, requireWallet = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn(
        "ml-64 min-h-screen transition-all duration-300",
        fullWidth ? "p-0" : "p-6"
      )}>
        {requireWallet ? (
          <WalletGuard>{children}</WalletGuard>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
