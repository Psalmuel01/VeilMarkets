import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function ConnectWalletButton({ className, collapsed }: { className?: string, collapsed?: boolean }) {
    const { wallets, wallet, address, connected, connecting, selectWallet, connect, disconnect } = useWallet();
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSelectWallet = async (walletName: (typeof wallets)[number]["adapter"]["name"]) => {
        const chosen = wallets.find((w) => w.adapter.name === walletName);
        if (!chosen) return;
        selectWallet(walletName);
        try {
            await connect();
            setShowModal(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to connect: ${message}`);
        }
    };

    const handleDisconnect = async () => {
        await disconnect();
        toast.success("Wallet disconnected");
    };

    const handleCopy = () => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shortAddress = address
        ? `${address.slice(0, 8)}...${address.slice(-6)}`
        : null;

    if (connected && address) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <button
                    onClick={handleCopy}
                    className={cn(
                        "flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono hover:bg-primary/20 transition-colors",
                        collapsed ? "p-2 aspect-square" : "px-3 py-1.5 text-sm"
                    )}
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {!collapsed && shortAddress}
                </button>
                {!collapsed && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnect}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                )}
            </div>
        );
    }

    return (
        <>
            <Button
                onClick={() => setShowModal(true)}
                disabled={connecting}
                className={cn("gap-2", className)}
                variant="outline"
                size={collapsed ? "icon" : "default"}
            >
                <Wallet className="w-4 h-4" />
                {!collapsed && (connecting ? "Connecting..." : "Connect Wallet")}
            </Button>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-sm bg-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Connect a Wallet
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {wallets.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No Aleo wallets detected. Install{" "}
                                <a
                                    href="https://shield.provable.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                >
                                    Shield Wallet
                                </a>{" "}
                                to continue.
                            </p>
                        )}
                        {wallets.map((w) => (
                            <button
                                key={w.adapter.name}
                                onClick={() => handleSelectWallet(w.adapter.name)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                            >
                                {w.adapter.icon ? (
                                    <img
                                        src={w.adapter.icon}
                                        alt={w.adapter.name}
                                        className="w-9 h-9 rounded-lg"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-sm">{w.adapter.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {w.readyState === "Installed" ? "Ready" : w.readyState}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
