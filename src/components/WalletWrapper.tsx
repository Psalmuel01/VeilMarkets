import { useMemo } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { Network } from "@provablehq/aleo-types";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import {
    CREATE_PROGRAM_ID,
    LIQUIDITY_PROGRAM_ID,
    PROGRAM_ID,
    CREDITS_TOKEN_PROGRAM_ID,
    USDCX_TOKEN_PROGRAM_ID,
    USAD_TOKEN_PROGRAM_ID,
    ORACLE_PROGRAM_ID,
    FACTORY_PROGRAM_ID,
    GOVERNANCE_PROGRAM_ID,
} from "../lib/constants.js";

// Configure the wallet options to be used in the application.
export const WalletWrapper = ({ children }) => {
    const wallets = useMemo(
        () => [
            new ShieldWalletAdapter(),
        ],
        []
    );
    const allowedPrograms = useMemo(
        () => [
            CREATE_PROGRAM_ID,
            LIQUIDITY_PROGRAM_ID,
            PROGRAM_ID,
            CREDITS_TOKEN_PROGRAM_ID,
            USDCX_TOKEN_PROGRAM_ID,
            USAD_TOKEN_PROGRAM_ID,
            ORACLE_PROGRAM_ID,
            FACTORY_PROGRAM_ID,
            GOVERNANCE_PROGRAM_ID,
            "credits.aleo",
            "test_usdcx_stablecoin.aleo",
            "test_usad_stablecoin.aleo",
            // Shield program permissions should contain Aleo program IDs only.
            // USDCx dependency graph (queried/called during private transfers).
            "merkle_tree.aleo",
            "test_usdcx_freezelist.aleo",
            "test_usdcx_multisig_core.aleo",
            // USAD dependency graph.
            "test_usad_freezelist.aleo",
            "test_usad_multisig_core.aleo",
        ].filter((item) => item.length > 0),
        [],
    );

    return (
        <AleoWalletProvider
            wallets={wallets}
            network={Network.TESTNET}
            decryptPermission={DecryptPermission.OnChainHistory}
            programs={allowedPrograms}
            autoConnect
        >
            {children}
        </AleoWalletProvider>
    );
};
