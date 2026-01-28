import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function MainLayout({ children, fullWidth = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={cn(
        "ml-64 min-h-screen transition-all duration-300",
        fullWidth ? "p-0" : "p-6"
      )}>
        {children}
      </main>
    </div>
  );
}
