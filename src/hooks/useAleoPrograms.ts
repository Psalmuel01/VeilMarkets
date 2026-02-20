import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { PROGRAM_ID } from "../lib/constants";
import { toast } from "sonner";
import { fetchAllMappingEntries, parseMarketInfo } from "../lib/aleo";
import { useState, useCallback } from "react";

export const useAleoPrograms = () => {
    const { address, executeTransaction, requestRecords } = useWallet();
    const publicKey = address;  // compatibility alias
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
        if (!address || !requestRecords) {
            console.warn("Wallet not connected or requestRecords not available");
            return [];
        }
        setLoading(true);
        console.log("Fetching records for:", PROGRAM_ID, "Owner:", address);
        try {
            const records = await requestRecords(PROGRAM_ID);
            console.log("Raw records fetched:", records);

            const unspent = (records as any[]).filter((r: any) => !r.spent);

            return unspent.map((r: any) => {
                const rawData = r.data || r;
                const clean = (val: string) =>
                    typeof val === "string"
                        ? val.replace(/u8|u64|field|address/g, "").trim()
                        : val;
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
    }, [address, requestRecords]);

    const createMarket = async (
        title: string,
        category: number,
        closeBlock: number,
        resolutionBlock: number
    ) => {
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        const titleHashString = BigInt(Math.floor(Math.random() * 1000000000000)).toString();
        const titleHash = `${titleHashString}field`;

        console.log("Creating market with inputs:", { titleHash, category, closeBlock, resolutionBlock });

        try {
            const result = await executeTransaction({
                program: PROGRAM_ID,
                function: "create_market",
                inputs: [titleHash, `${category}u8`, `${closeBlock}u64`, `${resolutionBlock}u64`],
                fee: 2000000,
                privateFee: false,
            });

            console.log("Create market result:", result);
            if (result?.transactionId) {
                toast.success(`Market created! Tx: ${result.transactionId}`);
                return result.transactionId;
            }
        } catch (error: any) {
            console.error("Create market failed:", error);
            toast.error(`Failed: ${error?.message || "Unknown error"}`);
        }
    };

    const placeBet = async (marketId: string, outcome: number, amount: number) => {
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
        console.log("Placing bet:", { marketId: cleanMarketId, outcome, amount });

        try {
            const result = await executeTransaction({
                program: PROGRAM_ID,
                function: "place_bet",
                inputs: [cleanMarketId, `${outcome}u8`, `${amount}u64`],
                fee: 1000000,
                privateFee: false,
            });

            if (result?.transactionId) {
                toast.success(`Bet placed! Tx: ${result.transactionId}`);
                return result.transactionId;
            }
        } catch (error: any) {
            console.error("Place bet failed:", error);
            toast.error(`Bet error: ${error?.message || "Failed"}`);
        }
    };

    const resolveMarket = async (marketId: string, winningOutcome: number) => {
        if (!address) return;
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

        try {
            const result = await executeTransaction({
                program: PROGRAM_ID,
                function: "resolve_market",
                inputs: [cleanMarketId, `${winningOutcome}u8`],
                fee: 500000,
                privateFee: false,
            });
            if (result?.transactionId) {
                toast.success(`Market resolved! Tx: ${result.transactionId}`);
                return result.transactionId;
            }
        } catch (e: any) {
            console.error("Resolve market failed:", e);
            toast.error(`Resolve error: ${e?.message || "Failed"}`);
        }
    };

    const claimWinnings = async (marketId: string) => {
        if (!address) return;
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

        try {
            const result = await executeTransaction({
                program: PROGRAM_ID,
                function: "claim_winnings",
                inputs: [cleanMarketId],
                fee: 500000,
                privateFee: false,
            });
            if (result?.transactionId) {
                toast.success(`Winnings claimed! Tx: ${result.transactionId}`);
                return result.transactionId;
            }
        } catch (e: any) {
            console.error("Claim winnings failed:", e);
            toast.error(`Claim error: ${e?.message || "Failed"}`);
        }
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
