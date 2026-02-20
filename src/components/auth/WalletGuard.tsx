import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { motion } from "framer-motion";
import { Shield, Wallet } from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

interface WalletGuardProps {
    children: React.ReactNode;
}

export function WalletGuard({ children }: WalletGuardProps) {
    const { address } = useWallet();

    if (!address) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative mb-8"
                >
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative w-24 h-24 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center">
                        <Shield className="w-12 h-12 text-primary" />
                    </div>
                </motion.div>

                <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                    This page contains private, encrypted Aleo data. Please connect your wallet to view and interact with these markets.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <ConnectWalletButton className="h-12 px-8 text-lg" />
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
