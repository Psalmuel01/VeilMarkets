import { Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/context/SidebarContext";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { cn } from "@/lib/utils";

export function MobileNavbar() {
  const { toggleMobile } = useSidebar();

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-16 z-40",
        "flex items-center justify-between px-4",
        "bg-background/80 backdrop-blur-xl border-b border-white/5",
        "lg:hidden", // Hide on desktop
      )}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobile}
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e4b4] to-[#6c8eff] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
            <Shield className="w-5 h-5 text-[#080b10]" />
          </div>
          {/* <span className="font-semibold tracking-tight font-heading text-white">
            Veil
          </span> */}
        </NavLink>
      </div>

      <div className="flex items-center">
        <ConnectWalletButton className="h-9 px-3 text-xs" />
      </div>
    </div>
  );
}
