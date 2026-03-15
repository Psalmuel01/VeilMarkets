import { supabase } from "./supabase";

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
  created_at?: string;
  expiry_time?: number; // Added for v5 timestamp support
}

export const saveMarketMetadata = async (
  transactionId: string,
  marketId: string,
  title: string,
  description: string,
  source: string,
  expiryTime?: number,
) => {
  const { data, error } = await supabase
    .from('markets_new')
    .insert([
      {
        transaction_id: transactionId,
        market_id: marketId,
        title,
        description,
        source,
        expiry_time: expiryTime
      },
    ]);

  if (error) {
    console.error('Error saving market metadata:', error);
    throw error;
  }
  return data;
};

export const getAllMarketMetadata = async (): Promise<MarketMetadataRow[]> => {
  try {
    const { data, error } = await supabase
      .from("markets_new")
      .select("market_id, transaction_id, title, description, source, created_at")
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
      created_at: row.created_at,
    }));
  } catch (e) {
    console.error("[getAllMarketMetadata] Failed:", e);
    return [];
  }
};

export const getMarketMetadata = async (marketId: string): Promise<MarketMetadataRow | null> => {
  try {
    const { data, error } = await supabase
      .from("markets_new")
      .select("market_id, transaction_id, title, description, source")
      .eq("market_id", marketId)
      .maybeSingle();

    if (error) {
      console.error("[getMarketMetadata] Error:", error.message);
      return null;
    }

    return data ?? null;
  } catch (e) {
    console.error("[getMarketMetadata] Failed:", e);
    return null;
  }
};