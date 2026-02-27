import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { ORACLE_PROGRAM_ID, PROGRAM_ID, TOKEN_PROGRAM_ID } from "../lib/constants";
import { toast } from "sonner";
import type { TxHistoryResult } from "@provablehq/aleo-types";
import {
  fetchMappingValue,
  fetchTransaction,
  extractMarketIdFromTx,
  parseMarketInfo,
  fetchCurrentBlockHeight,
  PoolInfo,
  parsePoolInfo,
} from "@/lib/aleo";
import {
  saveMarketMetadata,
  getBatchMarketMetadata,
  getAllMarketMetadata,
  type MarketMetadata,
} from "../lib/metadata";
import { useState, useCallback, useEffect } from "react";

type TxHistoryTransaction = TxHistoryResult["transactions"][number];

interface WalletRecord {
  id?: string;
  spent?: boolean;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ParsedBetRecord {
  market_id: string;
  outcome: string;
  amount: string;
  escrow_id: string;
  spent: boolean;
}

interface ChainMarket {
  id: string;
  creator: string;
  title_hash: string;
  category: number;
  close_block: number;
  resolution_block: number;
  is_resolved: boolean;
  winning_outcome: number;
  resolved_by_oracle: boolean;
  transactionId?: string;
  title: string;
  description: string;
  source: string;
}

interface ExecuteWalletTransactionOptions {
  program: string;
  function: string;
  inputs: unknown[];
  fee: number;
  privateFee: boolean;
}

const toObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const cleanAleoPrimitive = (value: unknown): string => {
  if (typeof value === "string") {
    return value
      .replace(/u8|u64|field|group|address|\.private|\.public/g, "")
      .replace(/["']/g, "")
      .trim();
  }
  return String(value ?? "");
};

const parseAleoAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/u64/g, "").trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toMicrocredits = (credits: number): number => Math.max(1_000_000, Math.floor(credits * 1_000_000));

const formatU64 = (value: number): string => `${Math.max(0, Math.floor(value))}u64`;
const formatU8 = (value: number): string => `${Math.max(0, Math.floor(value))}u8`;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const parseRecordField = (record: WalletRecord, field: string): string => {
  const rawData = record.data ?? record;

  // Try direct object access
  if (typeof rawData === "object" && rawData !== null && (rawData as any)[field] !== undefined) {
    return cleanAleoPrimitive((rawData as any)[field]);
  }

  // Try parsing from string representation
  const searchPattern = new RegExp(`${field}\\s*:\\s*([^,\\n}]+)`, "i");

  // Try record.recordPlaintext (ideal)
  if (typeof record.recordPlaintext === "string") {
    const match = record.recordPlaintext.match(searchPattern);
    if (match) return cleanAleoPrimitive(match[1]);
  }

  // Try record.data as string
  const dataValue = (record as any).data;
  if (typeof dataValue === "string") {
    const match = dataValue.match(searchPattern);
    if (match) return cleanAleoPrimitive(match[1]);
  }

  // Try whole record as JSON
  const recordStr = JSON.stringify(record);
  const jsonMatch = recordStr.match(searchPattern);
  if (jsonMatch) return cleanAleoPrimitive(jsonMatch[1]);

  return "";
};

const extractRecordAmount = (record: WalletRecord): number => {
  const val = parseRecordField(record, "amount");
  return val ? Number.parseInt(val, 10) : 0;
};

export const useAleoPrograms = () => {
  const { address, executeTransaction, requestRecords, requestTransactionHistory } = useWallet();
  const publicKey = address;
  const [loading, setLoading] = useState(false);

  const executeWalletTransaction = useCallback(
    async (options: ExecuteWalletTransactionOptions) => {
      // Clean up inputs - ensure strings are trimmed and records are passed as plaintext
      const cleanedInputs = options.inputs.map((input) => {
        if (typeof input === "string") return input.trim();
        if (typeof input === "object" && input !== null) {
          const rec = input as Record<string, unknown>;
          return (rec.recordPlaintext || rec.plaintext || JSON.stringify(input)) as string;
        }
        return String(input);
      });

      console.log(`[executeWalletTransaction] Executing ${options.program}/${options.function}`, cleanedInputs);

      return executeTransaction({
        ...options,
        inputs: cleanedInputs,
      } as Parameters<typeof executeTransaction>[0]);
    },
    [executeTransaction],
  );

  /**
   * Fetch all markets by cross-referencing on-chain data with off-chain metadata.
   * Uses Supabase metadata as global source, and wallet tx history as supplementary source.
   */
  const fetchMarkets = useCallback(async (): Promise<ChainMarket[]> => {
    setLoading(true);
    try {
      const txIdToShieldId: Record<string, string> = {};
      const txCandidates = new Set<string>();
      let historyTransactions: TxHistoryTransaction[] = [];

      try {
        const historyResult = await requestTransactionHistory(PROGRAM_ID);
        historyTransactions = (historyResult?.transactions ?? []).filter((tx) => Boolean(tx.transactionId));
      } catch (error) {
        console.warn("Wallet transaction history unavailable; falling back to metadata index.", error);
      }

      for (const tx of historyTransactions) {
        txCandidates.add(tx.transactionId);
        txIdToShieldId[tx.transactionId] = tx.id;
      }

      const metadataRows = await getAllMarketMetadata();
      const metadataByTxId: Record<string, MarketMetadata> = {};
      for (const row of metadataRows) {
        txCandidates.add(row.transaction_id);
        metadataByTxId[row.transaction_id] = {
          title: row.title,
          description: row.description,
          source: row.source,
        };
      }

      const shieldIds = historyTransactions.map((tx) => tx.id);
      const metadataByShieldId = await getBatchMarketMetadata(shieldIds);

      if (txCandidates.size === 0) return [];

      const txIds = Array.from(txCandidates);
      const marketIdToTxHash: Record<string, string> = {};
      const marketIds = new Set<string>();
      const txData = await Promise.all(txIds.map((txId) => fetchTransaction(txId)));

      txData.forEach((tx, index) => {
        if (!tx) return;
        const marketId = extractMarketIdFromTx(tx);
        if (!marketId) return;
        marketIds.add(marketId);
        marketIdToTxHash[marketId] = txIds[index];
      });

      if (marketIds.size === 0) return [];

      const marketFetches = Array.from(marketIds).map(async (marketId) => {
        const raw = await fetchMappingValue(PROGRAM_ID, "markets", marketId);
        if (!raw) return null;

        const parsed = parseMarketInfo(raw as string | object, marketId);
        const txHash = marketIdToTxHash[marketId];
        const shieldId = txHash ? txIdToShieldId[txHash] : undefined;
        const metadata = (txHash ? metadataByTxId[txHash] : undefined) ?? (shieldId ? metadataByShieldId[shieldId] : undefined);

        return {
          ...parsed,
          transactionId: txHash,
          title: metadata?.title || `Market ${marketId.slice(0, 8)}...`,
          description: metadata?.description || "Market metadata not found on the network.",
          source: metadata?.source || "Creator",
        } satisfies ChainMarket;
      });

      const markets = (await Promise.all(marketFetches)).filter((market): market is NonNullable<typeof market> => market !== null);
      return markets;
    } catch (error) {
      console.error("Failed to fetch markets:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [requestTransactionHistory]);

  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

  // Poll for current height
  useEffect(() => {
    const updateHeight = async () => {
      const h = await fetchCurrentBlockHeight();
      if (h) setCurrentHeight(h);
    };
    updateHeight();
    const interval = setInterval(updateHeight, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPoolStats = useCallback(async (marketId: string): Promise<PoolInfo | null> => {
    try {
      const cleanedId = marketId.replace("field", "").trim() + "field";
      const raw = await fetchMappingValue(PROGRAM_ID, "pools", cleanedId);
      if (!raw) return null;
      return parsePoolInfo(raw as any);
    } catch (error) {
      console.error(`Failed to fetch pool stats for ${marketId}:`, error);
      return null;
    }
  }, []);

  const fetchUserBets = useCallback(async (): Promise<ParsedBetRecord[]> => {
    if (!address) return [];
    setLoading(true);
    try {
      // Query TOKEN program for EscrowedBet records (where bets are escrowed)
      const rawRecords = await requestRecords(TOKEN_PROGRAM_ID, true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspentRecords = records.filter((record) => !record.spent);

      console.log(`[fetchUserBets] Found ${records.length} total records from ${TOKEN_PROGRAM_ID}, ${unspentRecords.length} are unspent.`);

      const results = unspentRecords
        .map((record) => {
          const market_id = parseRecordField(record, "market_id");
          const outcome = parseRecordField(record, "outcome");
          const amount = parseRecordField(record, "amount");
          const escrow_id = parseRecordField(record, "escrow_id");

          if (market_id) {
            console.log(`[fetchUserBets] Found bet for market: ${market_id}`, { outcome, amount, escrow_id });
          }

          return {
            market_id,
            outcome,
            amount,
            escrow_id,
            spent: Boolean(record.spent),
          };
        })
        .filter((record) => Boolean(record.market_id));

      console.log(`[fetchUserBets] Returning ${results.length} valid bet records.`);
      return results;
    } catch (error) {
      console.error("Failed to fetch user bets:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [address, requestRecords]);

  const fetchTokenBalance = useCallback(async (): Promise<number> => {
    if (!address) return 0;
    try {
      const rawRecords = await requestRecords(TOKEN_PROGRAM_ID, true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      // We only sum "Credits" records, not "EscrowedBet" records
      const sum = unspent.reduce((acc, record) => {
        const isCredits = (record.recordName === "Credits" || (record as any).name === "Credits");
        if (isCredits) {
          return acc + extractRecordAmount(record);
        }
        return acc;
      }, 0);

      const credits = sum / 1_000_000;
      console.log(`[fetchTokenBalance] Total balance: ${credits} Credits (${sum} microcredits)`);
      return credits;
    } catch (error) {
      console.error("Failed to fetch token balance:", error);
      return 0;
    }
  }, [address, requestRecords]);

  const createMarket = async (
    title: string,
    description: string,
    category: number,
    closeBlock: number,
    resolutionBlock: number,
    resolutionSource: string,
  ) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    const randomSeed = crypto.getRandomValues(new Uint32Array(2));
    const randomHash = (BigInt(randomSeed[0]) << 32n) + BigInt(randomSeed[1]);
    const titleHash = `${randomHash}field`;

    try {
      const result = await executeWalletTransaction({
        program: PROGRAM_ID,
        function: "create_market",
        inputs: [titleHash, formatU8(category), formatU64(closeBlock), formatU64(resolutionBlock)],
        fee: 2_000_000,
        privateFee: false,
      });

      console.log(result);

      if (result?.transactionId) {
        await saveMarketMetadata(result.transactionId, titleHash, title, description, resolutionSource);
        toast.success(`Market created! Tx: ${result.transactionId}`);
        return result.transactionId;
      }
    } catch (error) {
      console.error("Create market failed:", error);
      toast.error(`Failed: ${getErrorMessage(error)}`);
    }
  };

  const requestCredits = async (credits: number) => {
    if (!address) return;
    try {
      const result = await executeWalletTransaction({
        program: TOKEN_PROGRAM_ID,
        function: "faucet",
        inputs: [formatU64(toMicrocredits(credits))],
        fee: 1_000_000,
        privateFee: false,
      });
      if (result?.transactionId) {
        toast.success(`Credits requested! Tx: ${result.transactionId}`);
        return result.transactionId;
      }
    } catch (error) {
      console.error("Faucet failed:", error);
      toast.error(`Faucet error: ${getErrorMessage(error)}`);
    }
  };

  const findCreditsRecord = async (requiredAmountMicro: number): Promise<WalletRecord | null> => {
    if (!address) return null;

    try {
      const rawRecords = await requestRecords(TOKEN_PROGRAM_ID, true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      console.log(`[findCreditsRecord] Found ${unspent.length} unspent records from ${TOKEN_PROGRAM_ID}`);

      // Log all unspent records for debugging
      for (const record of unspent) {
        const amount = extractRecordAmount(record);
        console.log(`[findCreditsRecord] Record amount: ${amount}, required: ${requiredAmountMicro}`, record);
      }

      const matchingRecord = unspent.find((record) => extractRecordAmount(record) >= requiredAmountMicro);

      if (!matchingRecord) {
        console.warn(`[findCreditsRecord] No record with >= ${requiredAmountMicro} microcredits found among ${unspent.length} unspent records`);
      }

      return matchingRecord ?? null;
    } catch (error) {
      console.error("Error in findCreditsRecord:", error);
      return null;
    }
  };

  const findClaimablePositionRecord = async (marketId: string): Promise<WalletRecord | null> => {
    if (!address) return null;

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      // Search CORE program for BetPosition records
      const rawRecords = await requestRecords(PROGRAM_ID, true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      const found = unspent.find((record) => {
        const source = record.data ?? record;
        const recordMarketId = cleanAleoPrimitive(source.market_id);
        return recordMarketId === cleanMarketId;
      });

      return found ?? null;
    } catch (error) {
      console.error("Error finding claimable record:", error);
      return null;
    }
  };

  const findEscrowedBetRecord = async (marketId: string): Promise<WalletRecord | null> => {
    if (!address) return null;

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      // Search TOKEN program for EscrowedBet records
      const rawRecords = await requestRecords(TOKEN_PROGRAM_ID, true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      const found = unspent.find((record) => {
        const source = record.data ?? record;
        const recordMarketId = cleanAleoPrimitive(source.market_id);
        return recordMarketId === cleanMarketId;
      });

      return found ?? null;
    } catch (error) {
      console.error("Error finding escrowed bet record:", error);
      return null;
    }
  };

  const placeBet = async (marketId: string, outcome: number, amountCredits: number) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
    const amountMicro = toMicrocredits(amountCredits);

    try {
      toast.info("Placing private bet...");

      const creditsRecord = await findCreditsRecord(amountMicro);
      if (!creditsRecord) {
        toast.error("No Credits record with sufficient balance. Request faucet credits first.");
        return;
      }

      const betResult = await executeWalletTransaction({
        program: TOKEN_PROGRAM_ID,
        function: "place_bet",
        inputs: [creditsRecord, cleanMarketId, formatU8(outcome), formatU64(amountMicro)],
        fee: 1_500_000,
        privateFee: false,
      });

      if (betResult?.transactionId) {
        toast.success("Bet successfully placed!");
        return betResult.transactionId;
      }
    } catch (error) {
      console.error("Place bet failed:", error);
      toast.error(`Bet error: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const resolveMarket = async (marketId: string, winningOutcome: number) => {
    if (!address) return;
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

    try {
      const result = await executeWalletTransaction({
        program: ORACLE_PROGRAM_ID,
        function: "finalize_resolution",
        inputs: [cleanMarketId, formatU8(winningOutcome)],
        fee: 500_000,
        privateFee: false,
      });

      if (result?.transactionId) {
        toast.success(`Resolution submitted! Tx: ${result.transactionId}`);
        return result.transactionId;
      }
    } catch (error) {
      console.error("Resolve market failed:", error);
      toast.error(`Resolve error: ${getErrorMessage(error)}`);
    }
  };

  const claimWinnings = async (marketId: string) => {
    if (!address) return;

    setLoading(true);
    try {
      // Step 1: Call core contract claim_winnings with BetPosition record
      const positionRecord = await findClaimablePositionRecord(marketId);
      if (!positionRecord) {
        toast.error("No claimable bet record found for this market in your wallet.");
        return;
      }

      toast.info("Step 1/2: Claiming winnings from core contract...");
      const claimResult = await executeWalletTransaction({
        program: PROGRAM_ID,
        function: "claim_winnings",
        inputs: [positionRecord],
        fee: 500_000,
        privateFee: false,
      });

      if (!claimResult?.transactionId) {
        toast.error("Core claim failed.");
        return;
      }

      toast.success(`Core claim submitted: ${claimResult.transactionId}`);

      // Step 2: Call token contract claim_payout with escrow details
      // The user needs the escrow_id, payout_amount, and nullifier from the WinningsClaim record
      const escrowedBet = await findEscrowedBetRecord(marketId);
      if (!escrowedBet) {
        toast.info("Winnings claim registered. Please claim your payout once confirmed.");
        return claimResult.transactionId;
      }

      const escrowSource = escrowedBet.data ?? escrowedBet;
      const escrowId = cleanAleoPrimitive(escrowSource.escrow_id);
      const escrowIdFormatted = escrowId.includes("field") ? escrowId : `${escrowId}field`;

      toast.info("Step 2/2: Collecting payout from token contract...");
      // Note: payout_amount and nullifier would ideally come from the WinningsClaim record
      // For now, the user needs to wait for the core claim to be finalized on-chain
      toast.success(`Winnings claim submitted! Core Tx: ${claimResult.transactionId}. Payout will be available after on-chain finalization.`);
      return claimResult.transactionId;
    } catch (error) {
      console.error("Claim winnings failed:", error);
      toast.error(`Claim error: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    createMarket,
    placeBet,
    resolveMarket,
    claimWinnings,
    fetchMarkets,
    fetchUserBets,
    fetchTokenBalance,
    fetchPoolStats,
    requestCredits,
    loading,
    currentHeight,
    publicKey,
  };
};
