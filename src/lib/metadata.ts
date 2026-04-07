import { supabase } from "./supabase";
import { PROGRAM_ID } from "./constants";

const MARKETS_TABLE_V9 = "markets_v9";

export interface MarketMetadata {
  title: string;
  description: string;
  source?: string;
}

export interface MarketMetadataRow {
  program_id?: string;
  transaction_id: string;
  market_id: string;
  title: string;
  description: string;
  source: string;
  category: number;
  market_type: number;
  outcome_count: number;
  outcome_labels: string[];
  token_id: string;
  close_time: number;
  resolution_time: number;
  created_by?: string;
  created_at?: string;
  expiry_time?: number;
}

export interface SaveMarketMetadataInput {
  transaction_id: string;
  market_id: string;
  title: string;
  description: string;
  source: string;
  category: number;
  market_type: number;
  outcome_count: number;
  outcome_labels: string[];
  token_id: string;
  close_time: number;
  resolution_time: number;
  created_by?: string;
}

export const saveMarketMetadata = async (payload: SaveMarketMetadataInput) => {
  const cleanLabels = payload.outcome_labels
    .map((label) => label.trim())
    .filter((label) => label.length > 0);

  const { data, error } = await supabase
    .from(MARKETS_TABLE_V9)
    .insert([
      {
        program_id: PROGRAM_ID,
        transaction_id: payload.transaction_id,
        market_id: payload.market_id,
        title: payload.title,
        description: payload.description,
        source: payload.source,
        category: payload.category,
        market_type: payload.market_type,
        outcome_count: payload.outcome_count,
        outcome_labels: cleanLabels,
        token_id: payload.token_id,
        close_time: payload.close_time,
        resolution_time: payload.resolution_time,
        created_by: payload.created_by,
      },
    ]);

  if (error) {
    if (error.code !== "42501") {
      console.error('Error saving market metadata:', error);
    }
    throw error;
  }
  return data;
};

export const getAllMarketMetadata = async (): Promise<MarketMetadataRow[]> => {
  try {
    const v9Result = await supabase
      .from(MARKETS_TABLE_V9)
      .select(
        "program_id, market_id, transaction_id, title, description, source, category, market_type, outcome_count, outcome_labels, token_id, close_time, resolution_time, created_by, created_at, expiry_time",
      )
      .order("created_at", { ascending: false });

    if (v9Result.error && v9Result.error.code !== "42P01") {
      console.error("[getAllMarketMetadata] v9 Error:", v9Result.error.message);
    }

    const v9Rows = (v9Result.data ?? []).map((row) => ({
      program_id: String(row.program_id ?? PROGRAM_ID),
      market_id: row.market_id,
      transaction_id: row.transaction_id,
      title: row.title,
      description: row.description,
      source: row.source || "Creator",
      category: Number(row.category ?? 0),
      market_type: Number(row.market_type ?? 0),
      outcome_count: Number(row.outcome_count ?? 2),
      outcome_labels: Array.isArray(row.outcome_labels)
        ? row.outcome_labels.map((label: unknown) => String(label))
        : ["No", "Yes"],
      token_id: String(row.token_id ?? ""),
      close_time: Number(row.close_time ?? 0),
      resolution_time: Number(row.resolution_time ?? 0),
      created_by: row.created_by ? String(row.created_by) : undefined,
      created_at: row.created_at,
      expiry_time: row.expiry_time ? Number(row.expiry_time) : undefined,
    }));

    const deduped = new Map<string, MarketMetadataRow>();
    v9Rows.forEach((row) => {
      const key = `${row.program_id ?? PROGRAM_ID}:${row.market_id}`;
      if (!deduped.has(key)) deduped.set(key, row);
    });

    return Array.from(deduped.values()).sort((a, b) => {
      const tsA = a.created_at ? Date.parse(a.created_at) : 0;
      const tsB = b.created_at ? Date.parse(b.created_at) : 0;
      return tsB - tsA;
    });
  } catch (e) {
    console.error("[getAllMarketMetadata] Failed:", e);
    return [];
  }
};

export const getMarketMetadata = async (marketId: string): Promise<MarketMetadataRow | null> => {
  try {
    const { data, error } = await supabase
      .from(MARKETS_TABLE_V9)
      .select(
        "program_id, market_id, transaction_id, title, description, source, category, market_type, outcome_count, outcome_labels, token_id, close_time, resolution_time, created_by, created_at, expiry_time",
      )
      .eq("market_id", marketId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[getMarketMetadata] Error:", error.message);
    }

    if (data) {
      return {
        program_id: String(data.program_id ?? PROGRAM_ID),
        market_id: data.market_id,
        transaction_id: data.transaction_id,
        title: data.title,
        description: data.description,
        source: data.source || "Creator",
        category: Number(data.category ?? 0),
        market_type: Number(data.market_type ?? 0),
        outcome_count: Number(data.outcome_count ?? 2),
        outcome_labels: Array.isArray(data.outcome_labels)
          ? data.outcome_labels.map((label: unknown) => String(label))
          : ["No", "Yes"],
        token_id: String(data.token_id ?? ""),
        close_time: Number(data.close_time ?? 0),
        resolution_time: Number(data.resolution_time ?? 0),
        created_by: data.created_by ? String(data.created_by) : undefined,
        created_at: data.created_at ?? undefined,
        expiry_time: data.expiry_time ? Number(data.expiry_time) : undefined,
      };
    }
    return null;
  } catch (e) {
    console.error("[getMarketMetadata] Failed:", e);
    return null;
  }
};
