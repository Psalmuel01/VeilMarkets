import { PROGRAM_ID } from "./constants";

const ALEO_API_URL = "https://api.explorer.provable.com/v2";
const ALEO_NETWORK = "testnet";
export const DEFAULT_BLOCK_TIME_SECONDS = 15;

const BLOCK_HEIGHT_ENDPOINT = `https://api.explorer.provable.com/v2/testnet/block/latest`;


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
  if (typeof payload === "number" && Number.isFinite(payload)) return payload;

  if (typeof payload === "string") {
    const parsed = Number.parseInt(payload, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const obj = asRecord(payload);

  // Handle nested block header format
  const headerHeight = asRecord(asRecord(obj.header).metadata).height;
  if (headerHeight !== undefined) {
    const parsed = parseHeightPayload(headerHeight);
    if (parsed !== null) return parsed;
  }

  const directKeys = ["height", "latest_height", "latestHeight", "block_height", "blockHeight"];
  for (const key of directKeys) {
    const parsed = parseHeightPayload(obj[key]);
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
  try {
    const response = await fetch(BLOCK_HEIGHT_ENDPOINT, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;

    const payload = await response.json();
    const parsed = parseHeightPayload(payload);
    // console.log('[fetchCurrentBlockHeight] height:', parsed);
    return parsed;
  } catch (e) {
    console.error('[fetchCurrentBlockHeight] Failed:', e);
    return null;
  }
};

/**
 * Estimate block height for a close date using current height and average block time.
 */
export const estimateCloseBlockFromDate = (
  closingDate: string,
  currentBlockHeight: number,
  closingTime?: string,
  blockTimeSeconds: number = DEFAULT_BLOCK_TIME_SECONDS,
): number | null => {
  const timeStr = closingTime || "23:59:59";

  // Fix: parse date parts explicitly to avoid UTC vs local timezone misinterpretation
  const [year, month, day] = closingDate.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const closeAt = new Date(year, month - 1, day, hours, minutes, 0);

  if (Number.isNaN(closeAt.getTime())) return null;

  const deltaSeconds = Math.floor((closeAt.getTime() - Date.now()) / 1000);
  if (deltaSeconds <= -60) return null;

  const safeBlockTime = Number.isFinite(blockTimeSeconds) && blockTimeSeconds > 0
    ? blockTimeSeconds
    : DEFAULT_BLOCK_TIME_SECONDS;

  const blocksUntilClose = Math.max(1, Math.ceil(deltaSeconds / safeBlockTime));
  return currentBlockHeight + blocksUntilClose;
};

export const extractMarketIdFromTx = (tx: AleoTransaction | null): string | null => {
  try {
    if (!tx) return null;

    console.log('[extractMarketIdFromTx] Full tx:', JSON.stringify(tx, null, 2));

    const transitions = tx?.execution?.transitions;
    if (!Array.isArray(transitions)) {
      console.warn('[extractMarketIdFromTx] No transitions found in tx');
      return null;
    }

    console.log('[extractMarketIdFromTx] Transitions:', JSON.stringify(transitions, null, 2));

    // Find create_market transition — check both program match and function name
    const createMarketTx = transitions.find((t) => {
      const fnMatch = t.function === 'create_market';
      const programMatch = t.program === PROGRAM_ID || String(t.program).startsWith(PROGRAM_ID.split('.')[0]);
      console.log(`[extractMarketIdFromTx] Transition: program=${t.program} function=${t.function} fnMatch=${fnMatch} programMatch=${programMatch}`);
      return fnMatch && programMatch;
    });

    if (!createMarketTx) {
      console.warn('[extractMarketIdFromTx] No create_market transition found. Available:',
        transitions.map(t => `${t.program}/${t.function}`));
      return null;
    }

    console.log('[extractMarketIdFromTx] Found create_market transition:', JSON.stringify(createMarketTx, null, 2));

    const outputs = createMarketTx.outputs;
    if (!Array.isArray(outputs) || outputs.length === 0) {
      console.warn('[extractMarketIdFromTx] No outputs in create_market transition');
      return null;
    }

    console.log('[extractMarketIdFromTx] Outputs:', JSON.stringify(outputs, null, 2));

    // Try every output for a field value
    for (const output of outputs) {
      const val = output.value;

      // Direct field string
      if (typeof val === 'string' && /^\d+field$/.test(val.trim())) {
        console.log('[extractMarketIdFromTx] Direct field value:', val.trim());
        return val.trim();
      }

      // Nested in object
      if (typeof val === 'object' && val !== null) {
        const str = JSON.stringify(val);
        const match = str.match(/(\d+field)/);
        if (match) {
          console.log('[extractMarketIdFromTx] Field from nested object:', match[1]);
          return match[1];
        }
      }

      // String containing field somewhere
      if (typeof val === 'string') {
        const match = val.match(/(\d+field)/);
        if (match) {
          console.log('[extractMarketIdFromTx] Field from string match:', match[1]);
          return match[1];
        }
      }
    }

    // Last resort — scan entire transition JSON for field values
    const txStr = JSON.stringify(createMarketTx);
    const allFields = [...txStr.matchAll(/(\d+field)/g)].map(m => m[1]);
    console.log('[extractMarketIdFromTx] All field values in transition:', allFields);

    // First field is usually titleHash (input), second is market_id (output)
    if (allFields.length >= 2) return allFields[1];
    if (allFields.length === 1) return allFields[0];

    return null;
  } catch (error) {
    console.error('[extractMarketIdFromTx] Error:', error);
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
