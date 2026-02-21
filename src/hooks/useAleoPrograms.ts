import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { PROGRAM_ID, TOKEN_PROGRAM_ID } from "../lib/constants";
import { toast } from "sonner";
import { fetchMappingValue, fetchTransaction, extractMarketIdFromTx, parseMarketInfo } from "../lib/aleo";
import { saveMarketMetadata, getBatchMarketMetadata } from "../lib/metadata";
import { useState, useCallback } from "react";

export const useAleoPrograms = () => {
    const { address, executeTransaction, requestRecords, requestTransactionHistory } = useWallet();
    const publicKey = address;
    const [loading, setLoading] = useState(false);

    /**
     * Fetch all markets by cross-referencing on-chain data with off-chain metadata.
     * Uses the shield-specific ID for Supabase lookups.
     */
    const fetchMarkets = useCallback(async () => {
        if (!requestTransactionHistory) return [];
        setLoading(true);
        try {
            const historyResult = await requestTransactionHistory(PROGRAM_ID);
            const transactions = (historyResult?.transactions || []).filter((t: any) => t.transactionId);

            if (transactions.length === 0) return [];

            const txIds = transactions.map((t: any) => t.transactionId);
            const txIdToShieldId: Record<string, string> = {};
            transactions.forEach((t: any) => {
                txIdToShieldId[t.transactionId] = t.id;
            });

            // Extract market_id from each transaction
            const marketIdSet = new Set<string>();
            const marketIdToShieldId: Record<string, string> = {};
            const marketIdToTxHash: Record<string, string> = {}; // Added for routing
            const txFetches = txIds.map((txId) => fetchTransaction(txId));
            const txData = await Promise.all(txFetches);

            txData.forEach((tx, i) => {
                if (!tx) return;
                const marketId = extractMarketIdFromTx(tx);
                if (marketId) {
                    marketIdSet.add(marketId);
                    const txId = txIds[i];
                    marketIdToShieldId[marketId] = txIdToShieldId[txId];
                    marketIdToTxHash[marketId] = txId; // The at1... hash
                }
            });

            if (marketIdSet.size === 0) return [];

            // Fetch MarketInfo from on-chain mapping
            const marketIds = Array.from(marketIdSet);
            const marketFetches = marketIds.map((id) =>
                fetchMappingValue(PROGRAM_ID, "markets", id).then((raw) => {
                    if (!raw) return null;
                    return parseMarketInfo(raw, id);
                })
            );

            const validMarkets = (await Promise.all(marketFetches)).filter(Boolean);

            // Fetch metadata from Supabase in batch using shield IDs
            const shieldIdsForMetadata = Object.values(marketIdToShieldId);
            const metadataMap = await getBatchMarketMetadata(shieldIdsForMetadata);

            return validMarkets.map((market: any) => {
                const shieldId = marketIdToShieldId[market.id];
                const txHash = marketIdToTxHash[market.id];
                const meta = shieldId ? metadataMap[shieldId] : null;
                return {
                    ...market,
                    transactionId: txHash, // Explicitly include the hash
                    title: meta?.title || `Market ${market.id.substring(0, 8)}...`,
                    description: meta?.description || "Market metadata not found on the network.",
                    source: meta?.source || "Creator",
                };
            });
        } catch (error) {
            console.error("Failed to fetch markets:", error);
            return [];
        } finally {
            setLoading(false);
        }
    }, [requestTransactionHistory]);

    const fetchUserBets = useCallback(async () => {
        if (!address || !requestRecords) return [];
        setLoading(true);
        try {
            const records = await requestRecords(PROGRAM_ID);
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
                    spent: r.spent,
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
        description: string,
        category: number,
        closeBlock: number,
        resolutionBlock: number,
        resolutionSource: string
    ) => {
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        const titleHashString = BigInt(Math.floor(Math.random() * 1000000000000)).toString();
        const titleHash = `${titleHashString}field`;

        try {
            const result = await executeTransaction({
                program: PROGRAM_ID,
                function: "create_market",
                inputs: [titleHash, `${category}u8`, `${closeBlock}u64`, `${resolutionBlock}u64`],
                fee: 2000000,
                privateFee: false,
            });
            if (result?.transactionId) {
                const shieldId = (result as any).id || result.transactionId;
                await saveMarketMetadata(shieldId, titleHash, title, description, resolutionSource);
                toast.success(`Market created! Tx: ${result.transactionId}`);
                return result.transactionId;
            }
        } catch (error: any) {
            console.error("Create market failed:", error);
            toast.error(`Failed: ${error?.message || "Unknown error"}`);
        }
    };

    const requestCredits = async (amount: number) => {
        if (!address) return;
        try {
            const result = await executeTransaction({
                program: TOKEN_PROGRAM_ID,
                function: "faucet",
                inputs: [`${amount}u64`],
                fee: 1000000,
                privateFee: false,
            });
            if (result?.transactionId) {
                toast.success(`Credits requested! Tx: ${result.transactionId}`);
                return result.transactionId;
            }
        } catch (e: any) {
            console.error("Faucet failed:", e);
            toast.error(`Faucet error: ${e?.message || "Failed"}`);
        }
    };

    const findCreditsRecord = async (amount: number) => {
        if (!address || !requestRecords) return null;
        console.log("Finding Credits record in", TOKEN_PROGRAM_ID, "for amount:", amount);

        try {
            const records = await requestRecords(TOKEN_PROGRAM_ID);
            console.log("Found records for token program:", records?.length || 0);

            if (!records || records.length === 0) {
                console.warn("No records returned from wallet for", TOKEN_PROGRAM_ID);
                return null;
            }

            const unspent = (records as any[]).filter((r: any) => !r.spent);
            console.log("Unspent records:", unspent.length);

            // Find a record with enough balance
            const found = unspent.find((r: any) => {
                // Handle different possible data structures from different wallet adapters
                let val = r.data?.amount || r.amount;

                // If val is an object, try to extract value
                if (typeof val === 'object' && val !== null) {
                    val = val.value || val.amount || Object.values(val)[0];
                }

                if (!val) return false;

                const num = parseInt(typeof val === 'string' ? val.replace('u64', '') : val);
                console.log("Checking record:", r.id, "amount:", num);
                return !isNaN(num) && num >= amount;
            });

            if (found) {
                console.log("Found suitable record:", found.id);
            } else {
                console.warn("No unspent record found with balance >=", amount);
            }

            return found;
        } catch (error) {
            console.error("Error in findCreditsRecord:", error);
            return null;
        }
    };

    const placeBet = async (marketId: string, outcome: number, amount: number) => {
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        setLoading(true);
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

        try {
            // STEP 1: Escrow funds in veilmarket_token
            toast.info("Step 1/2: Escrowing funds...");
            const creditsRecord = await findCreditsRecord(amount);
            if (!creditsRecord) {
                toast.error("No Credits record found with sufficient balance. Please deposit first.");
                setLoading(false);
                return;
            }

            const escrowResult = await executeTransaction({
                program: TOKEN_PROGRAM_ID,
                function: "deposit_for_bet",
                inputs: [
                    creditsRecord,
                    cleanMarketId,
                    `${outcome}u8`,
                    `${amount}u64`
                ],
                fee: 1000000,
                privateFee: false,
            });

            if (!escrowResult?.transactionId) {
                throw new Error("Escrow transaction failed");
            }

            // STEP 2: Update pools in veilmarkets
            toast.info("Step 2/2: Updating market pool...");
            const betResult = await executeTransaction({
                program: PROGRAM_ID,
                function: "place_bet",
                inputs: [cleanMarketId, `${outcome}u8`, `${amount}u64`],
                fee: 1000000,
                privateFee: false,
            });

            if (betResult?.transactionId) {
                toast.success(`Bet successfully placed!`);
                return betResult.transactionId;
            }
        } catch (error: any) {
            console.error("Place bet failed:", error);
            toast.error(`Bet error: ${error?.message || "Failed"}`);
        } finally {
            setLoading(false);
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
        requestCredits,
        loading,
        publicKey,
    };
};
