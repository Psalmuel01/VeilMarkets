# VeilMarkets

Privacy-aware prediction markets on Aleo.

VeilMarkets lets users create markets, trade outcome shares, and claim payouts with zero-knowledge-backed verification. The app supports binary and categorical markets (2-8 outcomes) with multi-token settlement rails.

## Current Scope

- Binary and categorical markets (2-8 outcomes)
- Market categories: Crypto, Finance, Sports, Politics, Entertainment, Tech, Other
- Settlement tokens:
- Aleo Credits
- USDCx (ARC-20)
- USAD (ARC-20)
- Share-trading execution with private wallet records/claims and ZK verification
- Fixed winner redemption semantics (1 payout unit per winning share)
- LP accounting with post-resolution withdrawal (principal + LP fee share + trading surplus share)
- Quorum-aware optimistic resolution with challenge + dispute flow

## Highlights (So Far)

- v11 buildathon contract suite integrated end-to-end
- Multi-token market creation and betting UX
- Buy/sell shares flow in market detail (with sell quote + slippage guard)
- Pool funding flow in market detail
- Currency filter on markets page (All, ALEO, USDCx, USAD)
- Token ticker shown on market cards
- Improved place-bet success state animation and flow
- Oracle registration + unstake flow in UI
- Oracle status now reflects effective stake threshold (loses status when unstaked below minimum)
- Fully integrated withdrawal flow for LPs (principal + fees + surplus).
- Safety valve for market creators to cancel if no trading/liquidity has occurred.
- Publicly accessible resolution finalization once deadlines pass.
- Secure, stake-aware dispute flow with clear risk/reward reporting.
- Governance contract executes param updates directly on core/oracle
- Clean v11-only runtime (no v8/v9/v10 fallback paths in app/data flow)

## Contracts (v11)

- Core: `veilmarkets_core_build_v11.aleo`
- Factory: `veilmarkets_factory_build_v11.aleo`
- Oracle: `veilmarkets_oracle_build_v11.aleo`
- Governance: `veilmarkets_gov_build_v11.aleo`
- Credits adapter: `veilmarkets_credits_build_v11.aleo`
- USDCx adapter: `veilmarkets_usdcx_build_v11.aleo`
- USAD adapter: `veilmarkets_usad_build_v11.aleo`

## Architecture Overview

1. User buys shares through the token adapter for that market.
2. Adapter escrows funds and calls core.
3. Core updates share/pool accounting and links position commitments.
4. Frontend can compute deterministic buy/sell quotes from on-chain config/state.
5. Oracles propose outcome after `resolution_time`.
6. Challenge window allows disputes; if disputed, quorum-weighted voting resolves final outcome.
7. **Economic Incentives**: incorrect side is slashed; challenger/proposer rewards and platform cut are enforced in oracle finalize.
8. Finalization resolves on core.
9. User claims:
   - `claim_winnings` on core (computes/records payout claim)
   - `claim_payout` on matching token adapter (transfers payout)

## Tech Stack

- Aleo + Leo
- React + Vite + TypeScript
- Tailwind CSS
- Supabase (market metadata)

## Getting Started

### 1) Install

```bash
npm install
```

### 2) Environment

Create `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ALEO_NETWORK=testnet

# Required for token resolution/filtering and token UX labels
VITE_CREDITS_TOKEN_PROGRAM_ADDRESS=aleo1...
VITE_USDCX_TOKEN_PROGRAM_ADDRESS=aleo1...
VITE_USAD_TOKEN_PROGRAM_ADDRESS=aleo1...
```

### 3) Deploy v11 Contracts

Suggested order:

1. `veilmarkets_factory_build_v11`
2. `veilmarkets_core_build_v11`
4. `veilmarkets_gov_build_v11`
3. `veilmarkets_oracle_build_v11`
5. `veilmarkets_credits_build_v11`
6. `veilmarkets_usdcx_build_v11`
7. `veilmarkets_usad_build_v11`

### 4) Register Contracts in Factory

After deployment, register token and oracle contracts:

```bash
# contract_type 1 = token
leo execute <factory_address>/register_contract 1u8 <token_adapter_address> --broadcast --network testnet

# contract_type 2 = oracle
leo execute <factory_address>/register_contract 2u8 <oracle_address> --broadcast --network testnet

# contract_type 3 = core
leo execute <factory_address>/register_contract 3u8 <core_address> --broadcast --network testnet

# contract_type 4 = governance
leo execute <factory_address>/register_contract 4u8 <governance_address> --broadcast --network testnet
```

Repeat token registration for each adapter you want active (credits, USDCx, USAD).

### 5) Run App

```bash
npm run dev
```

## Notes

- Runtime data and contract routing are v11-only.
- Current payout flow remains claim-based via core `claim_winnings` + adapter `claim_payout`.
- Quotes are computed client-side with canonical on-chain math parity (no persistent quote mappings).
- Claim semantics are fixed-share, not pari-mutuel:
  - resolved winner claim = `shares`
- Cancellation is pre-liquidity-only in v11, so cancelled markets have no trader claim path.
- LP fee accrual uses market fee index + per-LP checkpoints to prevent late LP fee capture.
- Stablecoin private spend paths rely on valid private records and proof inputs.
- If currency filtering behaves differently in production, verify all `VITE_*_TOKEN_PROGRAM_ADDRESS` values were set correctly before build/deploy.
- Outcome labels for categorical markets are metadata-driven and support up to 8 outcomes.

## Documentation

For a deeper understanding of VeilMarkets:

- 📘 [Getting Started](./walkthrough.md)  
  Learn how to use the platform: creating markets, placing bets, and claiming rewards  

- 🧠 [Technical Architecture](./architecture.md)  
  Explore the system design, contract interactions, and privacy model  

## License

MIT
