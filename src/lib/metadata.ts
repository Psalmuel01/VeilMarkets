import { supabase } from "./supabase";

export interface MarketMetadata {
  title: string;
  description: string;
  source?: string;
}

export interface MarketMetadataRow extends MarketMetadata {
  transaction_id: string;
  market_id: string; // The stable on-chain key
  title_hash?: string;
}

/**
 * Saves market metadata to Supabase so it's globally accessible.
 * We use transaction_id as the Primary Key mapping back to the Aleo contract.
 */
export const saveMarketMetadata = async (
  transactionId: string,
  marketId: string,
  titleHash: string,
  title: string,
  description: string,
  source?: string,
) => {
  try {
    const { error } = await supabase.from("markets_alt").insert([
      {
        transaction_id: transactionId,
        market_id: marketId,
        title_hash: titleHash,
        title,
        description,
        source: source || "Creator",
      },
    ]);

    if (error) console.error("Supabase Save Error:", error.message);
  } catch (e) {
    console.error("Failed to save metadata", e);
  }
};

/**
 * Updates an existing Supabase row's transaction_id.
 * Used to replace temporary shield_... IDs with real on-chain at1... IDs.
 */
export const updateMarketTxId = async (oldId: string, newId: string) => {
  try {
    const { error } = await supabase
      .from("markets_alt")
      .update({ transaction_id: newId })
      .eq("transaction_id", oldId);
    
    if (error) console.error("UpdateTxId Error:", error.message);
  } catch (e) {
    console.error("Failed to update tx id", e);
  }
};

/**
 * Retrieves market metadata from Supabase.
 * Returns null if the market metadata isn't found.
 */
export const getMarketMetadata = async (transactionId: string): Promise<MarketMetadata | null> => {
  try {
    const { data, error } = await supabase
      .from("markets_alt")
      .select("title, description, source")
      .eq("transaction_id", transactionId)
      .single();

    if (!error && data) {
      return {
        title: data.title,
        description: data.description,
        source: data.source,
      };
    }

    if (error && error.code !== "PGRST116") {
      console.error("Supabase Select Error:", error.message);
    }

    return null;
  } catch (e) {
    console.error("Failed to load metadata", e);
    return null;
  }
};

/**
 * Retrieves multiple market metadata from Supabase in a single batch.
 * Returns a record mapping transactionId to MarketMetadata.
 */
export const getBatchMarketMetadata = async (transactionIds: string[]): Promise<Record<string, MarketMetadata>> => {
  if (transactionIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from("markets_alt")
      .select("transaction_id, title, description, source")
      .in("transaction_id", transactionIds);

    if (error) {
      console.error("Supabase Batch Select Error:", error.message);
      return {};
    }

    const metadataMap: Record<string, MarketMetadata> = {};
    (data ?? []).forEach((row) => {
      metadataMap[row.transaction_id] = {
        title: row.title,
        description: row.description,
        source: row.source,
      };
    });
    return metadataMap;
  } catch (e) {
    console.error("Failed to load batch metadata", e);
    return {};
  }
};

/**
 * Retrieves all market metadata rows stored off-chain.
 * This allows global market discovery independent of wallet-local tx history.
 */
export const getAllMarketMetadata = async (): Promise<MarketMetadataRow[]> => {
  try {
    const { data, error } = await supabase
      .from("markets_alt")
      .select("transaction_id, market_id, title_hash, title, description, source");

    if (error) {
      console.error("Supabase Fetch Error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      transaction_id: row.transaction_id,
      market_id: row.market_id,
      title_hash: row.title_hash,
      title: row.title,
      description: row.description,
      source: row.source || "Creator",
    }));
  } catch (error) {
    console.error("Failed to load all metadata", error);
    return [];
  }
};
