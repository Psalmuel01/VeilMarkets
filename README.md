# VeilMarkets

Privacy-aware prediction markets on Aleo.

VeilMarkets lets users create markets, fund liquidity pools, trade outcome shares, resolve outcomes through an oracle flow, and claim payouts through token-specific settlement rails. The current suite supports binary and categorical markets with settlement in Aleo Credits, USDCx, or USAD.

## What VeilMarkets Is Today

- Share-trading prediction markets with FPMM-style pool accounting
- Binary and categorical markets with `2-8` outcomes
- Fixed-share settlement:
  - winning share = `1` payout unit
  - losing share = `0`
  - cancelled market = refund of original collateral
- Multi-token settlement rails:
  - Aleo Credits
  - USDCx
  - USAD
- Oracle-driven resolution with proposal, challenge, dispute, and quorum voting
- Governance-authorized protocol parameter updates
- LP funding before close and LP withdrawal after resolution

## Current Contract Suite

- Core: `veilmarkets_core_v11.aleo`
- Factory: `veilmarkets_factory_v11.aleo`
- Oracle: `veilmarkets_oracle_v11.aleo`
- Governance: `veilmarkets_governance_v11.aleo`
- Credits adapter: `veilmarkets_token_credits_v11.aleo`
- USDCx adapter: `veilmarkets_token_usdcx_v11.aleo`
- USAD adapter: `veilmarkets_token_usad_v11.aleo`

## Architecture Overview

1. A creator opens a market in core with close time, resolution time, category, outcome count, and token rail.
2. LPs can seed the pool through the matching token adapter.
3. Traders buy or sell shares through the market's token adapter.
4. Core updates pool inventory, fees, positions, and payout state.
5. Oracles propose and, if needed, dispute/vote on the outcome after `resolution_time`.
6. Oracle finalization resolves the market on core.
7. Users claim:
   - `claim_winnings` on core
   - `claim_payout` on the matching token adapter
8. LPs withdraw post-resolution with `withdraw_liquidity`.

## Privacy Model

VeilMarkets is privacy-aware, but not fully private at trade execution time.

What is private:

- wallet-owned token records
- position records after purchase
- payout claim artifacts
- some ownership commitments stored in core

What is public:

- market identifier
- chosen outcome when placing a trade
- trade amount
- slippage/quote guard values
- aggregate pool and fee state
- oracle proposal and dispute activity

That means the current system protects positions and claims better than a fully public market, but it does not yet hide the trade itself.

## Highlights Since v8

- Replaced the older market model with share trading and FPMM-style execution
- Added a modular contract suite instead of a single tightly coupled flow
- Added multi-token settlement rails for Credits, USDCx, and USAD
- Added oracle stake registration, disputes, quorum voting, and slash/reward flows
- Added governance-authorized parameter updates
- Implemented LP withdrawal after resolution
- Improved privacy of stored ownership state through commitment-based linkage
- Simplified the frontend into a current-suite-only runtime around `v11`

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure Environment

Create `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ALEO_NETWORK=testnet

VITE_CREDITS_TOKEN_PROGRAM_ADDRESS=aleo1...
VITE_USDCX_TOKEN_PROGRAM_ADDRESS=aleo1...
VITE_USAD_TOKEN_PROGRAM_ADDRESS=aleo1...
```

### 3. Deploy Contracts

Suggested order:

1. `veilmarkets_factory_v11`
2. `veilmarkets_core_v11`
3. `veilmarkets_governance_v11`
4. `veilmarkets_oracle_v11`
5. `veilmarkets_token_credits_v11`
6. `veilmarkets_token_usdcx_v11`
7. `veilmarkets_token_usad_v11`

### 4. Register Contracts in Factory

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

Repeat token registration for each adapter you want active.

### 5. Run the App

```bash
npm run dev
```

## Operational Notes

- Runtime data flow is current-suite-focused around the `v11` programs.
- Quotes are computed client-side from live on-chain pool state.
- Winner claims are fixed-share, not pari-mutuel.
- Stablecoin private spend paths rely on valid private records and proof inputs.
- LP fee distribution is currently simple proportional withdrawal from the accumulated market fee pool. A more precise fee-index model is still future work.
- Outcome labels for categorical markets are metadata-driven and support up to `8` outcomes.

## Documentation

- [update.md](./update.md)
- [flow.md](./flow.md)

## License

MIT
