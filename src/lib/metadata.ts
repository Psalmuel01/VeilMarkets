import { supabase } from "./supabase";

export interface MarketMetadata {
  title: string;
  description: string;
  source?: string;
}

export interface MarketMetadataRow extends MarketMetadata {
  market_id: string;
  transaction_id: string;
  created_at?: string;
}

export const saveMarketMetadata = async (
  transactionId: string,
  marketId: string,
  title: string,
  description: string,
  source?: string,
) => {
  try {
    const { error } = await supabase.from("markets").upsert(
      [{
        market_id: marketId,
        transaction_id: transactionId,
        title,
        description,
        source: source || "Creator",
      }],
      { onConflict: "market_id" }
    );
    if (error) console.error("[saveMarketMetadata] Error:", error.message);
    else console.log("[saveMarketMetadata] Saved:", marketId);
  } catch (e) {
    console.error("[saveMarketMetadata] Failed:", e);
  }
};

export const getAllMarketMetadata = async (): Promise<MarketMetadataRow[]> => {
  try {
    const { data, error } = await supabase
      .from("markets")
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
      .from("markets")
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