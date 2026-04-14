import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { toast } from "sonner";
import {
  fetchMappingValue,
  fetchTransaction,
  extractMarketIdFromTx,
  parseMarketInfo,
  PoolInfo,
  parsePoolInfo,
  parseResolutionProposal,
} from "@/lib/aleo";
import {
  saveMarketMetadata,
  getAllMarketMetadata,
  type MarketMetadataRow,
} from "../lib/metadata";
import { useState, useCallback } from "react";
import { useRefresh } from "../context/RefreshContext";
import { formatDateFriendly } from "@/lib/utils";

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
  CREDITS_TOKEN_PROGRAM_ID,
  USDCX_TOKEN_PROGRAM_ID,
  USAD_TOKEN_PROGRAM_ID,
  resolveTokenAdapterProgram,
  resolveTokenBaseProgram,
  resolveTokenTicker,
  resolveTokenDisplayName,
  resolveTokenKind,
  FACTORY_PROGRAM_ID,
} from "../lib/constants";

export interface ChainMarket {
  program_id?: string;
  creator: string;
  title_hash: string;
  category: number;
  market_type: number;
  outcome_count: number;
  outcome_labels?: string[];
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

interface CoreProtocolConfig {
  maxOutcomes: number;
  feeBps: number;
  lpFeeShareBps: number;
  minTrade: number;
  minLiquidity: number;
  maxMarketCollateral: number;
}

interface MarketPositionSummary {
  marketId: string;
  outcome: number | null;
  sellableShares: number; // total shares sellable across all same-outcome position records
  sellableCollateral: number;
  outcomeShares: Record<number, number>;
  outcomeMaxPositionShares: Record<number, number>;
  tradePositionCount: number;
  lpShares: number;
  lpCollateral: number;
  lpFeeAccrued: number;
  lpWithdrawable: number;
  lpPositionCount: number;
}

interface BuyQuote {
  marketId: string;
  outcome: number;
  amountMicro: number;
  feeMicro: number;
  netCollateralMicro: number;
  sharesOut: number;
  minSharesOut: number;
  slippageBps: number;
  priceMicro: number;
}

interface SellQuote {
  marketId: string;
  outcome: number;
  sharesToSell: number;
  grossPayoutMicro: number;
  feeMicro: number;
  netPayoutMicro: number;
  minPayoutMicro: number;
  slippageBps: number;
}

export interface ResolutionFinalizeRequirements {
  marketId: string;
  proposal: {
    proposed_outcome: number;
    challenge_deadline: number;
    is_disputed: boolean;
    proposer: string;
  } | null;
  minVoters: number;
  minStakeMicro: number;
  quorumWeightMicro: number;
  voterCount: number;
  totalVoteWeightMicro: number;
  selectedOutcomeVoteWeightMicro: number;
  leadingOutcome: number | null;
  leadingOutcomeVoteWeightMicro: number;
  recommendedOutcome: number | null;
  timeoutEligible: boolean;
  timeoutAt: number | null;
  fallbackMode: boolean;
  canFinalize: boolean;
  blockers: string[];
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

const unwrapValue = (value: unknown): unknown => {
  let current: unknown = value;
  let depth = 0;

  while (depth < 5 && typeof current === "object" && current !== null) {
    const obj = current as Record<string, unknown>;
    if (obj.value === undefined) break;
    current = obj.value;
    depth += 1;
  }

  return current;
};

const toMicrocredits = (credits: number): number => Math.max(1_000_000, Math.floor(credits * 1_000_000));

const formatU64 = (value: number): string => `${Math.max(0, Math.floor(value))}u64`;
const formatU8 = (value: number): string => `${Math.max(0, Math.floor(value))}u8`;
const formatField = (value: string): string => (value.endsWith("field") ? value : `${value}field`);
const generateRandomField = (): string => {
  const seed = crypto.getRandomValues(new Uint32Array(2));
  const randomValue = (BigInt(seed[0]) << 32n) + BigInt(seed[1]);
  return `${randomValue}field`;
};
const USDCX_FREEZELIST_PROGRAM_ID = "test_usdcx_freezelist.aleo";
const USAD_FREEZELIST_PROGRAM_ID = "test_usad_freezelist.aleo";
const MIN_ORACLE_STAKE_MICROCREDITS = 20_000_000;

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

const parseMappingBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.max(0, Math.floor(value)));
  }
  if (typeof value === "string") {
    const match = value.match(/-?\d+/);
    if (!match) return 0n;
    try {
      const parsed = BigInt(match[0]);
      return parsed < 0n ? 0n : parsed;
    } catch {
      return 0n;
    }
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.value !== undefined) return parseMappingBigInt(obj.value);
  }
  return 0n;
};

const parseMappingString = (value: unknown): string | null => {
  const unwrapped =
    typeof value === "object" && value !== null && "value" in (value as Record<string, unknown>)
      ? (value as Record<string, unknown>).value
      : value;
  if (typeof unwrapped !== "string") return null;
  const cleaned = unwrapped.replace(/["']/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
};

const resolveFreezeListProgramId = (baseTokenProgramId: string): string | null => {
  if (baseTokenProgramId === "test_usdcx_stablecoin.aleo") return USDCX_FREEZELIST_PROGRAM_ID;
  if (baseTokenProgramId === "test_usad_stablecoin.aleo") return USAD_FREEZELIST_PROGRAM_ID;
  return null;
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

const extractTransitionField = (transition: unknown, field: string): string | null => {
  if (!transition || typeof transition !== "object") return null;
  const outputs = Array.isArray((transition as { outputs?: unknown[] }).outputs)
    ? ((transition as { outputs?: unknown[] }).outputs as unknown[])
    : [];
  const patterns = [
    new RegExp(`${field}\\s*:\\s*(\\d+field)`),
    new RegExp(`"${field}"\\s*:\\s*"?(\\d+field)`),
  ];

  for (const output of outputs) {
    const candidates: string[] = [];
    if (typeof output === "string") candidates.push(output);
    if (typeof output === "object" && output !== null) {
      const obj = output as Record<string, unknown>;
      if (typeof obj.value === "string") candidates.push(obj.value);
      candidates.push(JSON.stringify(obj));
    }
    for (const candidate of candidates) {
      for (const pattern of patterns) {
        const match = candidate.match(pattern);
        if (match?.[1]) return formatField(match[1]);
      }
    }
  }
  return null;
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

  if (!requiredFields.every((field) => entries.some((entry) => entry.startsWith(`${field}:`)))) {
    return null;
  }
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
  const raw = unwrapValue(value);
  const str = String(raw ?? "")
    .trim()
    .replace(/\.private|\.public/g, "");
  return /u32$/.test(str) ? str : `${str.replace(/u32$/g, "")}u32`;
};

const normalizeField = (value: unknown): string => {
  const raw = unwrapValue(value);
  const str = String(raw ?? "")
    .trim()
    .replace(/\.private|\.public/g, "");
  return /field$/.test(str) ? str : `${str.replace(/field$/g, "")}field`;
};

const normalizeFieldId = (marketId: string): string =>
  marketId.includes("field") ? marketId.replace(/\s+/g, "") : `${marketId.replace(/\s+/g, "")}field`;

let cachedBhpHelpers:
  | BhpHelpers
  | null = null;

type BhpHelpers = {
  hashOutcomeKey: (marketIdField: string, outcome: number) => string | null;
  hashLpKey: (marketIdField: string, lpOwnerField: string) => string | null;
};

const buildBhpFieldKey = (
  wasm: Awaited<typeof import("@provablehq/wasm")>,
  bhp: InstanceType<(typeof import("@provablehq/wasm"))["BHP256"]>,
  left: string,
  right: string,
): string | null => {
  try {
    const leftField = wasm.Field.fromString(normalizeField(left));
    const rightField = wasm.Field.fromString(normalizeField(right));
    const sumField = leftField.add(rightField);

    // The contracts derive these mapping keys with BHP256 over the field bits.
    // We lazily load the wasm module and reuse one BHP instance so read-only
    // queries can mirror the on-chain key derivation without paying that setup
    // cost on every hook render.
    const bits = sumField.toBitsLe();
    while (bits.length < 256) bits.push(false);

    return bhp.hash(bits).toString();
  } catch (error) {
    console.error("[BHP] Error deriving mapping key:", error);
    return null;
  }
};

const getBhpHelpers = async (): Promise<BhpHelpers | null> => {
  if (cachedBhpHelpers) return cachedBhpHelpers;
  try {
    const wasm = await import("@provablehq/wasm");
    const bhp = new wasm.BHP256();
    cachedBhpHelpers = {
      hashOutcomeKey: (marketIdField: string, outcome: number) => {
        const normalizedOutcome = `${Math.max(0, Math.floor(outcome))}field`;
        return buildBhpFieldKey(wasm, bhp, marketIdField, normalizedOutcome);
      },
      hashLpKey: (marketIdField: string, lpOwnerField: string) => {
        return buildBhpFieldKey(wasm, bhp, marketIdField, lpOwnerField);
      },
    };
    return cachedBhpHelpers;
  } catch (error) {
    console.warn("[BHP256] Unable to initialize hashed key helpers:", error);
    return null;
  }
};

const deriveOutcomeExposureKey = async (marketIdField: string, outcome: number): Promise<string | null> => {
  const helpers = await getBhpHelpers();
  if (!helpers) return null;
  return helpers.hashOutcomeKey(marketIdField, outcome);
};

const deriveOutcomeVoteKey = async (marketIdField: string, outcome: number): Promise<string | null> =>
  deriveOutcomeExposureKey(marketIdField, outcome);

const deriveLpBalanceKey = async (marketIdField: string, lpOwnerField: string): Promise<string | null> => {
  const helpers = await getBhpHelpers();
  if (!helpers) return null;
  return helpers.hashLpKey(marketIdField, lpOwnerField);
};

const deriveLpOwnerCommitment = async (marketIdField: string, ownerField: string): Promise<string | null> => {
  const helpers = await getBhpHelpers();
  if (!helpers) return null;
  return helpers.hashLpKey(marketIdField, ownerField);
};

let cachedAddressFieldHelpers:
  | AddressFieldHelpers
  | null = null;

type AddressFieldHelpers = {
  toField: (address: string) => string;
};

const getAddressFieldHelpers = async (): Promise<AddressFieldHelpers | null> => {
  if (cachedAddressFieldHelpers) return cachedAddressFieldHelpers;
  try {
    const wasm = await import("@provablehq/wasm");
    cachedAddressFieldHelpers = {
      toField: (address: string) =>
        wasm.Address.from_string(address).toGroup().toXCoordinate().toString(),
    };
    return cachedAddressFieldHelpers;
  } catch (error) {
    console.warn("[AddressField] Unable to initialize address field helper:", error);
    return null;
  }
};

const formatMerkleProof = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/\.private|\.public/g, "");
    if (trimmed.includes("siblings") && (trimmed.includes("leaf_index") || trimmed.includes("leafIndex"))) {
      return trimmed;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const siblingsRaw =
    (Array.isArray(obj.siblings) && obj.siblings) ||
    (Array.isArray(obj.path) && obj.path) ||
    (Array.isArray(obj.merkle_path) && obj.merkle_path) ||
    (Array.isArray(obj.merklePath) && obj.merklePath) ||
    null;
  const leafIndex = obj.leaf_index ?? obj.leafIndex ?? obj.index ?? obj.leaf;
  if (!siblingsRaw || leafIndex === undefined) return null;

  const siblings = siblingsRaw.map((entry) => normalizeField(entry));
  return `{ siblings: [${siblings.join(", ")}], leaf_index: ${normalizeU32(leafIndex)} }`;
};

const parseMerkleProofPairString = (value: string): [string, string] | null => {
  const trimmed = value.trim().replace(/\.private|\.public/g, "");
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

const collectMerkleProofCandidates = (value: unknown): string[] => {
  const queue: unknown[] = [value];
  const visited = new Set<unknown>();
  const candidates: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const formatted = formatMerkleProof(current);
    if (formatted) {
      const parsedPair = parseMerkleProofPairString(formatted);
      if (parsedPair) {
        candidates.push(parsedPair[0], parsedPair[1]);
      } else {
        candidates.push(formatted);
      }
      continue;
    }

    if (typeof current === "string") {
      const parsedPair = parseMerkleProofPairString(current);
      if (parsedPair) candidates.push(parsedPair[0], parsedPair[1]);
      continue;
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current === "object") {
      for (const nested of Object.values(current as Record<string, unknown>)) {
        queue.push(nested);
      }
    }
  }

  return candidates;
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
      direct.token_proof_0,
      direct.token_proof_1,
      direct.proof_0,
      direct.proof_1,
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
      data.token_proof_0,
      data.token_proof_1,
      data.proof_0,
      data.proof_1,
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
      const p0 = formatMerkleProof(
        obj[0] ??
        obj.proof0 ??
        obj.first ??
        obj.left ??
        obj.token_proof_0 ??
        obj.proof_0 ??
        obj.a ??
        obj.p0,
      );
      const p1 = formatMerkleProof(
        obj[1] ??
        obj.proof1 ??
        obj.second ??
        obj.right ??
        obj.token_proof_1 ??
        obj.proof_1 ??
        obj.b ??
        obj.p1,
      );
      if (p0 && p1) return [p0, p1];
    }
  }

  const deepCandidates = collectMerkleProofCandidates(record);
  if (deepCandidates.length >= 2) return [deepCandidates[0], deepCandidates[1]];

  const deepDataCandidates = collectMerkleProofCandidates(record.data);
  if (deepDataCandidates.length >= 2) return [deepDataCandidates[0], deepDataCandidates[1]];

  return null;
};

const generateFreezeListProof = async (
  freezeListProgramId: string,
  targetIndex = 1,
): Promise<string | null> => {
  try {
    const firstIndexRaw = await fetchMappingValue(freezeListProgramId, "freeze_list_index", "0u32");
    const firstIndexAddress = parseMappingString(firstIndexRaw);

    let occupiedLeafValue: string | undefined;
    if (firstIndexAddress) {
      const wasm = await import("@provablehq/wasm");
      const addr = wasm.Address.from_string(firstIndexAddress);
      occupiedLeafValue = addr.toGroup().toXCoordinate().toString();
    }

    const wasm = await import("@provablehq/wasm");
    const hasher = new wasm.Poseidon4();
    const emptyHashes: string[] = [];
    let currentEmpty = "0field";

    for (let i = 0; i < 16; i++) {
      emptyHashes.push(currentEmpty);
      const f = wasm.Field.fromString(currentEmpty);
      const nextHashField = hasher.hash([f, f]);
      currentEmpty = nextHashField.toString();
    }

    let currentHash = "0field";
    let currentIndex = targetIndex;
    const proofSiblings: string[] = [];

    for (let i = 0; i < 16; i++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      let siblingHash = emptyHashes[i];
      if (i === 0 && siblingIndex === 0 && occupiedLeafValue) {
        siblingHash = occupiedLeafValue;
      }

      proofSiblings.push(siblingHash);

      const left = wasm.Field.fromString(isLeft ? currentHash : siblingHash);
      const right = wasm.Field.fromString(isLeft ? siblingHash : currentHash);
      currentHash = hasher.hash([left, right]).toString();
      currentIndex = Math.floor(currentIndex / 2);
    }

    return `{ siblings: [${proofSiblings.join(", ")}], leaf_index: ${targetIndex}u32 }`;
  } catch (error) {
    console.warn(`[FreezeList] Failed to generate proof for ${freezeListProgramId}:`, error);
    const siblings = Array(16).fill("0field").join(", ");
    return `{ siblings: [${siblings}], leaf_index: ${targetIndex}u32 }`;
  }
};

const buildStablecoinMerkleProofInputs = async (
  baseTokenProgramId: string,
): Promise<[string, string] | null> => {
  const freezeListProgramId = resolveFreezeListProgramId(baseTokenProgramId);
  if (!freezeListProgramId) return null;
  const proof = await generateFreezeListProof(freezeListProgramId, 1);
  if (!proof) return null;
  return [proof, proof];
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

  const executeCreateMarketDirect = useCallback(
    async (
      inputs: string[],
    ): Promise<{ transactionId: string; transition: any } | null> => {
      try {
        const existingHistory = await requestTransactionHistory(PROGRAM_ID);
        const existingAtIds = new Set(
          (existingHistory?.transactions ?? [])
            .map((tx: any) => tx.transactionId)
            .filter((id: string) => id?.startsWith("at1")),
        );

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: "create_market",
          inputs: inputs.map((input) => input.trim()),
          fee: 2_500_000,
          privateFee: false,
        } as Parameters<typeof executeTransaction>[0]);

        if (!result?.transactionId) return null;

        toast.info("Create market submitted. Waiting for network confirmation...");

        let actualTxId = result.transactionId.startsWith("at1") ? result.transactionId : undefined;
        let foundTransition: any = null;

        outer: for (let i = 0; i < 15; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 4000));

          try {
            if (!actualTxId) {
              const history = await requestTransactionHistory(PROGRAM_ID);
              const txs = history?.transactions ?? [];

              const shieldMatch = txs.find((tx: any) => tx.id === result.transactionId);
              if (shieldMatch?.transactionId?.startsWith("at1")) {
                actualTxId = shieldMatch.transactionId;
              }

              if (!actualTxId) {
                const newAtTxIds = txs
                  .map((tx: any) => tx.transactionId)
                  .filter((id: string) => id?.startsWith("at1") && !existingAtIds.has(id));

                for (const atTxId of newAtTxIds) {
                  const txData = await fetchTransaction(atTxId);
                  if (!txData) continue;

                  const transitions = txData?.execution?.transitions ?? [];
                  const transitionMatch = transitions.find(
                    (tx: any) =>
                      tx.function === "create_market" &&
                      (tx.program === PROGRAM_ID || String(tx.program).startsWith(PROGRAM_ID.split(".")[0])),
                  );

                  if (transitionMatch) {
                    actualTxId = atTxId;
                    foundTransition = transitionMatch;
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
                (tx: any) =>
                  tx.function === "create_market" &&
                  (tx.program === PROGRAM_ID || String(tx.program).startsWith(PROGRAM_ID.split(".")[0])),
              );

              if (transitionMatch) {
                foundTransition = transitionMatch;
                break outer;
              }
            }
          } catch (error) {
            console.warn("[createMarket] poll attempt failed:", error);
          }
        }

        if (actualTxId && foundTransition) {
          toast.success("Create market confirmed!");
          return { transactionId: actualTxId, transition: foundTransition };
        }

        toast.error("Create market failed to confirm within time limit.");
        return null;
      } catch (error) {
        console.error("Create market direct execution failed:", error);
        toast.error(`Create market failed: ${getErrorMessage(error)}`);
        return null;
      }
    },
    [executeTransaction, requestTransactionHistory],
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
          const sourceProgramId =
            typeof row.program_id === "string" && row.program_id.trim().length > 0
              ? row.program_id.trim()
              : PROGRAM_ID;

          const raw = await fetchMappingValue(sourceProgramId, "markets", fieldId);
          // console.log(`[fetchMarkets] On-chain data for ${fieldId}:`, raw);

          if (!raw) {
            console.warn(`[fetchMarkets] No on-chain data for ${fieldId}`);
            return null;
          }

          const parsed = parseMarketInfo(raw as string | object, fieldId);

          return {
            ...parsed,
            program_id: sourceProgramId,
            id: parsed.id || fieldId,
            title: row.title || `Market ${row.market_id.slice(0, 8)}...`,
            description: row.description || 'No description.',
            resolutionSource: row.source || 'Creator',
            outcome_labels: row.outcome_labels,
            closesAtTs: row.expiry_time || row.close_time * 1000 || parsed.close_time * 1000,
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

  const fetchOutcomeTotals = useCallback(
    async (
      marketId: string,
      outcomeCount: number,
      _preferredProgramId?: string,
    ): Promise<number[]> => {
      const cleanMarketId = normalizeFieldId(marketId);
      const normalizedCount = Math.max(2, outcomeCount);
      const indices = Array.from({ length: normalizedCount }, (_, index) => index);
      const totals = await Promise.all(
        indices.map(async (index) => {
          const exposureKey = await deriveOutcomeExposureKey(cleanMarketId, index);
          if (!exposureKey) return 0;
          const [qtyRaw, supplyRaw] = await Promise.all([
            fetchMappingValue(PROGRAM_ID, "outcome_token_qty", exposureKey),
            fetchMappingValue(PROGRAM_ID, "outcome_token_supply", exposureKey),
          ]);
          const qty = parseMappingBigInt(qtyRaw);
          const supply = parseMappingBigInt(supplyRaw);
          const outstanding = supply > qty ? supply - qty : 0n;
          return outstanding > BigInt(Number.MAX_SAFE_INTEGER)
            ? Number.MAX_SAFE_INTEGER
            : Number(outstanding);
        }),
      );
      return totals;
    },
    [],
  );

  const fetchCoreProtocolConfig = useCallback(async (): Promise<CoreProtocolConfig> => {
    const [
      maxOutcomesRaw,
      feeBpsRaw,
      minTradeRaw,
      minLiquidityRaw,
      lpFeeShareBpsRaw,
      maxMarketCollateralRaw,
    ] =
      await Promise.all([
        fetchMappingValue(PROGRAM_ID, "protocol_u8", "0u8"),
        fetchMappingValue(PROGRAM_ID, "protocol_u64", "1u8"),
        fetchMappingValue(PROGRAM_ID, "protocol_u64", "2u8"),
        fetchMappingValue(PROGRAM_ID, "protocol_u64", "3u8"),
        fetchMappingValue(PROGRAM_ID, "protocol_u64", "5u8"),
        fetchMappingValue(PROGRAM_ID, "protocol_u64", "6u8"),
      ]);

    return {
      maxOutcomes: Math.min(8, Math.max(2, parseMappingU64(maxOutcomesRaw) || 8)),
      feeBps: Math.min(10_000, Math.max(0, parseMappingU64(feeBpsRaw) || 100)),
      lpFeeShareBps: Math.min(10_000, Math.max(0, parseMappingU64(lpFeeShareBpsRaw) || 8_000)),
      minTrade: Math.max(1, parseMappingU64(minTradeRaw) || 1_000_000),
      minLiquidity: Math.max(1, parseMappingU64(minLiquidityRaw) || 1_000_000),
      maxMarketCollateral: Math.max(1, parseMappingU64(maxMarketCollateralRaw) || 100_000_000_000),
    };
  }, []);

  const quoteBuyShares = useCallback(
    async (
      marketId: string,
      outcome: number,
      amountMicro: number,
      slippageBps = 200,
    ): Promise<BuyQuote | null> => {
      const cleanMarketId = normalizeFieldId(marketId);
      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      if (!marketRaw) return null;
      const market = parseMarketInfo(marketRaw as string | object, cleanMarketId);
      if (outcome < 0 || outcome >= market.outcome_count) return null;

      const poolRaw = await fetchMappingValue(PROGRAM_ID, "pools", cleanMarketId);
      const pool = poolRaw ? parsePoolInfo(poolRaw as any) : null;
      if (!pool) return null;

      const protocol = await fetchCoreProtocolConfig();
      if (amountMicro < protocol.minTrade) return null;
      const amountBI = BigInt(amountMicro);
      const feeBpsBI = BigInt(protocol.feeBps);
      const feeBI = (amountBI * feeBpsBI) / 10000n;
      const netCollateralBI = amountBI - feeBI;
      if (netCollateralBI <= 0n) return null;

      if ((pool.lp_collateral ?? 0) <= 0) return null;

      const outcomeCountNum = Math.max(2, Math.min(8, market.outcome_count));
      const allQty = await Promise.all(
        Array.from({ length: outcomeCountNum }, async (_, index) => {
          const key = await deriveOutcomeExposureKey(cleanMarketId, index);
          if (!key) return 0n;
          const raw = await fetchMappingValue(PROGRAM_ID, "outcome_token_qty", key);
          return parseMappingBigInt(raw);
        }),
      );

      const qtyOutcome = allQty[outcome] ?? 0n;
      if (qtyOutcome <= 0n) return null;

      const totalOtherQty = allQty.reduce(
        (sum, qty, index) => (index === outcome ? sum : sum + qty),
        0n,
      );
      if (totalOtherQty <= 0n) return null;

      const sharesOutBI = (qtyOutcome * netCollateralBI) / (totalOtherQty + netCollateralBI);
      if (sharesOutBI <= 0n || sharesOutBI >= qtyOutcome) return null;

      const boundedSlippage = Math.min(5_000, Math.max(0, slippageBps));
      const minSharesOutBI = (sharesOutBI * BigInt(10_000 - boundedSlippage)) / 10000n;
      if (minSharesOutBI <= 0n) return null;

      const sharesOut = Number(sharesOutBI);
      const minSharesOut = Number(minSharesOutBI);
      const priceMicroBI = (netCollateralBI * 1_000_000n) / sharesOutBI;

      return {
        marketId: cleanMarketId,
        outcome,
        amountMicro,
        feeMicro: Number(feeBI),
        netCollateralMicro: Number(netCollateralBI),
        sharesOut,
        minSharesOut,
        slippageBps: boundedSlippage,
        priceMicro: Number(priceMicroBI),
      };
    },
    [fetchCoreProtocolConfig],
  );

  const quoteSellShares = useCallback(
    async (
      marketId: string,
      outcome: number,
      sharesToSell: number,
      slippageBps = 200,
    ): Promise<SellQuote | null> => {
      const cleanMarketId = normalizeFieldId(marketId);
      if (sharesToSell <= 0) return null;

      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      if (!marketRaw) return null;
      const market = parseMarketInfo(marketRaw as string | object, cleanMarketId);
      if (outcome < 0 || outcome >= market.outcome_count) return null;

      const poolRaw = await fetchMappingValue(PROGRAM_ID, "pools", cleanMarketId);
      const pool = poolRaw ? parsePoolInfo(poolRaw as any) : null;
      if (!pool) return null;

      const protocol = await fetchCoreProtocolConfig();
      const sharesBI = BigInt(Math.max(1, Math.floor(sharesToSell)));
      const outcomeCountNum = Math.max(2, Math.min(8, market.outcome_count));
      const allQty = await Promise.all(
        Array.from({ length: outcomeCountNum }, async (_, index) => {
          const key = await deriveOutcomeExposureKey(cleanMarketId, index);
          if (!key) return 0n;
          const raw = await fetchMappingValue(PROGRAM_ID, "outcome_token_qty", key);
          return parseMappingBigInt(raw);
        }),
      );

      const qtyOutcome = allQty[outcome] ?? 0n;
      const totalOtherQty = allQty.reduce(
        (sum, qty, index) => (index === outcome ? sum : sum + qty),
        0n,
      );
      if (totalOtherQty <= 0n) return null;

      const grossPayoutBI = (totalOtherQty * sharesBI) / (qtyOutcome + sharesBI);
      if (grossPayoutBI <= 0n || grossPayoutBI > BigInt(pool.total_collateral)) return null;

      const feeBpsBI = BigInt(protocol.feeBps);
      const feeBI = (grossPayoutBI * feeBpsBI) / 10000n;
      const netPayoutBI = grossPayoutBI > feeBI ? grossPayoutBI - feeBI : 0n;

      const boundedSlippage = Math.min(5_000, Math.max(0, slippageBps));
      const minPayoutBI = (netPayoutBI * BigInt(10_000 - boundedSlippage)) / 10000n;

      if (grossPayoutBI <= 0n || netPayoutBI <= 0n) return null;

      return {
        marketId: cleanMarketId,
        outcome,
        sharesToSell: Number(sharesBI),
        grossPayoutMicro: Number(grossPayoutBI),
        feeMicro: Number(feeBI),
        netPayoutMicro: Number(netPayoutBI),
        minPayoutMicro: Number(minPayoutBI),
        slippageBps: boundedSlippage,
      };
    },
    [fetchCoreProtocolConfig],
  );

  const fetchUserBets = useCallback(async (): Promise<ParsedBetRecord[]> => {
    if (!address) return [];
    setLoading(true);
    try {
      const rawPositions = await requestRecordsWithRetry(requestRecords, PROGRAM_ID, "BetPosition");
      const positionRecords = rawPositions.filter(
        (entry): entry is WalletRecord => typeof entry === "object" && entry !== null,
      );
      const results = positionRecords
        .map((record) => {
          const market_id = parseRecordField(record, "market_id");
          const outcome = parseRecordField(record, "outcome");
          const amount = parseRecordField(record, "collateral_in");
          const escrow_id = parseRecordField(record, "position_id");

          return {
            market_id,
            outcome,
            amount,
            escrow_id,
            spent: Boolean(record.spent),
            position_spent: Boolean(record.spent),
          };
        })
        .filter((record) => Boolean(record.market_id));
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

  const fetchUSADBalances = useCallback(async (): Promise<TokenBalanceSummary> => {
    return fetchArc20Balances("test_usad_stablecoin.aleo", "USAD");
  }, [fetchArc20Balances]);


  const createMarket = async (
    title: string,
    description: string,
    category: number,
    marketType: number,
    outcomeCount: number,
    outcomeLabels: string[],
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
      const result = await executeCreateMarketDirect([
        titleHash,
        formatU8(category),
        formatU8(marketType),
        formatU8(outcomeCount),
        formatU64(closeTime),
        formatU64(resolutionTime),
        tokenId,
      ]);

      if (result) {
        const txData = await fetchTransaction(result.transactionId);
        const marketId =
          extractMarketIdFromTx(txData) ??
          (() => {
            const futureOutput = result.transition?.outputs?.find((o: any) => o.type === "future");
            const match = String(futureOutput?.value).match(/arguments:\s*\[\s*(\d+field)/);
            return match?.[1] ?? null;
          })();

        if (marketId) {
          // Save metadata for rendering and filtering.
          try {
            await saveMarketMetadata({
              transaction_id: result.transactionId,
              market_id: marketId,
              title,
              description,
              source: resolutionSource || "Creator",
              category,
              market_type: marketType,
              outcome_count: outcomeCount,
              outcome_labels: outcomeLabels,
              token_id: tokenId,
              close_time: closeTime,
              resolution_time: resolutionTime,
              created_by: address,
            });
          } catch (metadataError) {
            const maybeError = metadataError as { code?: string; message?: string };
            if (maybeError?.code === "42501") {
              toast.warning("Market created on-chain, but metadata save was blocked by Supabase RLS for markets_v12.");
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

  const findTokenRecord = async (
    tokenProgramId: string,
    requiredAmountMicro: number,
    options?: { requireMerkleProof?: boolean },
  ): Promise<WalletRecord | null> => {
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

      const matchingRecord = unspent.find((record) => {
        if (extractRecordAmount(record) < requiredAmountMicro) return false;
        if (!options?.requireMerkleProof) return true;
        return Boolean(extractUsdcMerkleProofInputs(record));
      });

      if (!matchingRecord) {
        const proofMode = options?.requireMerkleProof ? " with Merkle proof" : "";
        console.warn(
          `[findTokenRecord] No record with >= ${requiredAmountMicro}${proofMode} for ${tokenProgramId} found among ${unspent.length} unspent records`,
        );
      }

      return matchingRecord ?? null;
    } catch (error) {
      console.error(`[findTokenRecord] Error for ${tokenProgramId}:`, error);
      return null;
    }
  };

  const findCreditsRecord = (amountMicro: number) => findTokenRecord("credits.aleo", amountMicro);

  const findClaimablePositionRecords = async (
    marketId: string,
    options?: { outcome?: number; includeLp?: boolean },
  ): Promise<WalletRecord[]> => {
    if (!address) return [];

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      const rawRecords = await requestRecordsWithRetry(requestRecords, PROGRAM_ID, "BetPosition");
      const records = rawRecords.filter((entry): entry is WalletRecord => typeof entry === "object" && entry !== null);
      const unspent = records.filter((record) => !record.spent);

      const candidates = unspent
        .filter((record) => {
          const recordMarketId = parseRecordField(record, "market_id");
          if (recordMarketId !== cleanMarketId) return false;

          const outcomeRaw = Number.parseInt(parseRecordField(record, "outcome"), 10);
          if (options?.outcome !== undefined) {
            return Number.isFinite(outcomeRaw) && outcomeRaw === options.outcome;
          }

          if (!options?.includeLp) {
            return !Number.isFinite(outcomeRaw) || outcomeRaw !== 255;
          }
          return true;
        })
        .map((record) => ({
          record,
          shares: Number.parseInt(parseRecordField(record, "shares"), 10),
        }))
        .filter((entry) => Number.isFinite(entry.shares) && entry.shares > 0)
        .sort((a, b) => b.shares - a.shares);

      return candidates.map((entry) => entry.record);
    } catch (error) {
      if (isWalletNoResponse(error)) {
        toast.error("Wallet did not respond. Unlock/approve the wallet and retry claim.");
      }
      console.error("Error finding claimable record:", error);
      return [];
    }
  };

  const findClaimablePositionRecord = async (
    marketId: string,
    options?: { outcome?: number; includeLp?: boolean },
  ): Promise<WalletRecord | null> => {
    const records = await findClaimablePositionRecords(marketId, options);
    return records[0] ?? null;
  };

  const waitForPositionRecord = async (
    marketId: string,
    options?: { outcome?: number; includeLp?: boolean },
  ): Promise<WalletRecord | null> => {
    for (let i = 0; i < 10; i++) {
      const record = await findClaimablePositionRecord(marketId, options);
      if (record) return record;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return null;
  };

  const fetchMarketPositionSummary = useCallback(
    async (marketId: string, outcome?: number): Promise<MarketPositionSummary> => {
      const cleanMarketId = marketId.replace(/field$/i, "").trim();
      const empty: MarketPositionSummary = {
        marketId: cleanMarketId,
        outcome: typeof outcome === "number" ? outcome : null,
        sellableShares: 0,
        sellableCollateral: 0,
        outcomeShares: {},
        outcomeMaxPositionShares: {},
        tradePositionCount: 0,
        lpShares: 0,
        lpCollateral: 0,
        lpFeeAccrued: 0,
        lpWithdrawable: 0,
        lpPositionCount: 0,
      };
      if (!address || !cleanMarketId) return empty;

      try {
        const rawRecords = await requestRecordsWithRetry(requestRecords, PROGRAM_ID, "BetPosition");
        const records = rawRecords.filter(
          (entry): entry is WalletRecord => typeof entry === "object" && entry !== null,
        );
        const unspent = records.filter((record) => !record.spent);

        let sellableShares = 0;
        let sellableCollateral = 0;
        const outcomeShares: Record<number, number> = {};
        const outcomeMaxPositionShares: Record<number, number> = {};
        let tradePositionCount = 0;
        let lpShares = 0;
        let lpCollateral = 0;
        let lpFeeAccrued = 0;
        let lpWithdrawable = 0;
        let lpPositionCount = 0;

        for (const record of unspent) {
          const recordMarketId = parseRecordField(record, "market_id");
          if (recordMarketId !== cleanMarketId) continue;

          const recordOutcome = Number.parseInt(parseRecordField(record, "outcome"), 10);
          const shares = Number.parseInt(parseRecordField(record, "shares"), 10);
          const collateral = Number.parseInt(parseRecordField(record, "collateral_in"), 10);
          if (!Number.isFinite(shares) || shares <= 0) continue;

          if (recordOutcome === 255) {
            lpPositionCount += 1;
            lpShares += shares;
            if (Number.isFinite(collateral) && collateral > 0) lpCollateral += collateral;
            continue;
          }
          outcomeShares[recordOutcome] = (outcomeShares[recordOutcome] ?? 0) + shares;
          outcomeMaxPositionShares[recordOutcome] = Math.max(
            outcomeMaxPositionShares[recordOutcome] ?? 0,
            shares,
          );

          tradePositionCount += 1;
          if (typeof outcome === "number" && recordOutcome === outcome) {
            sellableShares += shares;
            sellableCollateral += Number.isFinite(collateral) && collateral > 0 ? collateral : 0;
          }
        }

        const marketField = `${cleanMarketId}field`;
        const helpers = await getAddressFieldHelpers();
        if (helpers) {
          const ownerField = formatField(helpers.toField(address));
          const lpOwnerCommitment = await deriveLpOwnerCommitment(marketField, ownerField);
          const lpBalanceKey = lpOwnerCommitment
            ? await deriveLpBalanceKey(marketField, lpOwnerCommitment)
            : null;
          if (lpBalanceKey) {
            const [
              lpSharesRaw,
              poolRaw,
              feePoolRaw,
              lpReturnPoolRaw,
              marketRaw,
            ] = await Promise.all([
              fetchMappingValue(PROGRAM_ID, "lp_balances", lpBalanceKey),
              fetchMappingValue(PROGRAM_ID, "pools", marketField),
              fetchMappingValue(PROGRAM_ID, "market_fee_pool", marketField),
              fetchMappingValue(PROGRAM_ID, "market_lp_return_pool", marketField),
              fetchMappingValue(PROGRAM_ID, "markets", marketField),
            ]);
            const mappedLpShares = parseMappingU64(lpSharesRaw);
            if (mappedLpShares > 0) {
              lpShares = mappedLpShares;
              lpPositionCount = Math.max(lpPositionCount, 1);
            }
            const poolInfo = poolRaw ? parsePoolInfo(poolRaw as string | object) : null;
            const marketInfo = marketRaw ? parseMarketInfo(marketRaw as string | object, marketField) : null;
            if (poolInfo && poolInfo.lp_supply > 0 && lpShares > 0) {
              lpCollateral = Math.floor((lpShares * poolInfo.lp_collateral) / poolInfo.lp_supply);
              lpFeeAccrued = Math.floor((lpShares * parseMappingU64(feePoolRaw)) / poolInfo.lp_supply);
              if (marketInfo?.is_resolved) {
                const lpReturnShare = Math.floor(
                  (lpShares * parseMappingU64(lpReturnPoolRaw)) / poolInfo.lp_supply,
                );
                lpWithdrawable = lpReturnShare + lpFeeAccrued;
              } else {
                lpWithdrawable = 0;
              }
            } else if (lpShares > 0) {
              lpWithdrawable = 0;
            }
          }
        }

        return {
          marketId: cleanMarketId,
          outcome: typeof outcome === "number" ? outcome : null,
          sellableShares,
          sellableCollateral,
          outcomeShares,
          outcomeMaxPositionShares,
          tradePositionCount,
          lpShares,
          lpCollateral,
          lpFeeAccrued,
          lpWithdrawable,
          lpPositionCount,
        };
      } catch (error) {
        console.error("Failed to fetch market position summary:", error);
        return empty;
      }
    },
    [address, requestRecords],
  );

  const findWinningsClaimRecord = async (marketId: string): Promise<WalletRecord | null> => {
    if (!address) return null;

    const cleanMarketId = marketId.includes("field") ? marketId.replace("field", "") : marketId;

    try {
      const rawRecords = await requestRecordsWithRetry(requestRecords, PROGRAM_ID, "WinningsClaim");
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

  const placeBet = async (
    marketId: string,
    outcome: number,
    amountCredits: number,
    tokenId: string,
    options?: { slippageBps?: number },
  ) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
    const amountMicro = toMicrocredits(amountCredits);
    const betNonce = generateRandomField();

    try {
      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      if (!marketRaw) {
        toast.error("Market not found on v12.");
        return;
      }

      const quote = await quoteBuyShares(
        cleanMarketId,
        outcome,
        amountMicro,
        options?.slippageBps ?? 200,
      );
      if (!quote) {
        const [protocol, poolRaw] = await Promise.all([
          fetchCoreProtocolConfig().catch(() => null),
          fetchMappingValue(PROGRAM_ID, "pools", cleanMarketId).catch(() => null)
        ]);

        if (protocol && amountMicro < protocol.minTrade) {
          toast.error(
            `Trade too small. Minimum trade is ${(protocol.minTrade / 1_000_000).toFixed(6)} tokens.`,
          );
        } else if (protocol && poolRaw) {
          const pool = parsePoolInfo(poolRaw as any);
          if (pool.lp_collateral <= 0) {
            toast.error("Market needs LP funding before trading opens. Please add liquidity first.");
          } else {
            toast.error("Unable to compute share quote for this market. Please retry.");
          }
        } else {
          toast.error("Unable to compute share quote for this market. Please retry.");
        }
        return;
      }

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

        const generatedProofPromise = buildStablecoinMerkleProofInputs(baseTokenProgram);
        const tokenRecord = await findTokenRecord(baseTokenProgram, amountMicro);
        if (!tokenRecord) {
          toast.error(`Insufficient private ${tokenLabel} balance.`);
          return;
        }

        const tokenInput = extractRecordPlaintextInput(tokenRecord, ["owner", "amount"]);
        if (!tokenInput) {
          toast.error(`Unable to prepare private ${tokenLabel} record input.`);
          return;
        }

        const generatedProofInputs = await generatedProofPromise;
        const walletProofInputs = extractUsdcMerkleProofInputs(tokenRecord);

        const proofCandidates: Array<[string, string]> = [];
        if (generatedProofInputs) proofCandidates.push(generatedProofInputs);
        if (
          walletProofInputs &&
          (!generatedProofInputs ||
            walletProofInputs[0] !== generatedProofInputs[0] ||
            walletProofInputs[1] !== generatedProofInputs[1])
        ) {
          proofCandidates.push(walletProofInputs);
        }

        if (proofCandidates.length === 0) {
          toast.error(`Missing private ${tokenLabel} proof inputs. Reconnect wallet and try again.`);
          console.warn(`[${tokenLabel}] Unable to prepare private inputs for buy_shares`, {
            recordKeys: Object.keys(tokenRecord ?? {}),
            dataKeys: Object.keys(toObject(tokenRecord?.data) ?? {}),
          });
          return;
        }

        for (const [proof0, proof1] of proofCandidates) {
          betResult = await executeAndPoll({
            program: tokenProgram,
            function: "buy_shares",
            inputs: [
              tokenInput,
              proof0,
              proof1,
              cleanMarketId,
              formatU8(outcome),
              formatU64(amountMicro),
              formatU64(quote.minSharesOut),
              formatU64(quote.sharesOut),
              betNonce,
            ],
            fee: 1_500_000,
            privateFee: false,
          }, tokenProgram, "buy_shares");
          if (betResult) break;
        }
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
          function: "buy_shares",
          inputs: [
            tokenInput,
            cleanMarketId,
            formatU8(outcome),
            formatU64(amountMicro),
            formatU64(quote.minSharesOut),
            formatU64(quote.sharesOut),
            betNonce,
          ],
          fee: 1_500_000,
          privateFee: false,
        }, tokenProgram, "buy_shares");
      }

      if (betResult) {
        triggerRefresh();
        await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s for Aleo to settle
      }
      return betResult ? betResult.transactionId : null;
    } catch (error) {
      console.error("Place bet failed:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fundPool = async (marketId: string, amountCredits: number, tokenId: string) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return null;
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
        return null;
      }

      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      if (!marketRaw) {
        toast.error("Pool funding is only available for deployed v12 markets.");
        return null;
      }

      toast.info(`Funding pool with ${tokenLabel}...`);

      if (tokenKind === "usdcx" || tokenKind === "usad") {
        const baseTokenProgram = resolveTokenBaseProgram(tokenId);
        if (!baseTokenProgram) return null;

        const generatedProofPromise = buildStablecoinMerkleProofInputs(baseTokenProgram);
        const tokenRecord = await findTokenRecord(baseTokenProgram, amountMicro);
        if (!tokenRecord) {
          toast.error(`Insufficient private ${tokenLabel} balance.`);
          return null;
        }

        const tokenInput = extractRecordPlaintextInput(tokenRecord, ["owner", "amount"]);
        if (!tokenInput) {
          toast.error(`Unable to prepare private ${tokenLabel} record input.`);
          return null;
        }

        const generatedProofInputs = await generatedProofPromise;
        const walletProofInputs = extractUsdcMerkleProofInputs(tokenRecord);
        const proof = generatedProofInputs ?? walletProofInputs;
        if (!proof) {
          toast.error(`Missing private ${tokenLabel} proof inputs. Reconnect wallet and try again.`);
          return null;
        }

        const result = await executeAndPoll({
          program: tokenProgram,
          function: "fund_pool",
          inputs: [
            tokenInput,
            proof[0],
            proof[1],
            cleanMarketId,
            formatU64(amountMicro),
          ],
          fee: 1_500_000,
          privateFee: false,
        }, tokenProgram, "fund_pool");

        if (result) {
          triggerRefresh();
          await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s for Aleo to settle
        }
        return result ? result.transactionId : null;
      }

      const creditsRecord = await findTokenRecord("credits.aleo", amountMicro);
      if (!creditsRecord) {
        toast.error("Insufficient private Aleo Credits balance.");
        return null;
      }
      const creditsInput =
        extractRecordPlaintextInput(creditsRecord, ["owner", "microcredits"]) ??
        (creditsRecord.recordPlaintext || creditsRecord.plaintext);
      if (!creditsInput) {
        toast.error("Unable to prepare private credits record input.");
        return null;
      }

      const result = await executeAndPoll({
        program: tokenProgram,
        function: "fund_pool",
        inputs: [creditsInput, cleanMarketId, formatU64(amountMicro)],
        fee: 1_500_000,
        privateFee: false,
      }, tokenProgram, "fund_pool");

      if (result) {
        triggerRefresh();
        await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s for Aleo to settle
      }
      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Fund pool failed:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const withdrawLiquidity = async (
    marketId: string,
    lpShares: number,
    options?: { minPayoutMicro?: number },
  ): Promise<{ transactionId: string; payoutAmount: number; payoutTicker: string } | null> => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return null;
    }

    setLoading(true);
    try {
      const cleanMarketId = normalizeFieldId(marketId);
      const sharesToWithdraw = Math.max(1, Math.floor(lpShares));
      const minPayoutMicro = Math.max(0, Math.floor(options?.minPayoutMicro ?? 0));
      const withdrawNonce = generateRandomField();

      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      if (!marketRaw) {
        toast.error("Market not found on v12.");
        return null;
      }
      const marketInfo = parseMarketInfo(marketRaw as string | object, cleanMarketId);
      const payoutTokenProgram = resolveTokenAdapterProgram(marketInfo.token_id ?? "");
      const payoutTicker = resolveTokenTicker(marketInfo.token_id ?? "");
      if (!payoutTokenProgram) {
        toast.error("Unsupported market token for liquidity withdrawal.");
        return null;
      }

      const withdrawResult = await executeAndPoll({
        program: PROGRAM_ID,
        function: "withdraw_liquidity",
        inputs: [
          cleanMarketId,
          formatU64(sharesToWithdraw),
          formatU64(minPayoutMicro),
          withdrawNonce,
        ],
        fee: 1_000_000,
        privateFee: false,
      }, PROGRAM_ID, "withdraw_liquidity");

      if (!withdrawResult?.transactionId) {
        toast.error("Liquidity withdrawal transaction failed.");
        return null;
      }

      let nullifierField = extractTransitionField(withdrawResult.transition, "nullifier");
      if (!nullifierField) {
        const claimRecord = await waitForWinningsClaimRecord(cleanMarketId);
        if (!claimRecord) {
          toast.error("Liquidity claim record not available yet. Please retry shortly.");
          triggerRefresh();
          return { transactionId: withdrawResult.transactionId, payoutAmount: 0, payoutTicker };
        }
        const nullifierRaw = parseRecordField(claimRecord, "nullifier");
        if (!nullifierRaw) {
          toast.error("Unable to read liquidity claim nullifier.");
          return { transactionId: withdrawResult.transactionId, payoutAmount: 0, payoutTicker };
        }
        nullifierField = formatField(nullifierRaw);
      }

      const payoutAmount = await waitForPendingPayout(nullifierField);
      if (!payoutAmount || payoutAmount <= 0) {
        toast.error("Liquidity payout is not available yet. Please retry shortly.");
        triggerRefresh();
        return { transactionId: withdrawResult.transactionId, payoutAmount: 0, payoutTicker };
      }

      const payoutResult = await executeAndPoll({
        program: payoutTokenProgram,
        function: "claim_payout",
        inputs: [formatU64(payoutAmount), nullifierField],
        fee: 500_000,
        privateFee: false,
      }, payoutTokenProgram, "claim_payout");

      if (!payoutResult?.transactionId) {
        toast.error("Liquidity payout transfer failed.");
        return null;
      }

      const payoutAmountDisplay = payoutAmount / 1_000_000;
      toast.success(`Liquidity withdrawn: ${payoutAmountDisplay.toFixed(4)} ${payoutTicker}`);
      triggerRefresh();
      return {
        transactionId: payoutResult.transactionId,
        payoutAmount: payoutAmountDisplay,
        payoutTicker,
      };
    } catch (error) {
      console.error("Withdraw liquidity failed:", error);
      toast.error(`Withdraw error: ${getErrorMessage(error)}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sellShares = async (
    marketId: string,
    sharesToSell: number,
    options?: { slippageBps?: number; outcome?: number },
  ): Promise<{ transactionId: string; payoutAmount: number; payoutTicker: string } | null> => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return null;
    }

    setLoading(true);
    try {
      const cleanMarketId = normalizeFieldId(marketId);
      const marketRaw = await fetchMappingValue(PROGRAM_ID, "markets", cleanMarketId);
      if (!marketRaw) {
        toast.error("Market not found on v12.");
        return null;
      }
      const marketInfo = parseMarketInfo(marketRaw as string | object, cleanMarketId);
      const payoutTokenProgram = resolveTokenAdapterProgram(marketInfo.token_id ?? "");
      const payoutTicker = resolveTokenTicker(marketInfo.token_id ?? "");
      if (!payoutTokenProgram) {
        toast.error("Unsupported market token for sell payout.");
        return null;
      }

      const positionRecords = await findClaimablePositionRecords(cleanMarketId, {
        outcome: options?.outcome,
      });
      if (!positionRecords.length) {
        toast.error("No sellable position record found for this market/outcome.");
        return null;
      }

      const outcomeRaw = Number.parseInt(parseRecordField(positionRecords[0], "outcome"), 10);
      if (!Number.isFinite(outcomeRaw)) {
        toast.error("Unable to read position outcome.");
        return null;
      }

      const shares = Math.max(1, Math.floor(sharesToSell));
      const totalAvailableShares = positionRecords.reduce((sum, record) => {
        const recordShares = Number.parseInt(parseRecordField(record, "shares"), 10);
        return sum + (Number.isFinite(recordShares) && recordShares > 0 ? recordShares : 0);
      }, 0);
      if (shares > totalAvailableShares) {
        toast.error("Sell amount exceeds your available shares.");
        return null;
      }
      let remainingShares = shares;
      let aggregatePayoutMicro = 0;
      let lastTransactionId: string | null = null;

      toast.info(
        positionRecords.length > 1
          ? "Selling shares across multiple position records..."
          : "Selling shares...",
      );

      for (const positionRecord of positionRecords) {
        if (remainingShares <= 0) break;

        const sharesRaw = Number.parseInt(parseRecordField(positionRecord, "shares"), 10);
        if (!Number.isFinite(sharesRaw) || sharesRaw <= 0) continue;

        const chunkShares = Math.min(remainingShares, sharesRaw);
        const quote = await quoteSellShares(
          cleanMarketId,
          outcomeRaw,
          chunkShares,
          options?.slippageBps ?? 200,
        );
        if (!quote) {
          toast.error("Unable to compute sell quote right now.");
          return null;
        }

        const sellNonce = generateRandomField();
        const sellResult = await executeAndPoll({
          program: PROGRAM_ID,
          function: "sell_shares",
          inputs: [
            positionRecord,
            formatU64(chunkShares),
            formatU64(quote.minPayoutMicro),
            sellNonce,
          ],
          fee: 1_000_000,
          privateFee: false,
        }, PROGRAM_ID, "sell_shares");

        if (!sellResult?.transactionId) {
          toast.error("Sell transaction failed.");
          return null;
        }
        lastTransactionId = sellResult.transactionId;

        let nullifierField = extractTransitionField(sellResult.transition, "nullifier");
        if (!nullifierField) {
          const claimRecord = await waitForWinningsClaimRecord(marketId);
          if (!claimRecord) {
            toast.error("Sell payout claim record not available yet. Please retry shortly.");
            triggerRefresh();
            return { transactionId: sellResult.transactionId, payoutAmount: aggregatePayoutMicro / 1_000_000, payoutTicker };
          }
          const nullifierRaw = parseRecordField(claimRecord, "nullifier");
          if (!nullifierRaw) {
            toast.error("Unable to read sell claim nullifier.");
            return { transactionId: sellResult.transactionId, payoutAmount: aggregatePayoutMicro / 1_000_000, payoutTicker };
          }
          nullifierField = formatField(nullifierRaw);
        }
        const payoutAmount = await waitForPendingPayout(nullifierField);
        if (!payoutAmount || payoutAmount <= 0) {
          toast.error("Sell payout is not available yet. Please retry.");
          return { transactionId: sellResult.transactionId, payoutAmount: aggregatePayoutMicro / 1_000_000, payoutTicker };
        }

        const payoutResult = await executeAndPoll({
          program: payoutTokenProgram,
          function: "claim_payout",
          inputs: [formatU64(payoutAmount), nullifierField],
          fee: 500_000,
          privateFee: false,
        }, payoutTokenProgram, "claim_payout");

        if (!payoutResult?.transactionId) {
          toast.error("Sell payout transfer failed.");
          return null;
        }

        aggregatePayoutMicro += payoutAmount;
        lastTransactionId = payoutResult.transactionId;
        remainingShares -= chunkShares;
      }

      if (remainingShares > 0 || !lastTransactionId) {
        toast.error("Unable to fully satisfy the requested sell amount.");
        return null;
      }

      const payoutAmountDisplay = aggregatePayoutMicro / 1_000_000;
      toast.success(`Sold shares for ${payoutAmountDisplay.toFixed(4)} ${payoutTicker}`);
      triggerRefresh();
      return {
        transactionId: lastTransactionId,
        payoutAmount: payoutAmountDisplay,
        payoutTicker,
      };
    } catch (error) {
      console.error("Sell shares failed:", error);
      toast.error(`Sell error: ${getErrorMessage(error)}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelMarket = async (marketId: string) => {
    if (!address) return;
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;

    try {
      const result = await executeAndPoll({
        program: PROGRAM_ID,
        function: "cancel_market",
        inputs: [cleanMarketId],
        fee: 100_000,
        privateFee: false,
      }, PROGRAM_ID, "cancel_market");

      if (result) triggerRefresh();
      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Cancel market failed:", error);
      return null;
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

  const fetchOracleStake = useCallback(async (): Promise<number> => {
    if (!publicKey) return 0;
    try {
      const raw = await fetchMappingValue(ORACLE_PROGRAM_ID, "active_oracles", publicKey);
      return parseMappingU64(raw);
    } catch (error) {
      console.error("Failed to fetch oracle stake:", error);
      return 0;
    }
  }, [publicKey]);

  const fetchOracleLockedStake = useCallback(async (): Promise<number> => {
    if (!publicKey) return 0;
    try {
      const raw = await fetchMappingValue(ORACLE_PROGRAM_ID, "oracle_locked_stake", publicKey);
      return parseMappingU64(raw);
    } catch (error) {
      console.error("Failed to fetch oracle locked stake:", error);
      return 0;
    }
  }, [publicKey]);

  const unstakeOracleCredits = async (amountCredits: number) => {
    if (!address) return null;
    const amountMicro = Math.max(1_000_000, Math.floor(amountCredits * 1_000_000));

    try {
      const [currentStake, lockedStake] = await Promise.all([
        fetchOracleStake(),
        fetchOracleLockedStake(),
      ]);
      if (currentStake < amountMicro) {
        toast.error("Unstake amount exceeds your current oracle stake.");
        return null;
      }
      if (lockedStake > 0) {
        toast.error("Your oracle stake is locked by an active proposal. Unstake is available after finalization.");
        return null;
      }

      const result = await executeAndPoll({
        program: ORACLE_PROGRAM_ID,
        function: "unstake_credits",
        inputs: [formatU64(amountMicro)],
        fee: 1_000_000,
        privateFee: false,
      }, ORACLE_PROGRAM_ID, "unstake_credits");

      if (result) {
        triggerRefresh();
      }
      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Oracle unstake failed:", error);
      return null;
    }
  };

  const claimOracleVoteReward = async (marketId: string) => {
    if (!address) return null;
    const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
    try {
      const result = await executeAndPoll({
        program: ORACLE_PROGRAM_ID,
        function: "claim_vote_reward",
        inputs: [cleanMarketId],
        fee: 500_000,
        privateFee: false,
      }, ORACLE_PROGRAM_ID, "claim_vote_reward");
      if (result) {
        toast.success("Oracle vote reward claimed.");
        triggerRefresh();
      }
      return result ? result.transactionId : null;
    } catch (error) {
      console.error("Claim oracle vote reward failed:", error);
      toast.error(`Vote reward claim failed: ${getErrorMessage(error)}`);
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
      if (!marketRaw) {
        toast.error("Market not found on v12.");
        return null;
      }
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
        await logProgramRecordSummary(PROGRAM_ID, "BetPosition");
        toast.error("No claimable position record found yet. Wait for wallet sync and retry.");
        return null;
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

      // Step 2: Resolve nullifier, then claim payout from token contract
      let nullifierField = extractTransitionField(claimResult.transition, "nullifier");
      if (!nullifierField) {
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
        nullifierField = formatField(nullifierRaw);
      }
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
    const stake = await fetchOracleStake();
    return stake >= MIN_ORACLE_STAKE_MICROCREDITS;
  }, [fetchOracleStake]);

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

  const fetchResolutionFinalizeRequirements = useCallback(
    async (marketId: string, outcomeCount: number): Promise<ResolutionFinalizeRequirements | null> => {
      try {
        const cleanMarketId = marketId.includes("field") ? marketId : `${marketId}field`;
        const nowTs = Math.floor(Date.now() / 1000);
        const [
          proposalRaw,
          minVotersRaw,
          minStakeRaw,
          disputeWindowRaw,
          voterCountRaw,
          totalWeightRaw,
        ] = await Promise.all([
          fetchMappingValue(ORACLE_PROGRAM_ID, "proposals", cleanMarketId),
          fetchMappingValue(ORACLE_PROGRAM_ID, "oracle_u8", "0u8"),
          fetchMappingValue(ORACLE_PROGRAM_ID, "oracle_u64", "0u8"),
          fetchMappingValue(ORACLE_PROGRAM_ID, "oracle_u64", "1u8"),
          fetchMappingValue(ORACLE_PROGRAM_ID, "disputed_voter_counts", cleanMarketId),
          fetchMappingValue(ORACLE_PROGRAM_ID, "vote_weight_totals", cleanMarketId),
        ]);

        const proposal = proposalRaw ? parseResolutionProposal(proposalRaw as string | object) : null;
        const minVoters = Math.max(2, parseMappingU64(minVotersRaw) || 2);
        const minStakeMicro = Math.max(MIN_ORACLE_STAKE_MICROCREDITS, parseMappingU64(minStakeRaw) || MIN_ORACLE_STAKE_MICROCREDITS);
        const disputeWindowSeconds = Math.max(600, parseMappingU64(disputeWindowRaw) || 600);
        const voterCount = parseMappingU64(voterCountRaw);
        const totalVoteWeightMicro = parseMappingU64(totalWeightRaw);
        const quorumWeightMicro = minVoters * minStakeMicro;
        const disputeTimeoutSeconds = 1_800;

        const blockers: string[] = [];
        let selectedOutcomeVoteWeightMicro = 0;
        let leadingOutcome: number | null = null;
        let leadingOutcomeVoteWeightMicro = 0;
        let recommendedOutcome: number | null = null;
        let timeoutEligible = false;
        let timeoutAt: number | null = null;
        let fallbackMode = false;

        if (!proposal) {
          blockers.push("No resolution proposal has been submitted yet.");
        } else if (!proposal.is_disputed) {
          if (nowTs < proposal.challenge_deadline) {
            blockers.push(
              `Challenge window is still active until ${formatDateFriendly(proposal.challenge_deadline)}.`,
            );
          }
          recommendedOutcome = proposal.proposed_outcome;
        } else {
          const normalizedCount = Math.max(2, Math.min(8, outcomeCount || 2));
          timeoutAt = proposal.challenge_deadline + disputeTimeoutSeconds;
          const weights = await Promise.all(
            Array.from({ length: normalizedCount }, async (_, index) => {
              const voteKey = await deriveOutcomeVoteKey(cleanMarketId, index);
              if (!voteKey) return 0;
              const raw = await fetchMappingValue(ORACLE_PROGRAM_ID, "votes", voteKey);
              return parseMappingU64(raw);
            }),
          );

          for (let i = 0; i < weights.length; i += 1) {
            if (weights[i] > leadingOutcomeVoteWeightMicro) {
              leadingOutcomeVoteWeightMicro = weights[i];
              leadingOutcome = i;
            }
          }

          recommendedOutcome = leadingOutcome;
          selectedOutcomeVoteWeightMicro = leadingOutcome !== null ? weights[leadingOutcome] : 0;
          const quorumReady =
            voterCount >= minVoters
            && totalVoteWeightMicro >= quorumWeightMicro
            && selectedOutcomeVoteWeightMicro > 0;
          timeoutEligible = nowTs >= timeoutAt;

          if (!quorumReady) {
            if (timeoutEligible) {
              fallbackMode = true;
              recommendedOutcome = proposal.proposed_outcome;
              selectedOutcomeVoteWeightMicro = 0;
            } else {
              if (voterCount < minVoters) {
                blockers.push(`Needs at least ${minVoters} unique dispute voters (currently ${voterCount}).`);
              }
              if (totalVoteWeightMicro < quorumWeightMicro) {
                blockers.push(
                  `Needs quorum vote weight of ${(quorumWeightMicro / 1_000_000).toFixed(2)} ALEO (currently ${(totalVoteWeightMicro / 1_000_000).toFixed(2)} ALEO).`,
                );
              }
              if (selectedOutcomeVoteWeightMicro <= 0) {
                blockers.push("No vote weight found for the leading disputed outcome yet.");
              }
              blockers.push(
                `Fallback finalization unlocks at ${formatDateFriendly(timeoutAt)} if quorum is still not met.`,
              );
            }
          }
        }

        return {
          marketId: cleanMarketId,
          proposal,
          minVoters,
          minStakeMicro,
          quorumWeightMicro,
          voterCount,
          totalVoteWeightMicro,
          selectedOutcomeVoteWeightMicro,
          leadingOutcome,
          leadingOutcomeVoteWeightMicro,
          recommendedOutcome,
          timeoutEligible,
          timeoutAt,
          fallbackMode,
          canFinalize: blockers.length === 0 && Boolean(proposal),
          blockers,
        };
      } catch (error) {
        console.error("Failed to fetch resolution finalization requirements:", error);
        return null;
      }
    },
    [],
  );

  return {
    createMarket,
    placeBet,
    sellShares,
    fundPool,
    withdrawLiquidity,
    resolveMarket: resolveMarketOnCore,
    proposeResolution,
    disputeResolution,
    cancelMarket,
    registerAsOracle,
    unstakeOracleCredits,
    claimOracleVoteReward,
    fetchOracleStake,
    fetchOracleLockedStake,
    fetchResolutionProposal,
    fetchResolutionFinalizeRequirements,
    claimWinnings,
    shieldCredits,
    fetchBalances,
    fetchMarkets,
    fetchUserBets,
    fetchUSDCxBalances,
    fetchUSADBalances,
    fetchMarketPositionSummary,
    fetchCoreProtocolConfig,
    quoteBuyShares,
    quoteSellShares,
    fetchPoolStats,
    fetchOutcomeTotals,
    isOracleRegistered,
    refreshSignal,
    publicKey,
    loading,
  };
};
