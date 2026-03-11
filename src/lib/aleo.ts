import { PROGRAM_ID } from "./constants";

const ALEO_API_URL = "https://api.explorer.provable.com/v2";
const ALEO_NETWORK = "testnet";
const ESTIMATED_BLOCK_TIME_SECONDS = 15;

const BLOCK_HEIGHT_ENDPOINTS = [
  `https://api.explorer.aleo.org/v1/testnet/latest/height`,
  `https://vm.provable.network/v1/testnet/latest/height`,
  `https://api.explorer.provable.com/v2/testnet/latest/height`
];

interface AleoTransitionOutput {
  value?: unknown;
  [key: string]: unknown;
}

interface AleoTransition {
  program?: string;
  function?: string;
  outputs?: AleoTransitionOutput[];
  [key: string]: unknown;
}

interface AleoTransaction {
  execution?: {
    transitions?: AleoTransition[];
  };
  [key: string]: unknown;
}

export interface MarketInfo {
  id: string;
  creator: string;
  title_hash: string;
  category: number;
  close_block: number;
  resolution_block: number;
  is_resolved: boolean;
  winning_outcome: number;
  resolved_by_oracle: boolean;
}

export interface PoolInfo {
  total_no: number;
  total_yes: number;
  participant_count: number;
  locked: boolean;
  escrowed_amount: number;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const stripTypeSuffixes = (value: string) =>
  value.replace(/u8|u64|field|group|address|\.private|\.public/g, "").trim();

const parseAleoInt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(stripTypeSuffixes(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseAleoBool = (value: unknown): boolean => value === true || value === "true";

const parseHeightPayload = (payload: unknown): number | null => {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    const parsed = Number.parseInt(payload, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const obj = asRecord(payload);
  const directKeys = ["height", "latest_height", "latestHeight", "block_height", "blockHeight"];
  for (const key of directKeys) {
    const parsed = parseHeightPayload(obj[key]);
    if (parsed !== null) return parsed;
  }

  const blockObj = asRecord(obj.block);
  if (Object.keys(blockObj).length > 0) {
    const parsed = parseHeightPayload(blockObj.height);
    if (parsed !== null) return parsed;
  }

  return null;
};

/**
 * Fetch a single mapping value by key.
 * Endpoint: GET /testnet/program/{programId}/mapping/{mappingName}/{key}
 */
export const fetchMappingValue = async (
  programId: string,
  mappingName: string,
  key: string,
): Promise<unknown | null> => {
  try {
    const url = `${ALEO_API_URL}/${ALEO_NETWORK}/program/${programId}/mapping/${mappingName}/${key}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Mapping value not found for key ${key}:`, response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching mapping ${mappingName}[${key}]:`, error);
    return null;
  }
};

/**
 * Fetch a transaction by its ID.
 * Endpoint: GET /testnet/transaction/{transactionId}
 */
export const fetchTransaction = async (transactionId: string): Promise<AleoTransaction | null> => {
  try {
    const url = `${ALEO_API_URL}/${ALEO_NETWORK}/transaction/${transactionId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as AleoTransaction;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }
};

/**
 * Fetch the latest block height. Handles multiple payload shapes used by explorers.
 */
export const fetchCurrentBlockHeight = async (): Promise<number | null> => {
  for (const endpoint of BLOCK_HEIGHT_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) continue;

      const rawText = await response.text();
      let payload: unknown = rawText;

      try {
        payload = JSON.parse(rawText);
      } catch {
        // Some endpoints return a raw numeric string.
      }

      const parsed = parseHeightPayload(payload);
      if (parsed !== null) return parsed;
    } catch {
      // Try the next endpoint shape.
    }
  }

  return null;
};

/**
 * Estimate block height for a close date using current height and average block time.
 */
export const estimateCloseBlockFromDate = (
  closingDate: string,
  currentBlockHeight: number,
): number | null => {
  const closeAt = new Date(`${closingDate}T23:59:59`);
  if (Number.isNaN(closeAt.getTime())) return null;

  const deltaSeconds = Math.floor((closeAt.getTime() - Date.now()) / 1000);
  if (deltaSeconds <= 0) return null;

  const blocksUntilClose = Math.ceil(deltaSeconds / ESTIMATED_BLOCK_TIME_SECONDS);
  return currentBlockHeight + blocksUntilClose;
};

/**
 * Extract the market_id field value from a create_market transaction.
 * The first output of the transition is the market_id (field).
 */
export const extractMarketIdFromTx = (tx: AleoTransaction | null): string | null => {
  try {
    const transitions = tx?.execution?.transitions;
    if (!Array.isArray(transitions)) return null;

    const createMarketTx = transitions.find(
      (transition) => transition.function === "create_market" && transition.program === PROGRAM_ID,
    );
    if (!createMarketTx) return null;

    const outputs = createMarketTx.outputs;
    if (!Array.isArray(outputs) || outputs.length === 0) return null;

    for (const output of outputs) {
      const outputValue = output.value;

      if (
        typeof outputValue === "string" &&
        outputValue.includes("function_name") &&
        outputValue.includes("create_market")
      ) {
        const fieldMatch = outputValue.match(/([0-9]+field)/);
        if (fieldMatch) return fieldMatch[1];
      }

      if (typeof outputValue === "object" && outputValue !== null) {
        const args = asRecord(outputValue).arguments;
        if (Array.isArray(args) && args.length > 0) {
          const marketIdArg = args[0];
          if (typeof marketIdArg === "string" && marketIdArg.endsWith("field")) {
            return marketIdArg.trim();
          }
        }
      }
    }

    const txStr = JSON.stringify(createMarketTx);
    const matches = [...txStr.matchAll(/([0-9]+field)/g)];
    if (matches.length >= 2) return matches[1][1];
    if (matches.length === 1) return matches[0][1];

    return null;
  } catch (error) {
    console.error("Error extracting market id:", error);
    return null;
  }
};

/**
 * Parse a MarketInfo struct string returned by the Aleo API.
 * Input format: "{ creator: aleo1..., title_hash: 123field, category: 0u8, ... }"
 */
export const parseMarketInfo = (raw: string | object, marketId: string): MarketInfo => {
  const base: MarketInfo = {
    id: marketId,
    creator: "",
    title_hash: "",
    category: 0,
    close_block: 0,
    resolution_block: 0,
    is_resolved: false,
    winning_outcome: 2,
    resolved_by_oracle: false,
  };

  if (!raw) return base;

  if (typeof raw === "object") {
    const obj = asRecord(raw);
    return {
      id: marketId,
      creator: stripTypeSuffixes(String(obj.creator ?? "")),
      title_hash: stripTypeSuffixes(String(obj.title_hash ?? "")),
      category: parseAleoInt(obj.category),
      close_block: parseAleoInt(obj.close_block),
      resolution_block: parseAleoInt(obj.resolution_block),
      is_resolved: parseAleoBool(obj.is_resolved),
      winning_outcome: parseAleoInt(obj.winning_outcome),
      resolved_by_oracle: parseAleoBool(obj.resolved_by_oracle),
    };
  }

  const data: Partial<MarketInfo> = { id: marketId };
  const cleaned = raw.replace(/\{|\}/g, "");
  const pairs = cleaned.split(",");

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (!key || !value) continue;

    if (key === "category" || key === "winning_outcome") {
      data[key] = parseAleoInt(value);
    } else if (key === "close_block" || key === "resolution_block") {
      data[key] = parseAleoInt(value);
    } else if (key === "is_resolved" || key === "resolved_by_oracle") {
      data[key] = parseAleoBool(value);
    } else {
      data[key as keyof MarketInfo] = stripTypeSuffixes(value) as never;
    }
  }

  return { ...base, ...data };
};

/**
 * Parse a PoolState struct from mapping response.
 */
export const parsePoolInfo = (raw: string | object): PoolInfo => {
  const base: PoolInfo = {
    total_no: 0,
    total_yes: 0,
    participant_count: 0,
    locked: false,
    escrowed_amount: 0,
  };

  if (!raw) return base;

  if (typeof raw === "object") {
    const obj = asRecord(raw);
    return {
      total_no: parseAleoInt(obj.total_no),
      total_yes: parseAleoInt(obj.total_yes),
      participant_count: parseAleoInt(obj.participant_count),
      locked: parseAleoBool(obj.locked),
      escrowed_amount: parseAleoInt(obj.escrowed_amount),
    };
  }

  const cleaned = raw.replace(/\{|\}/g, "");
  const pairs = cleaned.split(",");
  const parsed: Partial<PoolInfo> = {};

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim() as keyof PoolInfo;
    const value = pair.slice(colonIdx + 1).trim();
    if (!key || !value) continue;

    if (key === "locked") {
      parsed.locked = parseAleoBool(value);
      continue;
    }

    if (key === "total_no" || key === "total_yes" || key === "participant_count" || key === "escrowed_amount") {
      parsed[key] = parseAleoInt(value) as never;
    }
  }

  return { ...base, ...parsed };
};
