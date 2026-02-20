const ALEO_API_URL = "https://api.explorer.provable.com/v2";

export interface MarketInfo {
    creator: string;
    title_hash: string;
    category: number;
    close_block: number;
    resolution_block: number;
    resolved: boolean;
    winning_outcome: number;
}

export const fetchMappingValue = async (programId: string, mappingName: string, key: string) => {
    try {
        const response = await fetch(`${ALEO_API_URL}/testnet/program/${programId}/mapping/${mappingName}/${key}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching mapping ${mappingName}:`, error);
        return null;
    }
};

export const fetchAllMappingEntries = async (programId: string, mappingName: string) => {
    try {
        const response = await fetch(`${ALEO_API_URL}/testnet/program/${programId}/mapping/${mappingName}`);
        if (!response.ok) {
            // Fallback to Provable/Demox API if official one doesn't list mappings
            const fallbackResponse = await fetch(`https://api.explorer.provable.com/v2/testnet/program/${programId}/mapping/${mappingName}`);
            if (!fallbackResponse.ok) return [];
            return await fallbackResponse.json();
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching all entries for mapping ${mappingName}:`, error);
        return [];
    }
};

export const parseMarketInfo = (raw: string): MarketInfo => {
    if (!raw) return {} as MarketInfo;
    const data: any = {};
    // Handle various formats: { key: val } or key: val
    const pairs = raw.replace(/[\{\}]/g, "").split(",");
    pairs.forEach(pair => {
        if (!pair.includes(":")) return;
        const [key, val] = pair.split(":").map(s => s.trim());
        if (key && val) {
            // Clean Aleo type suffixes
            let cleanVal = val.replace(/u8|u64|field|group|address/g, "").trim();
            if (val.includes("u8") || val.includes("u64")) {
                data[key] = parseInt(cleanVal);
            } else if (val === "true" || val === "false") {
                data[key] = val === "true";
            } else {
                data[key] = cleanVal;
            }
        }
    });
    return data as MarketInfo;
};
