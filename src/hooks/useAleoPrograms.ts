import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { toast } from "sonner";
import type { TxHistoryResult } from "@provablehq/aleo-types";
import {
  fetchMappingValue,
  fetchTransaction,
  parseMarketInfo,
  fetchCurrentBlockHeight,
  DEFAULT_BLOCK_TIME_SECONDS,
  PoolInfo,
  parsePoolInfo,
  parseResolutionProposal,
} from "@/lib/aleo";
import {
  saveMarketMetadata,
  getAllMarketMetadata,
  type MarketMetadataRow,
} from "../lib/metadata";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRefresh } from "../context/RefreshContext";

type TxHistoryTransaction = TxHistoryResult["transactions"][number];

interface WalletRecord {
  id?: string;
  spent?: boolean;
  timestamp?: number | string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ParsedBetRecord {
  market_id: string;
  outcome: string;
  amount: string;
  escrow_id: string;
  spent: boolean;
  position_spent?: boolean;
}

// Aleo Program IDs from constants
import {
  PROGRAM_ID,
  ORACLE_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  USDCX_TOKEN_PROGRAM_ID,
  USAD_TOKEN_PROGRAM_ID,
  resolveTokenAdapterProgram,
  resolveTokenBaseProgram,
  resolveTokenTicker,
  resolveTokenDisplayName,
  resolveTokenKind,
} from "../lib/constants";

export interface ChainMarket {
  creator: string;
  title_hash: string;
  category: number;
  close_time: number;
  resolution_time: number;
  is_resolved: boolean;
  winning_outcome: number;
  resolved_by_oracle: boolean;
  token_id: string;
  // Computed fields from metadata
  id: string;
  title?: string;
  description?: string;
  resolutionSource?: string;
  closesAtTs?: number;
}

interface ExecuteWalletTransactionOptions {
  program: string;
  function: string;
  inputs: unknown[];
  fee: number;
  privateFee: boolean;
}

interface TokenBalanceSummary {
  private: number;
  public: number;
  total: number;
}

const toObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const cleanAleoPrimitive = (value: unknown): string => {
  if (typeof value === "string") {
    return value
      .replace(/u8|u64|u128|field|group|address|\.private|\.public/g, "")
      .replace(/["']/g, "")
      .trim();
  }
  return String(value ?? "");
};

const parseAleoAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/u64|u128|u32/g, "").trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toMicrocredits = (credits: number): number => Math.max(1_000_000, Math.floor(credits * 1_000_000));

const formatU64 = (value: number): string => `${Math.max(0, Math.floor(value))}u64`;
const formatU8 = (value: number): string => `${Math.max(0, Math.floor(value))}u8`;
const formatField = (value: string): string => (value.endsWith("field") ? value : `${value}field`);

const parseMappingU64 = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/-?\d+/);
    const parsed = match ? Number.parseInt(match[0], 10) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.value !== undefined) return parseMappingU64(obj.value);
  }
  return 0;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const isWalletNoResponse = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("no response");
};

const requestRecordsWithRetry = async (
  requestRecords: (programId: string, includeUnspent: boolean) => Promise<unknown[]>,
  programId: string,
  label: string,
  retries = 2,
): Promise<unknown[]> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await requestRecords(programId, true);
    } catch (error) {
      if (isWalletNoResponse(error) && i < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[${label}] requestRecords failed for ${programId}:`, error);
      throw error;
    }
  }
  return [];
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
      const val = typeof raw === "string" ? raw.replace(/u64|u128|u32|field|group|address|\.private|\.public/g, "").trim() : String(raw);
      const parsed = Number.parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
};

const isLikelyRecordPlaintext = (value: string, requiredFields: string[]): boolean =>
  value.includes("{") &&
  value.includes("}") &&
  requiredFields.every((field) => new RegExp(`${field}\\s*:`).test(value));

const buildRecordPlaintextFromData = (
  record: WalletRecord,
  requiredFields: string[],
): string | null => {
  const dataObj = toObject(record.data) ?? toObject(record);
  if (!dataObj) return null;

  const entries: string[] = [];
  for (const field of requiredFields) {
    const value = dataObj[field];
    if (value === undefined) continue;
    entries.push(`${field}: ${String(value).trim()}`);
  }

  const nonceValue = dataObj._nonce ?? dataObj.nonce;
  if (nonceValue !== undefined && !entries.some((entry) => entry.startsWith("_nonce:"))) {
    entries.push(`_nonce: ${String(nonceValue).trim()}`);
  }

  if (entries.length === 0) return null;
  return `{ ${entries.join(", ")} }`;
};

const extractRecordPlaintextInput = (
  record: WalletRecord,
  requiredFields: string[],
): string | null => {
  const candidates: unknown[] = [record.recordPlaintext, (record as any).plaintext];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const text = candidate.trim();
    if (isLikelyRecordPlaintext(text, requiredFields)) return text;
  }

  return buildRecordPlaintextFromData(record, requiredFields);
};

const normalizeU32 = (value: unknown): string => {
  const str = String(value ?? "").trim();
  return /u32$/.test(str) ? str : `${str.replace(/u32$/g, "")}u32`;
};

const normalizeField = (value: unknown): string => {
  const str = String(value ?? "").trim();
  return /field$/.test(str) ? str : `${str.replace(/field$/g, "")}field`;
};

const formatMerkleProof = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.includes("siblings") && (trimmed.includes("leaf_index") || trimmed.includes("leafIndex"))) {
      return trimmed;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const siblingsRaw = Array.isArray(obj.siblings) ? obj.siblings : null;
  const leafIndex = obj.leaf_index ?? obj.leafIndex;
  if (!siblingsRaw || leafIndex === undefined) return null;

  const siblings = siblingsRaw.map((entry) => normalizeField(entry));
  return `{ siblings: [${siblings.join(", ")}], leaf_index: ${normalizeU32(leafIndex)} }`;
};

const parseMerkleProofPairString = (value: string): [string, string] | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return null;

  let depth = 0;
  let splitIndex = -1;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (char === "{") depth += 1;
    if (char === "}") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      splitIndex = i;
      break;
    }
  }

  if (splitIndex < 0) return null;
  const left = inner.slice(0, splitIndex).trim();
  const right = inner.slice(splitIndex + 1).trim();
  if (!left || !right) return null;
  return [left, right];
};

const extractUsdcMerkleProofInputs = (record: WalletRecord): [string, string] | null => {
  const sources: unknown[] = [];
  const direct = toObject(record);
  const data = toObject(record.data);

  if (direct) {
    sources.push(
      direct.token_proof,
      direct.tokenProof,
      direct.merkle_proof,
      direct.merkleProof,
      direct.merkle_path,
      direct.merklePath,
      direct.proofs,
      direct.proof,
      direct.membershipProof,
      direct.witness,
    );
  }
  if (data) {
    sources.push(
      data.token_proof,
      data.tokenProof,
      data.merkle_proof,
      data.merkleProof,
      data.merkle_path,
      data.merklePath,
      data.proofs,
      data.proof,
      data.membershipProof,
      data.witness,
    );
  }

  for (const source of sources) {
    if (!source) continue;
    if (typeof source === "string") {
      const trimmed = source.trim();
      const parsed = parseMerkleProofPairString(trimmed);
      if (parsed) return parsed;
    }
    if (Array.isArray(source) && source.length >= 2) {
      const p0 = formatMerkleProof(source[0]);
      const p1 = formatMerkleProof(source[1]);
      if (p0 && p1) return [p0, p1];
    }
    if (typeof source === "object" && source !== null) {
      const obj = source as Record<string, unknown>;
      const p0 = formatMerkleProof(obj[0] ?? obj.proof0 ?? obj.first ?? obj.left);
      const p1 = formatMerkleProof(obj[1] ?? obj.proof1 ?? obj.second ?? obj.right);
      if (p0 && p1) return [p0, p1];
    }
  }

  return null;
};

export const useAleoPrograms = () => {
  const { address, executeTransaction, requestRecords, requestTransactionHistory } = useWallet();
  const { refreshSignal, triggerRefresh } = useRefresh();
  const publicKey = address;
  const [loading, setLoading] = useState(false);

  const logProgramRecordSummary = async (programId: string, label: string) => {
    try {
      const rawRecords = await requestRecordsWithRetry(requestRecords, programId, label);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);
      console.warn(`[Claim] ${label} records for ${programId}:`, {
        total: records.length,
        unspent: unspent.length,
      });
    } catch (error) {
      console.warn(`[Claim] Failed to read records for ${programId}:`, error);
    }
  };

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
            id: parsed.id || fieldId,
            title: row.title || `Market ${row.market_id.slice(0, 8)}...`,
            description: row.description || 'No description.',
            resolutionSource: row.source || 'Creator',
            closesAtTs: row.expiry_time || parsed.close_time * 1000,
          } as ChainMarket;
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

  const [currentHeight, setCurrentHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = async () => {
      const h = await fetchCurrentBlockHeight();
      if (!h) return;
      setCurrentHeight(h);
    };
    updateHeight();
    const interval = setInterval(updateHeight, 30000); // 30s is enough now that we don't estimate
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
      // Query token adapters for EscrowedBet records (where bets are escrowed)
      const tokenPrograms = [TOKEN_PROGRAM_ID, USDCX_TOKEN_PROGRAM_ID, USAD_TOKEN_PROGRAM_ID];
      const unspentRecords: WalletRecord[] = [];

      for (const programId of tokenPrograms) {
        try {
          const rawRecords = await requestRecordsWithRetry(requestRecords, programId, "EscrowedBet");
          const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
          unspentRecords.push(...records.filter((record) => !record.spent));
        } catch (error) {
          console.warn(`[fetchUserBets] Failed to read EscrowedBet records for ${programId}:`, error);
        }
      }

      const rawPositions = await requestRecordsWithRetry(requestRecords, PROGRAM_ID, "BetPosition");
      const positionRecords = rawPositions.filter(
        (entry): entry is WalletRecord => typeof entry === "object" && entry !== null,
      );
      const positionSpentByKey = new Map<string, boolean>();
      for (const record of positionRecords) {
        const market_id = parseRecordField(record, "market_id");
        const escrow_id = parseRecordField(record, "escrow_id");
        if (!market_id || !escrow_id) continue;
        const key = `${market_id}-${escrow_id}`;
        positionSpentByKey.set(key, Boolean(record.spent));
      }

      // console.log(`[fetchUserBets] Found ${unspentRecords.length} unspent EscrowedBet records across token adapters.`);

      const results = unspentRecords
        .map((record) => {
          const market_id = parseRecordField(record, "market_id");
          const outcome = parseRecordField(record, "outcome");
          const amount = parseRecordField(record, "amount");
          const escrow_id = parseRecordField(record, "escrow_id");
          const position_key = `${market_id}-${escrow_id}`;
          const position_spent = positionSpentByKey.get(position_key) ?? false;

          if (market_id) {
            console.log(`[fetchUserBets] Found bet for market: ${market_id}`, { outcome, amount, escrow_id });
          }

          return {
            market_id,
            outcome,
            amount,
            escrow_id,
            spent: Boolean(record.spent),
            position_spent,
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

  const fetchArc20Balances = useCallback(async (
    baseProgramId: string,
    label: string,
  ): Promise<TokenBalanceSummary> => {
    if (!address) return { private: 0, public: 0, total: 0 };

    let privateMicro = 0;
    try {
      const rawRecords = await requestRecordsWithRetry(requestRecords, baseProgramId, label);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      privateMicro = records.filter((record) => !record.spent).reduce((acc, record) => acc + extractRecordAmount(record), 0);
    } catch (e) {
      console.warn(`[${label} Balance] Private record fetch failed`);
    }

    let publicMicro = 0;
    try {
      // ARC-20 stablecoin uses `balances` mapping (address => u128)
      const rawValue = await fetchMappingValue(baseProgramId, "balances", address);
      publicMicro = parseMappingU64(rawValue);
    } catch (e) {
      console.warn(`[${label} Balance] Public mapping fetch failed`);
    }

    return {
      private: privateMicro / 1_000_000,
      public: publicMicro / 1_000_000,
      total: (privateMicro + publicMicro) / 1_000_000,
    };
  }, [address, requestRecords]);

  const fetchUSDCxBalances = useCallback(async (): Promise<TokenBalanceSummary> => {
    return fetchArc20Balances("test_usdcx_stablecoin.aleo", "USDCx");
  }, [fetchArc20Balances]);

  const fetchUSDCxBalance = useCallback(async (): Promise<number> => {
    const balances = await fetchUSDCxBalances();
    return balances.total;
  }, [fetchUSDCxBalances]);

  const fetchUSADBalances = useCallback(async (): Promise<TokenBalanceSummary> => {
    return fetchArc20Balances("test_usad_stablecoin.aleo", "USAD");
  }, [fetchArc20Balances]);

  const fetchUSADBalance = useCallback(async (): Promise<number> => {
    const balances = await fetchUSADBalances();
    return balances.total;
  }, [fetchUSADBalances]);


  const createMarket = async (
    title: string,
    description: string,
    category: number,
    closeTime: number, // Unix timestamp in seconds
    resolutionTime: number, // Unix timestamp in seconds
    resolutionSource: string,
    tokenId: string,
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
        inputs: [titleHash, formatU8(category), formatU64(closeTime), formatU64(resolutionTime), tokenId],
        fee: 2_500_000,
        privateFee: false,
      }, PROGRAM_ID, "create_market");

      if (result) {
        // Extract marketId
        const futureOutput = result.transition?.outputs?.find((o: any) => o.type === 'future');
        const match = String(futureOutput?.value).match(/arguments:\s*\[\s*(\d+field)/);

        if (match) {
          const marketId = match[1];
          console.log("[createMarket] Metadata before saving to Supabase:", {
            transactionId: result.transactionId,
            marketId,
            title,
            description,
            resolutionSource,
            expiry_time: closeTime * 1000
          });
          // Save metadata including expiry_time
          try {
            await saveMarketMetadata(
              result.transactionId,
              marketId,
              title,
              description,
              resolutionSource,
              closeTime * 1000 // absolute ms for metadata
            );
          } catch (metadataError) {
            const maybeError = metadataError as { code?: string; message?: string };
            if (maybeError?.code === "42501") {
              toast.warning("Market created on-chain, but metadata save was blocked by Supabase RLS for markets_v7.");
            } else {
              toast.warning("Market created on-chain, but metadata save failed.");
            }
          }
          triggerRefresh();
          return { transactionId: result.transactionId, marketId };
        }
      }
      return null;
    } catch (error) {
      console.error("Create market failed:", error);
      return null;
    }
  };

  const requestCredits = async () => {
    toast.info("Opening Aleo Faucet...");
    window.open("https://faucet.aleo.org/", "_blank");
  };

  const requestUSDCx = async () => {
    toast.info("USDCx can be obtained via the official USDCx bridge/faucet on testnet.");
    // In a real app, link to the specific USDCx faucet/bridge if available
  };

  const requestUSAD = async () => {
    toast.info("USAD can be obtained via the official USAD bridge/faucet on testnet.");
    // In a real app, link to the specific USAD faucet/bridge if available
  };

  const findTokenRecord = async (tokenProgramId: string, requiredAmountMicro: number): Promise<WalletRecord | null> => {
    if (!address) return null;

    try {
      const label =
        tokenProgramId === "credits.aleo"
          ? "Credits"
          : tokenProgramId === "test_usad_stablecoin.aleo"
            ? "USAD"
            : "USDCx";
      const rawRecords = await requestRecordsWithRetry(requestRecords, tokenProgramId, label);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      
      const unspent = records.filter(r => !r.spent);
      
      const matchingRecord = unspent.find((record) => extractRecordAmount(record) >= requiredAmountMicro);

      if (!matchingRecord) {
        console.warn(`[findTokenRecord] No record with >= ${requiredAmountMicro} for ${tokenProgramId} found among ${unspent.length} unspent records`);
      }

      return matchingRecord ?? null;
    } catch (error) {
      console.error(`[findTokenRecord] Error for ${tokenProgramId}:`, error);
      return null;
    }
  };

  const findCreditsRecord = (amountMicro: number) => findTokenRecord("credits.aleo", amountMicro);

  const findClaimablePositionRecord = async (marketId: string): Promise<WalletRecord | null> => {
    if (!address) return null;

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      // Search CORE program for BetPosition records
      const rawRecords = await requestRecordsWithRetry(requestRecords, PROGRAM_ID, "Claim");
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      const found = unspent.find((record) => {
        const recordMarketId = parseRecordField(record, "market_id");
        return recordMarketId === cleanMarketId;
      });

      return found ?? null;
    } catch (error) {
      if (isWalletNoResponse(error)) {
        toast.error("Wallet did not respond. Unlock/approve the wallet and retry claim.");
      }
      console.error("Error finding claimable record:", error);
      return null;
    }
  };

  const waitForPositionRecord = async (marketId: string): Promise<WalletRecord | null> => {
    for (let i = 0; i < 10; i++) {
      const record = await findClaimablePositionRecord(marketId);
      if (record) return record;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return null;
  };

  const findEscrowedBetRecord = async (
    marketId: string,
    tokenProgramId: string = TOKEN_PROGRAM_ID
  ): Promise<WalletRecord | null> => {
    if (!address) return null;

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      // Search TOKEN program for EscrowedBet records
      const rawRecords = await requestRecordsWithRetry(requestRecords, tokenProgramId, "EscrowedBet");
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      const found = unspent.find((record) => {
        const recordMarketId = parseRecordField(record, "market_id");
        return recordMarketId === cleanMarketId;
      });

      return found ?? null;
    } catch (error) {
      if (isWalletNoResponse(error)) {
        toast.error("Wallet did not respond. Unlock/approve the wallet and retry claim.");
      }
      console.error(`Error finding escrowed bet record in ${tokenProgramId}:`, error);
      return null;
    }
  };

  const findWinningsClaimRecord = async (marketId: string): Promise<WalletRecord | null> => {
    if (!address) return null;

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      const rawRecords = await requestRecords(PROGRAM_ID, true);
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      const found = unspent.find((record) => {
        const recordMarketId = parseRecordField(record, "market_id");
        const nullifier = parseRecordField(record, "nullifier");
        return recordMarketId === cleanMarketId && Boolean(nullifier);
      });

      return found ?? null;
    } catch (error) {
      console.error("Error finding winnings claim record:", error);
      return null;
    }
  };

  const waitForWinningsClaimRecord = async (marketId: string): Promise<WalletRecord | null> => {
    for (let i = 0; i < 20; i++) {
      const record = await findWinningsClaimRecord(marketId);
      if (record) return record;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return null;
  };

  const waitForPendingPayout = async (nullifierField: string): Promise<number> => {
    for (let i = 0; i < 20; i++) {
      const payoutRaw = await fetchMappingValue(PROGRAM_ID, "pending_payouts", nullifierField);
      const payoutAmount = parseMappingU64(payoutRaw);
      if (payoutAmount > 0) return payoutAmount;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return 0;
  };

  const placeBet = async (marketId: string, outcome: number, amountCredits: number, tokenId: string) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
    const amountMicro = toMicrocredits(amountCredits);

    try {
      const tokenProgram = resolveTokenAdapterProgram(tokenId);
      const tokenKind = resolveTokenKind(tokenId);
      const tokenLabel = resolveTokenDisplayName(tokenId);

      if (!tokenProgram || !tokenKind) {
        toast.error(`Unsupported market token: ${tokenId}`);
        return;
      }

      toast.info(`Placing bet using ${tokenLabel}...`);
      let betResult: { transactionId: string; transition: any } | null = null;

      if (tokenKind === "usdcx" || tokenKind === "usad") {
        const baseTokenProgram = resolveTokenBaseProgram(tokenId);
        if (!baseTokenProgram) {
          toast.error(`Unsupported market token: ${tokenId}`);
          return;
        }

        const tokenRecord = await findTokenRecord(baseTokenProgram, amountMicro);
        if (!tokenRecord) {
          toast.error(`Insufficient private ${tokenLabel} balance.`);
          return;
        }

        const tokenInput = extractRecordPlaintextInput(tokenRecord, ["owner", "amount"]);
        const tokenProofInputs = extractUsdcMerkleProofInputs(tokenRecord);
        if (!tokenInput || !tokenProofInputs) {
          toast.error(`Missing private ${tokenLabel} record proof. Reconnect wallet with on-chain history access and try again.`);
          console.warn(`[${tokenLabel}] Unable to prepare private inputs for place_bet`, {
            recordKeys: Object.keys(tokenRecord ?? {}),
            dataKeys: Object.keys(toObject(tokenRecord?.data) ?? {}),
          });
          return;
        }

        betResult = await executeAndPoll({
          program: tokenProgram,
          function: "place_bet",
          inputs: [
            tokenInput,
            tokenProofInputs[0],
            tokenProofInputs[1],
            cleanMarketId,
            formatU8(outcome),
            formatU64(amountMicro),
          ],
          fee: 1_500_000,
          privateFee: false,
        }, tokenProgram, "place_bet");
      } else {
        const baseTokenProgram = resolveTokenBaseProgram(tokenId);
        if (!baseTokenProgram) {
          toast.error(`Unsupported market token: ${tokenId}`);
          return;
        }

        const tokenRecord = await findTokenRecord(baseTokenProgram, amountMicro);
        if (!tokenRecord) {
          toast.error(`Insufficient private ${tokenLabel} balance.`);
          return;
        }

        const tokenInput =
          extractRecordPlaintextInput(tokenRecord, ["owner", "microcredits"]) ??
          (tokenRecord.recordPlaintext || tokenRecord.plaintext);
        if (!tokenInput) {
          toast.error("Unable to prepare private credits record input.");
          return;
        }

        betResult = await executeAndPoll({
          program: tokenProgram,
          function: "place_bet",
          inputs: [
            tokenInput,
            cleanMarketId,
            formatU8(outcome),
            formatU64(amountMicro),
          ],
          fee: 1_500_000,
          privateFee: false,
        }, tokenProgram, "place_bet");
      }

      if (betResult) triggerRefresh();
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

      if (result) triggerRefresh();
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

      if (result) triggerRefresh();
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

      if (result) triggerRefresh();
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

      if (result) triggerRefresh();
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

      if (result) triggerRefresh();
      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Shield credits failed:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const claimWinnings = async (
    marketId: string,
  ): Promise<{ transactionId: string; payoutAmount: number; payoutTicker: string } | null> => {
    if (!address) return;

    setLoading(true);
    try {
      const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      const marketInfo = marketRaw ? parseMarketInfo(marketRaw as string | object, cleanMarketId) : null;
      const payoutTokenProgram = resolveTokenAdapterProgram(marketInfo?.token_id ?? "");
      const payoutTicker = resolveTokenTicker(marketInfo?.token_id ?? "");

      if (!payoutTokenProgram) {
        toast.error(`Unsupported payout token for market ${marketId}.`);
        return null;
      }

      // Step 1: Call core contract claim_winnings with BetPosition record
      let positionRecord = await findClaimablePositionRecord(marketId);
      if (!positionRecord) {
        const escrowedBet = await findEscrowedBetRecord(marketId, payoutTokenProgram);
        if (!escrowedBet) {
          await logProgramRecordSummary(payoutTokenProgram, "EscrowedBet");
          toast.error(`No claimable bet record found for this market in your wallet. Ensure you placed the bet with this wallet and that your wallet allows ${payoutTokenProgram} records.`);
          return;
        }

        const marketIdRaw = parseRecordField(escrowedBet, "market_id");
        const outcomeRaw = parseRecordField(escrowedBet, "outcome");
        const amountRaw = parseRecordField(escrowedBet, "amount");
        const escrowIdRaw = parseRecordField(escrowedBet, "escrow_id");

        if (!marketIdRaw || !outcomeRaw || !amountRaw || !escrowIdRaw) {
          toast.error("Unable to read escrowed bet details to mint position.");
          return;
        }

        toast.info("Preparing claim record...");
        await executeAndPoll({
          program: PROGRAM_ID,
          function: "mint_position_record",
          inputs: [
            formatField(marketIdRaw),
            formatU8(Number(outcomeRaw)),
            formatU64(Number(amountRaw)),
            formatField(escrowIdRaw),
          ],
          fee: 500_000,
          privateFee: false,
        }, PROGRAM_ID, "mint_position_record");

        positionRecord = await waitForPositionRecord(marketId);
        if (!positionRecord) {
          toast.error("Claim record not found after minting. Please retry.");
          return;
        }
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

      // Step 2: Wait for WinningsClaim record, then claim payout from token contract
      const claimRecord = await waitForWinningsClaimRecord(marketId);
      if (!claimRecord) {
        toast.error("Claim record not found in wallet yet. Please retry in a moment.");
        triggerRefresh();
        return { transactionId: claimResult.transactionId, payoutAmount: 0, payoutTicker };
      }

      const nullifierRaw = parseRecordField(claimRecord, "nullifier");
      if (!nullifierRaw) {
        toast.error("Unable to read claim nullifier from wallet record.");
        triggerRefresh();
        return { transactionId: claimResult.transactionId, payoutAmount: 0, payoutTicker };
      }

      const nullifierField = formatField(nullifierRaw);
      const payoutAmount = await waitForPendingPayout(nullifierField);

      if (!payoutAmount || payoutAmount <= 0) {
        toast.error("Payout not available yet. Please retry shortly.");
        triggerRefresh();
        return { transactionId: claimResult.transactionId, payoutAmount: 0, payoutTicker };
      }

      toast.info("Step 2/2: Collecting payout from token contract...");
      const payoutResult = await executeAndPoll({
        program: payoutTokenProgram,
        function: "claim_payout",
        inputs: [formatU64(payoutAmount), nullifierField],
        fee: 500_000,
        privateFee: false,
      }, payoutTokenProgram, "claim_payout");

      if (!payoutResult?.transactionId) {
        toast.error("Token payout failed.");
        return null;
      }

      const payoutAleo = payoutAmount / 1_000_000;
      toast.success(`Payout claimed! ${payoutAleo.toFixed(4)} ${payoutTicker}`);
      triggerRefresh();
      return { transactionId: payoutResult.transactionId, payoutAmount: payoutAleo, payoutTicker };
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

      return parseResolutionProposal(raw as any);
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
    fetchUSDCxBalances,
    fetchUSDCxBalance,
    fetchUSADBalances,
    fetchUSADBalance,
    fetchPoolStats,
    isOracleRegistered,
    requestCredits,
    requestUSDCx,
    requestUSAD,
    refreshSignal,
    publicKey,
    loading,
    currentHeight,
  };
};
