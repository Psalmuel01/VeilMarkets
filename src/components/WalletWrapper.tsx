import { useMemo } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { Network } from "@provablehq/aleo-types";
import { PROGRAM_ID } from "../lib/constants.js";

// Configure the wallet options to be used in the application.
export const WalletWrapper = ({ children }) => {
    const wallets = useMemo(
        () => [
            new ShieldWalletAdapter(),
        ],
        []
    );

    return (
        <AleoWalletProvider
            wallets={wallets}
            network={Network.TESTNET}
            programs={[PROGRAM_ID]}
            autoConnect
        >
            {children}
        </AleoWalletProvider>
    );
};