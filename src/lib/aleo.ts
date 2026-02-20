const ALEO_API_URL = "https://api.explorer.provable.com/v2";

export interface MarketInfo {
    id: string;
    creator: string;
    title_hash: string;
    category: number;
    close_block: number;
    resolution_block: number;
    is_resolved: boolean;
    winning_outcome: number;
}

/**
 * Fetch a single mapping value by key.
 * Endpoint: GET /testnet/program/{programId}/mapping/{mappingName}/{key}
 */
export const fetchMappingValue = async (programId: string, mappingName: string, key: string) => {
    try {
        const url = `${ALEO_API_URL}/testnet/program/${programId}/mapping/${mappingName}/${key}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Mapping value not found for key ${key}:`, response.status);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching mapping ${mappingName}[${key}]:`, error);
        return null;
    }
};

/**
 * Fetch a transaction by its ID.
 * Endpoint: GET /testnet/transaction/{transactionId}
 */
export const fetchTransaction = async (transactionId: string) => {
    try {
        const url = `${ALEO_API_URL}/testnet/transaction/${transactionId}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return null;
    }
};

/**
 * Extract the market_id field value from a create_market transaction.
 * The first output of the transition is the market_id (field).
 */
export const extractMarketIdFromTx = (tx: any): string | null => {
    try {
        const transitions = tx?.execution?.transitions;
        if (!Array.isArray(transitions)) return null;

        const createMarketTx = transitions.find(
            (t: any) => t.function === "create_market" && t.program === "veilmarkets.aleo"
        );
        if (!createMarketTx) return null;

        const outputs = createMarketTx.outputs;
        if (!Array.isArray(outputs) || outputs.length === 0) return null;

        for (const out of outputs) {
            let futureValue = out.value;

            // If the APi returns the future as a stringified struct (like "{ program_id: veilmarkets.aleo, ... }")
            if (typeof futureValue === "string" && futureValue.includes("function_name") && futureValue.includes("create_market")) {
                const fieldMatch = futureValue.match(/([0-9]+field)/);
                if (fieldMatch) return fieldMatch[1];
            }

            // If it's a properly parsed JSON object
            if (typeof futureValue === "object" && futureValue !== null) {
                const args = futureValue.arguments || [];
                if (Array.isArray(args) && args.length > 0) {
                    const marketIdArg = args[0];
                    if (typeof marketIdArg === "string" && marketIdArg.endsWith("field")) {
                        return marketIdArg.trim();
                    }
                }
            }
        }

        // Deep regex search fallback on the whole transition 
        // strictly finding ONLY digits followed by "field"
        const txStr = JSON.stringify(createMarketTx);
        const matches = [...txStr.matchAll(/([0-9]+field)/g)];

        // Output might be the second field we encounter (first is input title_hash)
        if (matches && matches.length >= 2) {
            return matches[1][1];
        } else if (matches && matches.length === 1) {
            return matches[0][1];
        }

        return null;
    } catch (e) {
        console.error("Error extracting market id:", e);
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
    };

    if (!raw) return base;

    // If already an object (some APIs return parsed JSON)
    if (typeof raw === "object") {
        const obj = raw as any;
        return {
            id: marketId,
            creator: (obj.creator || "").replace(/address/g, "").trim(),
            title_hash: (obj.title_hash || "").replace(/field/g, "").trim(),
            category: parseInt(String(obj.category || "0").replace(/u8/g, "").trim()),
            close_block: parseInt(String(obj.close_block || "0").replace(/u64/g, "").trim()),
            resolution_block: parseInt(String(obj.resolution_block || "0").replace(/u64/g, "").trim()),
            is_resolved: obj.is_resolved === true || obj.is_resolved === "true",
            winning_outcome: parseInt(String(obj.winning_outcome || "2").replace(/u8/g, "").trim()),
        };
    }

    // Parse string format
    const data: any = { id: marketId };
    const cleaned = (raw as string).replace(/\{|\}/g, "");
    const pairs = cleaned.split(",");

    pairs.forEach((pair) => {
        const colonIdx = pair.indexOf(":");
        if (colonIdx === -1) return;
        const key = pair.slice(0, colonIdx).trim();
        const val = pair.slice(colonIdx + 1).trim();
        if (!key || !val) return;

        // Clean Aleo type suffixes
        const cleanVal = val.replace(/u8|u64|field|group|address/g, "").trim();

        if (key === "category" || key === "winning_outcome") {
            data[key] = parseInt(cleanVal);
        } else if (key === "close_block" || key === "resolution_block") {
            data[key] = parseInt(cleanVal);
        } else if (key === "is_resolved") {
            data[key] = val === "true";
        } else {
            data[key] = cleanVal;
        }
    });

    return { ...base, ...data };
};
