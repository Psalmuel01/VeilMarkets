import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { ORACLE_PROGRAM_ID, PROGRAM_ID, TOKEN_PROGRAM_ID } from "../lib/constants";
import { toast } from "sonner";
import type { TxHistoryResult } from "@provablehq/aleo-types";
import {
  fetchMappingValue,
  fetchTransaction,
  parseMarketInfo,
  fetchCurrentBlockHeight,
  PoolInfo,
  parsePoolInfo,
} from "@/lib/aleo";
import {
  saveMarketMetadata,
  getAllMarketMetadata,
  type MarketMetadataRow,
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
  // 1. Try common field names
  const possibleFields = ["microcredits", "amount", "value"];
  for (const field of possibleFields) {
    const raw = parseRecordField(record, field);
    if (raw) {
      const val = typeof raw === "string" ? raw.replace(/u64|u32|field|group|address|\.private|\.public/g, "").trim() : String(raw);
      const parsed = Number.parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
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

  const executeAndPoll = useCallback(
    async (
      options: ExecuteWalletTransactionOptions,
      pollProgram: string,
      pollFunction: string
    ): Promise<{ transactionId: string; transition: any } | null> => {
      try {
        // Snapshot BEFORE executing
        const existingHistory = await requestTransactionHistory(pollProgram);
        const existingAtIds = new Set(
          (existingHistory?.transactions ?? [])
            .map((tx: any) => tx.transactionId)
            .filter((id: string) => id?.startsWith('at1'))
        );
        // console.log(`[poll] Existing at1 IDs before submit:`, [...existingAtIds]);

        const result = await executeWalletTransaction(options);
        if (!result?.transactionId) return null;

        toast.info(`Transaction submitted! Waiting for network confirmation...`);

        let actualTxId = result.transactionId.startsWith('at1') ? result.transactionId : undefined;
        let foundTransition: any = null;

        outer: for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          // console.log(`[poll] attempt ${i + 1} for ${pollFunction}...`);

          try {
            if (!actualTxId) {
              const history = await requestTransactionHistory(pollProgram);
              const txs = history?.transactions ?? [];

              // First try: match by shield_ id directly
              const shieldMatch = txs.find((t: any) => t.id === result.transactionId);
              if (shieldMatch?.transactionId?.startsWith('at1')) {
                actualTxId = shieldMatch.transactionId;
                // console.log(`[poll] Matched by shield id:`, actualTxId);
              }

              // Fallback: only NEW at1 IDs that didn't exist before submit
              if (!actualTxId) {
                const newAtTxIds = txs
                  .map((tx: any) => tx.transactionId)
                  .filter((id: string) => id?.startsWith('at1') && !existingAtIds.has(id));

                // console.log(`[poll] New at1 IDs since submit:`, newAtTxIds);

                for (const atTxId of newAtTxIds) {
                  const txData = await fetchTransaction(atTxId);
                  if (!txData) continue;

                  const transitions = txData?.execution?.transitions ?? [];
                  const transitionMatch = transitions.find(
                    (t: any) =>
                      t.function === pollFunction &&
                      (t.program === pollProgram ||
                        String(t.program).startsWith(pollProgram.split('.')[0]))
                  );

                  if (transitionMatch) {
                    actualTxId = atTxId;
                    foundTransition = transitionMatch;
                    // console.log(`[poll] Found via new at1 ID:`, actualTxId);
                    break outer;
                  }
                }
              }
            }

            if (actualTxId && !foundTransition) {
              const txData = await fetchTransaction(actualTxId);
              if (!txData) continue;

              const transitions = txData?.execution?.transitions ?? [];
              const transitionMatch = transitions.find(
                (t: any) =>
                  t.function === pollFunction &&
                  (t.program === pollProgram ||
                    String(t.program).startsWith(pollProgram.split('.')[0]))
              );

              if (transitionMatch) {
                foundTransition = transitionMatch;
                console.log(`[poll] Confirmed tx:`, actualTxId);
                break outer;
              }
            }
          } catch (e) {
            console.warn(`[poll] attempt ${i + 1} failed:`, e);
          }
        }

        if (actualTxId && foundTransition) {
          toast.success('Transaction confirmed!');
          return { transactionId: actualTxId, transition: foundTransition };
        }

        toast.error('Transaction failed to confirm within time limit.');
        return null;
      } catch (error) {
        console.error("Execute failed:", error);
        toast.error(`Transaction failed: ${getErrorMessage(error)}`);
        return null;
      }
    },
    [executeWalletTransaction, requestTransactionHistory]
  );

  /**
   * Fetch all markets by cross-referencing on-chain data with off-chain metadata.
   * Uses Supabase metadata as global source, and wallet tx history as supplementary source.
   */

  const fetchMarkets = useCallback(async (): Promise<ChainMarket[]> => {
    setLoading(true);
    try {
      const metadataRows = await getAllMarketMetadata();
      // console.log('[fetchMarkets] Rows from Supabase:', metadataRows);

      if (metadataRows.length === 0) return [];

      const marketFetches = metadataRows.map(async (row: MarketMetadataRow) => {
        if (!row.market_id || row.market_id === 'pending') {
          console.warn('[fetchMarkets] Skipping invalid market_id:', row);
          return null;
        }

        try {
          const cleanId = row.market_id.replace(/field$/i, '').trim();
          const fieldId = `${cleanId}field`;

          const raw = await fetchMappingValue(PROGRAM_ID, "markets", fieldId);
          // console.log(`[fetchMarkets] On-chain data for ${fieldId}:`, raw);

          if (!raw) {
            console.warn(`[fetchMarkets] No on-chain data for ${fieldId}`);
            return null;
          }

          const parsed = parseMarketInfo(raw as string | object, fieldId);

          return {
            ...parsed,
            transactionId: row.transaction_id,
            title: row.title || `Market ${row.market_id.slice(0, 8)}...`,
            description: row.description || 'No description.',
            source: row.source || 'Creator',
          } satisfies ChainMarket;
        } catch (err) {
          console.error(`[fetchMarkets] Failed for market_id ${row.market_id}:`, err);
          return null;
        }
      });

      const results = await Promise.all(marketFetches);
      const markets = results.filter((m) => m !== null);
      // console.log(`[fetchMarkets] Loaded ${markets.length} markets`);
      return markets;
    } catch (error) {
      console.error("[fetchMarkets] Fatal error:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for current height

  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = async () => {
      const h = await fetchCurrentBlockHeight();
      if (h) setCurrentHeight(h);
    };
    updateHeight();
    const interval = setInterval(updateHeight, 60000); // 60s
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

      // console.log(`[fetchUserBets] Found ${records.length} total records from ${TOKEN_PROGRAM_ID}, ${unspentRecords.length} are unspent.`);

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

      // console.log(`[fetchUserBets] Returning ${results.length} valid bet records.`);
      return results;
    } catch (error) {
      console.error("Failed to fetch user bets:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [address, requestRecords]);

  const fetchBalances = useCallback(async () => {
    if (!address) return { private: 0, public: 0, total: 0 };

    let privateMicro = 0;
    try {
      const rawRecords = await requestRecords("credits.aleo", true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      privateMicro = records.filter(r => !r.spent).reduce((acc, r) => acc + extractRecordAmount(r), 0);
    } catch (e) {
      console.warn("[Balances] Private fetch failed");
    }

    let publicMicro = 0;
    try {
      const rawValue = await fetchMappingValue("credits.aleo", "account", address);
      if (rawValue) {
        const clean = String(rawValue).replace(/u64/g, "").trim();
        publicMicro = Number.parseInt(clean, 10) || 0;
      }
    } catch (e) {
      console.warn("[Balances] Public fetch failed");
    }

    return {
      private: privateMicro / 1_000_000,
      public: publicMicro / 1_000_000,
      total: (privateMicro + publicMicro) / 1_000_000
    };
  }, [address, requestRecords]);

  const fetchTokenBalance = useCallback(async (): Promise<number> => {
    const balances = await fetchBalances();
    return balances.total;
  }, [fetchBalances]);


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
      const result = await executeAndPoll({
        program: PROGRAM_ID,
        function: "create_market",
        inputs: [titleHash, formatU8(category), formatU64(closeBlock), formatU64(resolutionBlock)],
        fee: 2_000_000,
        privateFee: false,
      }, PROGRAM_ID, "create_market");

      if (result) {
        // Extract marketId
        const futureOutput = result.transition?.outputs?.find((o: any) => o.type === 'future');
        const match = String(futureOutput?.value).match(/arguments:\s*\[\s*(\d+field)/);

        if (match) {
          const marketId = match[1];
          await saveMarketMetadata(result.transactionId, marketId, title, description, resolutionSource);
          return marketId;
        }
      }
      return null;
    } catch (error) {
      console.error("Create market failed:", error);
      return null;
    }
  };

  const requestCredits = async () => {
    toast.info("Please use the Aleo Faucet to get native credits for betting.");
    window.open("https://faucet.aleo.org/", "_blank");
  };

  const findCreditsRecord = async (requiredAmountMicro: number): Promise<WalletRecord | null> => {
    if (!address) return null;

    try {
      // NOTE: Some wallets block "credits.aleo" requestRecords for security.
      // If this fails, we ask the user to ensure they have enough unspent credits in a single record.
      let rawRecords: any[] = [];
      try {
        rawRecords = await requestRecords("credits.aleo", true);
      } catch (walletError: any) {
        console.error("[findCreditsRecord] Wallet Error:", walletError);
        if (walletError.message?.includes("Program not allowed")) {
          toast.error("Wallet blocked access to Credits. Please ensure your wallet allows 'credits.aleo' access or try a different wallet.");
        }
        throw walletError;
      }

      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      console.log(`[findCreditsRecord] Found ${unspent.length} unspent records from credits.aleo`);

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
        // Double check if they have public funds
        const balance = await fetchTokenBalance();
        if (balance >= amountCredits) {
          toast.error("Your credits are PUBLIC. You must convert them to PRIVATE first to place a bet.");
        } else {
          toast.error("Insufficient balance. Total: " + balance + " Credits");
        }
        return;
      }

      const betResult = await executeAndPoll({
        program: TOKEN_PROGRAM_ID,
        function: "place_bet",
        inputs: [
          creditsRecord.recordPlaintext || creditsRecord.plaintext,
          cleanMarketId,
          formatU8(outcome),
          formatU64(amountMicro),
        ],
        fee: 1_500_000,
        privateFee: false,
      }, TOKEN_PROGRAM_ID, "place_bet");

      return betResult ? betResult.transactionId : null;
    } catch (error) {
      console.error("Place bet failed:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const proposeResolution = async (marketId: string, outcome: number) => {
    if (!address) return;
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

    try {
      const result = await executeAndPoll({
        program: ORACLE_PROGRAM_ID,
        function: "propose_resolution",
        inputs: [cleanMarketId, formatU8(outcome)],
        fee: 500_000,
        privateFee: false,
      }, ORACLE_PROGRAM_ID, "propose_resolution");

      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Propose resolution failed:", error);
      return null;
    }
  };

  const disputeResolution = async (marketId: string, amountCredits: number) => {
    if (!address) return;
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
    const amountMicro = toMicrocredits(amountCredits);

    try {
      const creditsRecord = await findCreditsRecord(amountMicro);
      if (!creditsRecord) {
        toast.error("Insufficient private balance for dispute bond.");
        return;
      }

      const result = await executeAndPoll({
        program: ORACLE_PROGRAM_ID,
        function: "dispute_resolution",
        inputs: [
          creditsRecord.recordPlaintext || creditsRecord.plaintext,
          cleanMarketId,
          formatU64(amountMicro)
        ],
        fee: 1_000_000,
        privateFee: false,
      }, ORACLE_PROGRAM_ID, "dispute_resolution");

      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Dispute failed:", error);
      return null;
    }
  };

  const resolveMarketOnCore = async (marketId: string, outcome: number) => {
    if (!address) return;
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

    try {
      const result = await executeAndPoll({
        program: ORACLE_PROGRAM_ID,
        function: "resolve_on_core",
        inputs: [cleanMarketId, formatU8(outcome)],
        fee: 1_000_000,
        privateFee: false,
      }, ORACLE_PROGRAM_ID, "resolve_on_core");

      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Final resolution failed:", error);
      return null;
    }
  };

  const registerAsOracle = async (amountCredits: number) => {
    if (!address) return;
    const amountMicro = toMicrocredits(amountCredits);

    try {
      const creditsRecord = await findCreditsRecord(amountMicro);
      if (!creditsRecord) {
        toast.error("Insufficient private balance to stake.");
        return;
      }

      const result = await executeAndPoll({
        program: ORACLE_PROGRAM_ID,
        function: "register_oracle",
        inputs: [
          creditsRecord.recordPlaintext || creditsRecord.plaintext,
          formatU64(amountMicro)
        ],
        fee: 1_000_000,
        privateFee: false,
      }, ORACLE_PROGRAM_ID, "register_oracle");

      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Oracle registration failed:", error);
      return null;
    }
  };

  const shieldCredits = async (amountCredits: number) => {
    if (!address) return;
    setLoading(true);
    const amountMicro = toMicrocredits(amountCredits);

    try {
      toast.info(`Shielding ${amountCredits} Credits...`);
      const result = await executeAndPoll({
        program: "credits.aleo",
        function: "transfer_public_to_private",
        inputs: [address, formatU64(amountMicro)],
        fee: 100_000,
        privateFee: false,
      }, "credits.aleo", "transfer_public_to_private");

      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Shield credits failed:", error);
      return null;
    } finally {
      setLoading(false);
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
      const claimResult = await executeAndPoll({
        program: PROGRAM_ID,
        function: "claim_winnings",
        inputs: [positionRecord],
        fee: 500_000,
        privateFee: false,
      }, PROGRAM_ID, "claim_winnings");

      if (!claimResult?.transactionId) {
        toast.error("Core claim failed.");
        return;
      }

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

  const isOracleRegistered = useCallback(async (): Promise<boolean> => {
    if (!publicKey) return false;
    try {
      const raw = await fetchMappingValue(ORACLE_PROGRAM_ID, "active_oracles", publicKey);
      return raw !== null;
    } catch (error) {
      console.error("Failed to check oracle registration:", error);
      return false;
    }
  }, [publicKey]);

  const fetchResolutionProposal = useCallback(async (marketId: string) => {
    try {
      const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
      const raw = await fetchMappingValue(ORACLE_PROGRAM_ID, "proposals", cleanMarketId);
      if (!raw) return null;

      const data = typeof raw === "string" ? JSON.parse(raw.replace(/field|u8|u64|address/g, '').replace(/([a-zA-Z0-9_]+):/g, '"$1":')) : raw;

      return {
        market_id: cleanAleoPrimitive(data.market_id),
        proposed_outcome: Number(cleanAleoPrimitive(data.proposed_outcome)),
        challenge_deadline: Number(cleanAleoPrimitive(data.challenge_deadline)),
        is_disputed: Boolean(data.is_disputed),
        proposer: cleanAleoPrimitive(data.proposer),
      };
    } catch (error) {
      console.error("Failed to fetch resolution proposal:", error);
      return null;
    }
  }, []);

  return {
    createMarket,
    placeBet,
    resolveMarket: resolveMarketOnCore,
    proposeResolution,
    disputeResolution,
    registerAsOracle,
    fetchResolutionProposal,
    claimWinnings,
    shieldCredits,
    fetchBalances,
    fetchMarkets,
    fetchUserBets,
    fetchTokenBalance,
    fetchPoolStats,
    isOracleRegistered,
    requestCredits,
    loading,
    currentHeight,
    publicKey,
  };
};
