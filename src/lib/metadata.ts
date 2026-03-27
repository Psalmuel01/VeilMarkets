import { supabase } from "./supabase";

const MARKETS_TABLE = "markets_v8";

export interface MarketMetadata {
  title: string;
  description: string;
  source?: string;
}

export interface MarketMetadataRow {
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
    .from(MARKETS_TABLE)
    .insert([
      {
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
    const { data, error } = await supabase
      .from(MARKETS_TABLE)
      .select(
        "market_id, transaction_id, title, description, source, category, market_type, outcome_count, outcome_labels, token_id, close_time, resolution_time, created_by, created_at, expiry_time",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getAllMarketMetadata] Error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
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
  } catch (e) {
    console.error("[getAllMarketMetadata] Failed:", e);
    return [];
  }
};

export const getMarketMetadata = async (marketId: string): Promise<MarketMetadataRow | null> => {
  try {
    const { data, error } = await supabase
      .from(MARKETS_TABLE)
      .select(
        "market_id, transaction_id, title, description, source, category, market_type, outcome_count, outcome_labels, token_id, close_time, resolution_time, created_by, created_at, expiry_time",
      )
      .eq("market_id", marketId)
      .maybeSingle();

    if (error) {
      console.error("[getMarketMetadata] Error:", error.message);
      return null;
    }

    if (!data) return null;
    return {
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
  } catch (e) {
    console.error("[getMarketMetadata] Failed:", e);
    return null;
  }
};
