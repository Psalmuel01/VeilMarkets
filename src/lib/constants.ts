export const PROGRAM_ID = "veilmarkets_core_v13.aleo";
export const CREATE_PROGRAM_ID = (import.meta.env.VITE_CREATE_PROGRAM_ID ?? "veilmarkets_create_v1.aleo").trim();
export const LIQUIDITY_PROGRAM_ID = (import.meta.env.VITE_LIQUIDITY_PROGRAM_ID ?? "veilmarkets_liquidity_v4.aleo").trim();
export const CREDITS_TOKEN_PROGRAM_ID = "veilmarkets_token_credits_v13.aleo";
export const USDCX_TOKEN_PROGRAM_ID = "veilmarkets_token_usdcx_v13.aleo";
export const USAD_TOKEN_PROGRAM_ID = "veilmarkets_token_usad_v13.aleo";
export const ORACLE_PROGRAM_ID = "veilmarkets_oracle_v13.aleo";
export const FACTORY_PROGRAM_ID = "veilmarkets_factory_v13.aleo";
export const GOVERNANCE_PROGRAM_ID = "veilmarkets_governance_v13.aleo";
export const ADMIN_ADDRESS = "aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l";

// Canonical on-chain addresses for token adapter programs.
// These are what core markets store in `token_id`.
export const CREDITS_TOKEN_PROGRAM_ADDRESS = (import.meta.env.VITE_CREDITS_TOKEN_PROGRAM_ADDRESS ?? "").trim();
export const USDCX_CREDITS_TOKEN_PROGRAM_ADDRESS = (import.meta.env.VITE_USDCX_TOKEN_PROGRAM_ADDRESS ?? "").trim();
export const USAD_CREDITS_TOKEN_PROGRAM_ADDRESS = (import.meta.env.VITE_USAD_TOKEN_PROGRAM_ADDRESS ?? "").trim();

export type SupportedTokenKind = "credits" | "usdcx" | "usad";

const normalizeTokenId = (tokenId: string) => tokenId.trim().toLowerCase();

const CREDITS_ALIASES = new Set<string>([
  CREDITS_TOKEN_PROGRAM_ID,
  CREDITS_TOKEN_PROGRAM_ADDRESS,
  "credits.aleo",
  "aleo credits",
  "credits",
].map(normalizeTokenId));

const USDCX_ALIASES = new Set<string>([
  USDCX_TOKEN_PROGRAM_ID,
  USDCX_CREDITS_TOKEN_PROGRAM_ADDRESS,
  "test_usdcx_stablecoin.aleo",
  "usdcx",
].map(normalizeTokenId));

const USAD_ALIASES = new Set<string>([
  USAD_TOKEN_PROGRAM_ID,
  USAD_CREDITS_TOKEN_PROGRAM_ADDRESS,
  "test_usad_stablecoin.aleo",
  "usad",
].map(normalizeTokenId));

export const resolveTokenKind = (tokenId: string): SupportedTokenKind | null => {
  const normalized = normalizeTokenId(tokenId);
  if (!normalized) return null;
  if (CREDITS_ALIASES.has(normalized) || normalized.includes("token_credits")) return "credits";
  if (USDCX_ALIASES.has(normalized) || normalized.includes("usdcx")) return "usdcx";
  if (USAD_ALIASES.has(normalized) || normalized.includes("usad")) return "usad";
  return null;
};

export const resolveTokenAdapterProgram = (tokenId: string): string | null => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "credits") return CREDITS_TOKEN_PROGRAM_ID;
  if (kind === "usdcx") return USDCX_TOKEN_PROGRAM_ID;
  if (kind === "usad") return USAD_TOKEN_PROGRAM_ID;
  return null;
};

export const resolveTokenAdapterAddress = (tokenId: string): string | null => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "credits") return CREDITS_TOKEN_PROGRAM_ADDRESS;
  if (kind === "usdcx") return USDCX_CREDITS_TOKEN_PROGRAM_ADDRESS;
  if (kind === "usad") return USAD_CREDITS_TOKEN_PROGRAM_ADDRESS;
  return null;
};

export const resolveTokenBaseProgram = (tokenId: string): string | null => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "credits") return "credits.aleo";
  if (kind === "usdcx") return "test_usdcx_stablecoin.aleo";
  if (kind === "usad") return "test_usad_stablecoin.aleo";
  return null;
};

export const resolveTokenTicker = (tokenId: string): string => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "usdcx") return "USDCx";
  if (kind === "usad") return "USAD";
  if (kind === "credits") return "ALEO";
  return "TOKEN";
};

export const resolveTokenDisplayName = (tokenId: string): string => {
  const kind = resolveTokenKind(tokenId);
  if (kind === "usdcx") return "USDCx";
  if (kind === "usad") return "USAD";
  if (kind === "credits") return "Aleo Credits";
  return "Token";
};
