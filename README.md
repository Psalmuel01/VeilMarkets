# VeilMarkets

Privacy-first prediction markets on Aleo.

VeilMarkets lets users create markets, place private bets, and claim payouts with zero-knowledge guarantees. The app supports binary and categorical markets (2-4 outcomes) with multi-token settlement rails.

## Current Scope

- Binary and categorical markets (2-4 outcomes)
- Market categories: Crypto, Finance, Sports, Politics, Entertainment, Tech, Other
- Settlement tokens:
  - Aleo Credits
  - USDCx (ARC-20)
  - USAD (ARC-20)
- Private betting flow with private records and ZK verification
- Oracle-driven optimistic resolution with challenge window

## Highlights (So Far)

- v8 contract suite integrated end-to-end
- Multi-token market creation and betting UX
- Currency filter on markets page (All, ALEO, USDCx, USAD)
- Token ticker shown on market cards
- Improved place-bet success state animation and flow
- Oracle registration + unstake flow in UI
- Oracle status now reflects effective stake threshold (loses status when unstaked below minimum)

## Contracts (v8)

- Core: `veilmarkets_v8.aleo`
- Factory: `veilmarkets_factory_v8.aleo`
- Oracle: `veilmarkets_oracle_v8.aleo`
- Credits adapter: `veilmarkets_token_credits_v8.aleo`
- USDCx adapter: `veilmarkets_token_usdcx_v8.aleo`
- USAD adapter: `veilmarkets_token_usad_v8.aleo`

## Architecture Overview

1. User places a bet through the token adapter for that market.
2. Adapter escrows funds and calls core `place_bet`.
3. Core updates pool/participant accounting and maps position to escrow.
4. Oracles propose outcome after `resolution_time`.
5. Challenge window allows disputes; if disputed, weighted oracle votes decide.
6. Finalization resolves on core.
7. User claims:
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

### 3) Deploy v8 Contracts

Suggested order:

1. `veilmarkets_factory_v8`
2. `veilmarkets_v8`
3. `veilmarkets_token_credits_v8`
4. `veilmarkets_token_usdcx_v8`
5. `veilmarkets_token_usad_v8`
6. `veilmarkets_oracle_v8`

### 4) Register Contracts in Factory

After deployment, register token and oracle contracts:

```bash
# contract_type 1 = token
leo execute <factory_address>/register_contract 1u8 <token_adapter_address> --broadcast --network testnet

# contract_type 2 = oracle
leo execute <factory_address>/register_contract 2u8 <oracle_address> --broadcast --network testnet
```

Repeat token registration for each adapter you want active (credits, USDCx, USAD).

### 5) Run App

```bash
npm run dev
```

## Notes

- Stablecoin private spend paths rely on valid private records and proof inputs.
- If currency filtering behaves differently in production, verify all `VITE_*_TOKEN_PROGRAM_ADDRESS` values were set correctly before build/deploy.
- Outcome labels for categorical markets currently use generic option names (`Option 1..4`).

## Documentation

For a deeper understanding of VeilMarkets:

- 📘 [Getting Started](./walkthrough.md)  
  Learn how to use the platform: creating markets, placing bets, and claiming rewards  

- 🧠 [Technical Architecture](./architecture.md)  
  Explore the system design, contract interactions, and privacy model  

## License

MIT
