# VeilMarkets

Privacy-aware prediction markets on Aleo.

VeilMarkets lets users create markets, place bets, and claim payouts with zero-knowledge-backed verification. The app supports binary and categorical markets (2-32 outcomes) with multi-token settlement rails.

## Current Scope

- Binary and categorical markets (2-32 outcomes)
- Market categories: Crypto, Finance, Sports, Politics, Entertainment, Tech, Other
- Settlement tokens:
  - Aleo Credits
  - USDCx (ARC-20)
  - USAD (ARC-20)
- Public bet placement with private wallet records/claims and ZK verification
- Quorum-aware optimistic resolution with challenge + dispute flow

## Highlights (So Far)

- v9 contract suite integrated end-to-end
- Multi-token market creation and betting UX
- Currency filter on markets page (All, ALEO, USDCx, USAD)
- Token ticker shown on market cards
- Improved place-bet success state animation and flow
- Oracle registration + unstake flow in UI
- Oracle status now reflects effective stake threshold (loses status when unstaked below minimum)
- Governance contract executes param updates directly on core/oracle
- v8 markets remain visible as legacy read-only

## Contracts (v9)

- Core: `veilmarkets_v9.aleo`
- Factory: `veilmarkets_factory_v9.aleo`
- Oracle: `veilmarkets_oracle_v9.aleo`
- Governance: `veilmarkets_governance_v9.aleo`
- Credits adapter: `veilmarkets_token_credits_v9.aleo`
- USDCx adapter: `veilmarkets_token_usdcx_v9.aleo`
- USAD adapter: `veilmarkets_token_usad_v9.aleo`

## Architecture Overview

1. User places a bet through the token adapter for that market.
2. Adapter escrows funds and calls core.
3. Core updates share/pool accounting and links position commitments.
4. Oracles propose outcome after `resolution_time`.
5. Challenge window allows disputes; if disputed, quorum-weighted voting resolves final outcome.
6. **Economic Incentives**: incorrect side is slashed; challenger/proposer rewards and platform cut are enforced in oracle finalize.
7. Finalization resolves on core.
8. User claims:
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

### 3) Deploy v9 Contracts

Suggested order:

1. `veilmarkets_factory_v9`
2. `veilmarkets_v9`
3. `veilmarkets_oracle_v9`
4. `veilmarkets_governance_v9`
5. `veilmarkets_token_credits_v9`
6. `veilmarkets_token_usdcx_v9`
7. `veilmarkets_token_usad_v9`

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

- v9 is the primary write path. v8 markets are preserved for legacy read-only display in the UI.
- Current payout flow remains claim-based via core `claim_winnings` + adapter `claim_payout`.
- Stablecoin private spend paths rely on valid private records and proof inputs.
- If currency filtering behaves differently in production, verify all `VITE_*_TOKEN_PROGRAM_ADDRESS` values were set correctly before build/deploy.
- Outcome labels for categorical markets are metadata-driven and support up to 32 outcomes in v9 schema.

## Documentation

For a deeper understanding of VeilMarkets:

- 📘 [Getting Started](./walkthrough.md)  
  Learn how to use the platform: creating markets, placing bets, and claiming rewards  

- 🧠 [Technical Architecture](./architecture.md)  
  Explore the system design, contract interactions, and privacy model  

## License

MIT
