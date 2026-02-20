import { supabase } from "./supabase";

export interface MarketMetadata {
    title: string;
    description: string;
}

/**
 * Saves market metadata to Supabase so it's globally accessible.
 * We use titleHash as the Primary Key mapping back to the Aleo contract.
 */
export const saveMarketMetadata = async (
    titleHash: string,
    title: string,
    description: string
) => {
    try {
        const { error } = await supabase.from("markets").insert([
            {
                title_hash: titleHash,
                title,
                description,
            },
        ]);

        if (error) {
            console.error("Supabase Insert Error:", error.message);
        } else {
            console.log(`Saved metadata to Supabase for market ${titleHash}`);
        }
    } catch (e) {
        console.error("Failed to save metadata", e);
    }
};

/**
 * Retrieves market metadata from Supabase.
 * Returns null if the market metadata isn't found.
 */
export const getMarketMetadata = async (titleHash: string): Promise<MarketMetadata | null> => {
    try {
        // 1. Check Supabase first
        const { data, error } = await supabase
            .from("markets")
            .select("title, description")
            .eq("title_hash", titleHash)
            .single();

        if (!error && data) {
            return { title: data.title, description: data.description };
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
