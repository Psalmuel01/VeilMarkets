import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import {
    WalletAdapterNetwork,
    Transaction,
} from "@demox-labs/aleo-wallet-adapter-base";
import {
    PROGRAM_ID,
} from "../lib/constants";
import { toast } from "sonner";
import { fetchAllMappingEntries, parseMarketInfo } from "../lib/aleo";
import { useState, useCallback } from "react";

export const useAleoPrograms = () => {
    const { publicKey, requestTransaction, requestRecords } = useWallet();
    const [loading, setLoading] = useState(false);

    const fetchMarkets = useCallback(async () => {
        setLoading(true);
        console.log("Fetching markets for:", PROGRAM_ID);
        try {
            const entries = await fetchAllMappingEntries(PROGRAM_ID, "markets");
            console.log("Raw markets fetched:", entries);
            if (!entries || entries.length === 0) {
                console.warn("No markets found on-chain.");
                return [];
            }
            return entries.map((entry: any) => ({
                id: entry.key.replace(/field/g, ""),
                ...parseMarketInfo(entry.value)
            }));
        } catch (error) {
            console.error("Failed to fetch markets:", error);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUserBets = useCallback(async () => {
        if (!publicKey || !requestRecords) {
            console.warn("Wallet not connected or requestRecords not available");
            return [];
        }
        setLoading(true);
        console.log("Fetching records for:", PROGRAM_ID, "Owner:", publicKey);
        try {
            const records = await requestRecords(PROGRAM_ID);
            console.log("Raw records fetched:", records);

            // Filter for BetPosition records (not spent)
            // Some wallets return data in .data, others directly on the object
            const unspent = records.filter((r: any) => !r.spent);

            return unspent.map((r: any) => {
                const rawData = r.data || r;
                // Clean Aleo types from record fields
                const clean = (val: string) => typeof val === 'string' ? val.replace(/u8|u64|field|address/g, "").trim() : val;

                return {
                    market_id: clean(rawData.market_id),
                    outcome: clean(rawData.outcome),
                    amount: clean(rawData.amount),
                    spent: r.spent
                };
            });
        } catch (error) {
            console.error("Failed to fetch user bets:", error);
            return [];
        } finally {
            setLoading(false);
        }
    }, [publicKey, requestRecords]);

    const createMarket = async (
        title: string,
        category: number,
        closeBlock: number,
        resolutionBlock: number
    ) => {
        if (!publicKey) {
            toast.error("Please connect your wallet first");
            return;
        }

        const titleHashString = BigInt(Math.floor(Math.random() * 1000000000000)).toString();
        const titleHash = `${titleHashString}field`;

        console.log("Creating market with inputs:", { titleHash, category, closeBlock, resolutionBlock });

        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            "testnet",
            PROGRAM_ID,
            "create_market",
            [titleHash, `${category}u8`, `${closeBlock}u64`, `${resolutionBlock}u64`],
            2000000,
            false
        );

        if (!requestTransaction) {
            console.error("requestTransaction not available");
            toast.error("Wallet does not support transactions");
            return;
        }

        console.log("Requesting transaction with Transaction object:", aleoTransaction);

        try {
            const txId = await requestTransaction(aleoTransaction);
            console.log("Transaction ID success:", txId);
            toast.success(`Transaction submitted: ${txId}`);
            return txId;
        } catch (error: any) {
            console.error("Transaction call threw error:", error);
            const msg = error?.message || "Check balance & permissions";
            toast.error(`Authorization Failed: ${msg}`);
        }
    };

    const placeBet = async (marketId: string, outcome: number, amount: number) => {
        if (!publicKey) {
            toast.error("Please connect your wallet first");
            return;
        }

        // Ensure marketId has field suffix if not present
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

        console.log("Placing bet:", { marketId: cleanMarketId, outcome, amount });

        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            "testnet",
            PROGRAM_ID,
            "place_bet",
            [cleanMarketId, `${outcome}u8`, `${amount}u64`],
            1000000,
            false
        );

        try {
            if (requestTransaction) {
                const txId = await requestTransaction(aleoTransaction);
                toast.success(`Bet submitted: ${txId}`);
                return txId;
            }
        } catch (error: any) {
            console.error("Bet transaction failed:", error);
            toast.error(`Bet error: ${error?.message || "Failed"}`);
        }
    };

    const resolveMarket = async (marketId: string, winningOutcome: number) => {
        if (!publicKey) return;
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            "testnet",
            PROGRAM_ID,
            "resolve_market",
            [cleanMarketId, `${winningOutcome}u8`],
            500000,
            false
        );
        try {
            if (requestTransaction) return await requestTransaction(aleoTransaction);
        } catch (e) { console.error(e); }
    };

    const claimWinnings = async (marketId: string) => {
        if (!publicKey) return;
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            "testnet",
            PROGRAM_ID,
            "claim_winnings",
            [cleanMarketId],
            500000,
            false
        );
        try {
            if (requestTransaction) return await requestTransaction(aleoTransaction);
        } catch (e) { console.error(e); }
    };

    return {
        createMarket,
        placeBet,
        resolveMarket,
        claimWinnings,
        fetchMarkets,
        fetchUserBets,
        loading,
        publicKey,
    };
};
