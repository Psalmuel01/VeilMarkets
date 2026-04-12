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
  market_type: number;
  outcome_count: number;
  close_time: number;
  resolution_time: number;
  is_resolved: boolean;
  winning_outcome: number;
  resolved_by_oracle: boolean;
  token_id: string;
}

export interface PoolInfo {
  total_outcome_0: number;
  total_outcome_1: number;
  total_outcome_2: number;
  total_outcome_3: number;
  total_outcome_4: number;
  total_outcome_5: number;
  total_outcome_6: number;
  total_outcome_7: number;
  // Legacy aliases kept for backwards compatibility in existing UI.
  total_no: number;
  total_yes: number;
  trader_count: number;
  lp_count: number;
  participant_count: number;
  locked: boolean;
  trading_collateral: number;
  lp_collateral: number;
  total_collateral: number;
  total_shares: number;
  lp_supply: number;
  cumulative_volume: number;
  escrowed_amount: number;
}

export interface ResolutionProposal {
  market_id: string;
  proposed_outcome: number;
  challenge_deadline: number;
  is_disputed: boolean;
  proposer: string;
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

const unwrapMappingValue = (raw: unknown): unknown => {
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    return (raw as Record<string, unknown>).value;
  }
  return raw;
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
 * Get Unix timestamp (seconds) for a close date/time.
 */
export const getTimestampFromDate = (
  closingDate: string,
  closingTime?: string,
): number | null => {
  const timeStr = closingTime || "23:59:59";

  // Parse date parts explicitly to avoid timezone issues
  const [year, month, day] = closingDate.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const closeAt = new Date(year, month - 1, day, hours, minutes, 0);

  if (Number.isNaN(closeAt.getTime())) return null;

  return Math.floor(closeAt.getTime() / 1000);
};

export const extractMarketIdFromTx = (tx: AleoTransaction | null): string | null => {
  try {
    if (!tx) return null;

    const transitions = tx?.execution?.transitions;
    if (!Array.isArray(transitions)) {
      console.warn('[extractMarketIdFromTx] No transitions found in tx');
      return null;
    }

    // Find create_market transition — check both program match and function name
    const createMarketTx = transitions.find((t) => {
      const fnMatch = t.function === 'create_market';
      const programMatch = t.program === PROGRAM_ID || String(t.program).startsWith(PROGRAM_ID.split('.')[0]);
      return fnMatch && programMatch;
    });

    if (!createMarketTx) {
      console.warn('[extractMarketIdFromTx] No create_market transition found. Available:',
        transitions.map(t => `${t.program}/${t.function}`));
      return null;
    }

    const outputs = createMarketTx.outputs;
    if (!Array.isArray(outputs) || outputs.length === 0) {
      console.warn('[extractMarketIdFromTx] No outputs in create_market transition');
      return null;
    }

    // Try every output for a field value
    for (const output of outputs) {
      const val = output.value;

      // Direct field string
      if (typeof val === 'string' && /^\d+field$/.test(val.trim())) {
        return val.trim();
      }

      // Nested in object
      if (typeof val === 'object' && val !== null) {
        const str = JSON.stringify(val);
        const match = str.match(/(\d+field)/);
        if (match) return match[1];
      }

      // String containing field somewhere
      if (typeof val === 'string') {
        const match = val.match(/(\d+field)/);
        if (match) return match[1];
      }
    }

    // Last resort — scan entire transition JSON for field values
    const txStr = JSON.stringify(createMarketTx);
    const allFields = [...txStr.matchAll(/(\d+field)/g)].map(m => m[1]);

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
    market_type: 0,
    outcome_count: 2,
    close_time: 0,
    resolution_time: 0,
    is_resolved: false,
    winning_outcome: 254,
    resolved_by_oracle: false,
    token_id: "",
  };

  if (!raw) return base;

  if (typeof raw === "object") {
    const obj = asRecord(raw);
    return {
      id: marketId,
      creator: stripTypeSuffixes(String(obj.creator ?? "")),
      title_hash: stripTypeSuffixes(String(obj.title_hash ?? "")),
      category: parseAleoInt(obj.category),
      market_type: parseAleoInt(obj.market_type),
      outcome_count: parseAleoInt(obj.outcome_count),
      close_time: parseAleoInt(obj.close_time),
      resolution_time: parseAleoInt(obj.resolution_time),
      is_resolved: parseAleoBool(obj.is_resolved),
      winning_outcome: parseAleoInt(obj.winning_outcome),
      resolved_by_oracle: parseAleoBool(obj.resolved_by_oracle),
      token_id: stripTypeSuffixes(String(obj.token_id ?? "")),
    };
  }

  const data: Partial<MarketInfo> = { id: marketId };
  const str = String(raw);

  // Extract keys and values using regex
  const structFields = [
    "creator:",
    "title_hash:",
    "category:",
    "market_type:",
    "outcome_count:",
    "close_time:",
    "resolution_time:",
    "is_resolved:",
    "winning_outcome:",
    "resolved_by_oracle:",
    "token_id:",
  ];

  structFields.forEach((key) => {
    const pattern = new RegExp(`${key}\\s*([^,}]+)`);
    const match = str.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (
        key === "close_time:" ||
        key === "resolution_time:" ||
        key === "category:" ||
        key === "market_type:" ||
        key === "outcome_count:" ||
        key === "winning_outcome:"
      ) {
        data[key.replace(":", "") as keyof MarketInfo] = parseAleoInt(value) as never;
      } else if (key === "is_resolved:" || key === "resolved_by_oracle:") {
        data[key.replace(":", "") as keyof MarketInfo] = parseAleoBool(value) as never;
      } else {
        data[key.replace(":", "") as keyof MarketInfo] = stripTypeSuffixes(value) as never;
      }
    }
  });

  return { ...base, ...data };
};

/**
 * Parse a PoolState struct from mapping response.
 */
export const parsePoolInfo = (raw: string | object): PoolInfo => {
  const base: PoolInfo = {
    total_outcome_0: 0,
    total_outcome_1: 0,
    total_outcome_2: 0,
    total_outcome_3: 0,
    total_outcome_4: 0,
    total_outcome_5: 0,
    total_outcome_6: 0,
    total_outcome_7: 0,
    total_no: 0,
    total_yes: 0,
    trader_count: 0,
    lp_count: 0,
    participant_count: 0,
    locked: false,
    trading_collateral: 0,
    lp_collateral: 0,
    total_collateral: 0,
    total_shares: 0,
    lp_supply: 0,
    cumulative_volume: 0,
    escrowed_amount: 0,
  };

  if (!raw) return base;

  if (typeof raw === "object") {
    const obj = asRecord(raw);
    const totalOutcome0 = parseAleoInt(obj.total_outcome_0 ?? obj.total_no);
    const totalOutcome1 = parseAleoInt(obj.total_outcome_1 ?? obj.total_yes);
    const totalOutcome2 = parseAleoInt(obj.total_outcome_2);
    const totalOutcome3 = parseAleoInt(obj.total_outcome_3);
    const totalOutcome4 = parseAleoInt(obj.total_outcome_4);
    const totalOutcome5 = parseAleoInt(obj.total_outcome_5);
    const totalOutcome6 = parseAleoInt(obj.total_outcome_6);
    const totalOutcome7 = parseAleoInt(obj.total_outcome_7);
    const traderCount = parseAleoInt(obj.trader_count ?? obj.participant_count);
    const lpCount = parseAleoInt(obj.lp_count);
    const tradingCollateral = parseAleoInt(obj.trading_collateral ?? obj.total_collateral);
    const lpCollateral = parseAleoInt(obj.lp_collateral);
    const totalCollateral = parseAleoInt(
      obj.total_collateral ?? (tradingCollateral + lpCollateral),
    );
    const cumulativeVolume = parseAleoInt(obj.cumulative_volume);
    return {
      total_outcome_0: totalOutcome0,
      total_outcome_1: totalOutcome1,
      total_outcome_2: totalOutcome2,
      total_outcome_3: totalOutcome3,
      total_outcome_4: totalOutcome4,
      total_outcome_5: totalOutcome5,
      total_outcome_6: totalOutcome6,
      total_outcome_7: totalOutcome7,
      total_no: totalOutcome0,
      total_yes: totalOutcome1,
      trader_count: traderCount,
      lp_count: lpCount,
      participant_count: traderCount + lpCount,
      locked: parseAleoBool(obj.locked),
      trading_collateral: tradingCollateral,
      lp_collateral: lpCollateral,
      total_collateral: totalCollateral,
      total_shares: parseAleoInt(obj.total_shares),
      lp_supply: parseAleoInt(obj.lp_supply),
      cumulative_volume: cumulativeVolume,
      escrowed_amount: parseAleoInt(obj.escrowed_amount ?? tradingCollateral),
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

    if (
      key === "total_outcome_0" ||
      key === "total_outcome_1" ||
      key === "total_outcome_2" ||
      key === "total_outcome_3" ||
      key === "total_outcome_4" ||
      key === "total_outcome_5" ||
      key === "total_outcome_6" ||
      key === "total_outcome_7" ||
      key === "total_no" ||
      key === "total_yes" ||
      key === "trader_count" ||
      key === "lp_count" ||
      key === "participant_count" ||
      key === "trading_collateral" ||
      key === "lp_collateral" ||
      key === "total_collateral" ||
      key === "total_shares" ||
      key === "lp_supply" ||
      key === "cumulative_volume" ||
      key === "escrowed_amount"
    ) {
      parsed[key] = parseAleoInt(value) as never;
    }
  }

  const merged = { ...base, ...parsed };
  const totalOutcome0 = parsed.total_outcome_0 ?? parsed.total_no ?? 0;
  const totalOutcome1 = parsed.total_outcome_1 ?? parsed.total_yes ?? 0;
  return {
    ...merged,
    total_outcome_0: totalOutcome0,
    total_outcome_1: totalOutcome1,
    total_no: totalOutcome0,
    total_yes: totalOutcome1,
    participant_count:
      (parsed.participant_count as number | undefined) ??
      ((parsed.trader_count as number | undefined) ?? 0) + ((parsed.lp_count as number | undefined) ?? 0),
    escrowed_amount:
      (parsed.escrowed_amount as number | undefined) ??
      ((parsed.trading_collateral as number | undefined) ?? (parsed.total_collateral as number | undefined) ?? 0),
  };
};

/**
 * Parse a ResolutionProposal struct string returned by the Aleo API.
 * Input format: "{ market_id: 123field, proposed_outcome: 1u8, challenge_deadline: 120u64, is_disputed: false, proposer: aleo1... }"
 */
export const parseResolutionProposal = (raw: string | object): ResolutionProposal | null => {
  const base: ResolutionProposal = {
    market_id: "",
    proposed_outcome: 0,
    challenge_deadline: 0,
    is_disputed: false,
    proposer: "",
  };

  if (!raw) return null;

  const unwrapped = unwrapMappingValue(raw);

  if (typeof unwrapped === "object" && unwrapped !== null) {
    const obj = asRecord(unwrapped);
    return {
      market_id: stripTypeSuffixes(String(obj.market_id ?? "")),
      proposed_outcome: parseAleoInt(obj.proposed_outcome),
      challenge_deadline: parseAleoInt(obj.challenge_deadline),
      is_disputed: parseAleoBool(obj.is_disputed),
      proposer: stripTypeSuffixes(String(obj.proposer ?? "")),
    };
  }

  if (typeof unwrapped !== "string") return null;

  const cleaned = unwrapped.replace(/\{|\}/g, "");
  const pairs = cleaned.split(",");
  const parsed: Partial<ResolutionProposal> = {};

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;

    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (!key || !value) continue;

    if (key === "proposed_outcome" || key === "challenge_deadline") {
      parsed[key] = parseAleoInt(value) as never;
    } else if (key === "is_disputed") {
      parsed.is_disputed = parseAleoBool(value);
    } else if (key === "market_id" || key === "proposer") {
      parsed[key] = stripTypeSuffixes(value) as never;
    }
  }

  return { ...base, ...parsed };
};
