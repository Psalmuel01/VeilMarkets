# VeilMarkets

VeilMarkets is a privacy-aware prediction market built on Aleo. It supports share trading, oracle-based market resolution, and multi-token settlement through Aleo Credits, USDCx, and USAD.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Privacy Model](#privacy-model)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Testing](#testing)
- [Documentation](#documentation)
- [License](#license)

## Overview

VeilMarkets uses a modular `v14` contract suite to support:

- binary and categorical markets
- up to `8` outcomes per market
- FPMM-style pool accounting
- LP funding and withdrawal
- oracle-driven optimistic resolution with disputes and quorum voting
- governance-authorized protocol parameter updates
- settlement in:
  - Aleo Credits
  - USDCx
  - USAD
- protocol-enforced minimum liquidity, with `10` tokens as the default fallback
- single-side trading per wallet per market until that exposure is fully exited

Settlement is fixed-share:

- winning share = `1` payout unit
- losing share = `0`
- cancelled market = refund of original collateral

## Features

- Multi-program Aleo architecture with a factory trust anchor
- Share trading with buy and sell flows
- Categorical markets with enforced outcome bounds
- Multi-token settlement rails
- Oracle stake registration, dispute flow, and voter rewards
- Governance-controlled protocol parameters
- Market creation, funding, trading, resolution, claim, and LP withdrawal flows in the frontend
- Client-side quote computation from live on-chain pool state

## Architecture

Current program suite:

- `veilmarkets_factory_v14.aleo`
- `veilmarkets_core_v14.aleo`
- `veilmarkets_governance_v14.aleo`
- `veilmarkets_oracle_v14.aleo`
- `veilmarkets_token_credits_v14.aleo`
- `veilmarkets_token_usdcx_v14.aleo`
- `veilmarkets_token_usad_v14.aleo`

High-level flow:

1. Factory registers trusted token, oracle, core, and governance contracts.
2. Core creates and manages markets, pool state, positions, claims, and LP withdrawals.
3. Token adapters escrow collateral in and out of the system for each supported asset rail.
4. Oracle manages optimistic resolution, disputes, quorum voting, and stake economics.
5. Governance executes protocol parameter changes on core and oracle.

## Repository Structure

```text
leo/
  core/           Core market engine
  factory/        Contract registry and trust anchor
  governance/     Protocol parameter execution
  oracle/         Resolution, disputes, and oracle stake logic
  token_credits/  Credits settlement adapter
  token_usdcx/    USDCx settlement adapter
  token_usad/     USAD settlement adapter

src/
  components/     React UI components
  hooks/          Wallet, contract, and query logic
  lib/            Constants, RPC helpers, metadata helpers
  pages/          App pages
```

## Privacy Model

VeilMarkets is privacy-aware, but not fully private at trade execution time.

What is private:

- wallet-owned token records
- private position records after purchase
- payout claim artifacts
- hashed ownership commitments stored in core for positions and LP balances

What is public:

- market identifier
- chosen outcome at trade execution time
- trade amount
- slippage and quote guard values
- aggregate pool and fee state
- oracle proposal, dispute, and resolution activity

So the current system protects records, claims, and stored ownership references better than a fully public market, but it does not yet hide trade execution itself.

## Getting Started

### Prerequisites

- Node.js
- npm
- Leo `4.x`
- Aleo-compatible wallet for frontend testing

### Install

```bash
npm install
```

### Environment

Create a `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ALEO_NETWORK=testnet

VITE_CREDITS_TOKEN_PROGRAM_ADDRESS=aleo1...
VITE_USDCX_TOKEN_PROGRAM_ADDRESS=aleo1...
VITE_USAD_TOKEN_PROGRAM_ADDRESS=aleo1...
```

### Run the Frontend

```bash
npm run dev
```

### Build the Frontend

```bash
npm run build
```

## Deployment

Suggested contract deployment order:

1. `veilmarkets_factory_v14`
2. `veilmarkets_core_v14`
3. `veilmarkets_governance_v14`
4. `veilmarkets_oracle_v14`
5. `veilmarkets_token_credits_v14`
6. `veilmarkets_token_usdcx_v14`
7. `veilmarkets_token_usad_v14`

After deployment, register contracts in factory:

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

Repeat the token registration step for each active settlement rail.

## Testing

Frontend:

```bash
npm test
```

Leo packages:

```bash
cd leo/core && leo test
cd leo/oracle && leo test
cd leo/token_credits && leo test
cd leo/token_usdcx && leo test
cd leo/token_usad && leo test
```

Notes:

- The repo now includes Leo invariant tests for core, oracle, and token adapters.
- In the current local environment, full `leo test` execution may still be blocked by dependency deployment acceptance in the test ledger before runtime test execution begins.

## Documentation

- [update.md](./update.md)
- [flow.md](./flow.md)
- [architecture.md](./architecture.md)
- [walkthrough.md](./walkthrough.md)

## Links

- GitHub: [Psalmuel01/VeilMarkets](https://github.com/Psalmuel01/VeilMarkets)

## License

MIT
