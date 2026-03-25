export const PROGRAM_ID = "veilmarkets_v6.aleo";
export const TOKEN_PROGRAM_ID = "veilmarkets_token_credits_v6.aleo";
export const USDCX_TOKEN_PROGRAM_ID = "veilmarkets_token_usdcx_v6.aleo";
export const ORACLE_PROGRAM_ID = "veilmarkets_oracle_v6.aleo";
export const FACTORY_PROGRAM_ID = "veilmarkets_factory_v6.aleo";
export const ADMIN_ADDRESS = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n";

// Canonical on-chain addresses for token adapter programs.
// These are what core markets store in `token_id`.
export const TOKEN_PROGRAM_ADDRESS = "aleo1d4jx7frusj4ds6jsny63ckqz5wvnse24xtujhacfek2l7hn6qc8suwruv6";
export const USDCX_TOKEN_PROGRAM_ADDRESS = "aleo1xdp248sgj6wpade4c8ra5k9c2k634ml5nd5zcghgnps9nefv0sxq476jmc";

export type SupportedTokenKind = "credits" | "usdcx";

const normalizeTokenId = (tokenId: string) => tokenId.trim().toLowerCase();

const CREDITS_ALIASES = new Set<string>([
  TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ADDRESS,
  "credits.aleo",
  "aleo credits",
  "credits",
].map(normalizeTokenId));

const USDCX_ALIASES = new Set<string>([
  USDCX_TOKEN_PROGRAM_ID,
  USDCX_TOKEN_PROGRAM_ADDRESS,
  "test_usdcx_stablecoin.aleo",
  "usdcx",
].map(normalizeTokenId));

export const resolveTokenKind = (tokenId: string): SupportedTokenKind | null => {
  const normalized = normalizeTokenId(tokenId);
  if (!normalized) return null;
  if (CREDITS_ALIASES.has(normalized) || normalized.includes("token_credits")) return "credits";
  if (USDCX_ALIASES.has(normalized) || normalized.includes("usdcx")) return "usdcx";
  return null;
};

export const resolveTokenAdapterProgram = (tokenId: string): string | null => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "credits") return TOKEN_PROGRAM_ID;
  if (kind === "usdcx") return USDCX_TOKEN_PROGRAM_ID;
  return null;
};

export const resolveTokenAdapterAddress = (tokenId: string): string | null => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "credits") return TOKEN_PROGRAM_ADDRESS;
  if (kind === "usdcx") return USDCX_TOKEN_PROGRAM_ADDRESS;
  return null;
};

export const resolveTokenBaseProgram = (tokenId: string): string | null => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "credits") return "credits.aleo";
  if (kind === "usdcx") return "test_usdcx_stablecoin.aleo";
  return null;
};

export const resolveTokenTicker = (tokenId: string): string => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "usdcx") return "USDCx";
  if (kind === "credits") return "ALEO";
  return "TOKEN";
};

export const resolveTokenDisplayName = (tokenId: string): string => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "usdcx") return "USDCx";
  if (kind === "credits") return "Aleo Credits";
  return "Token";
};
