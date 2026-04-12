# VeilMarkets v9 Architecture

## Overview

VeilMarkets v9 is a modular prediction market stack on Aleo with:

- share-trading market core
- multi-token settlement adapters (Credits, USDCx, USAD)
- optimistic oracle with dispute/quorum path
- governance-bound protocol parameters via factory authorization

## Contract modules

## 1) Factory (`veilmarkets_factory_build_v11.aleo`)

- Registry and trust anchor for cross-program authorization.
- Registered contract types:
  - `1` token adapters
  - `2` oracle
  - `3` core
  - `4` governance

## 2) Core (`veilmarkets_core_build_v11.aleo`)

Source of truth for:

- market metadata and lifecycle state
- pool state and dynamic outcome mappings
- position ownership commitments and nullifier-based claims
- LP accounting and withdrawal state
- protocol parameters and protocol-fee accounting

Core enforces quote/execution math and fixed-share settlement semantics:

- winner claim payout = `shares`
- loser payout = `0`
- cancellation refund = position collateral

## 3) Oracle (`veilmarkets_oracle_build_v11.aleo`)

Implements optimistic proposal + dispute flow:

- propose outcome
- open challenge window
- optional dispute bond
- quorum vote checks in disputed path
- resolve into core

Also handles dispute economics (slash/reward/platform split) and oracle stake tracking.

## 4) Governance (`veilmarkets_gov_build_v11.aleo`)

Governance proposals execute parameter updates directly on core/oracle through registered authorization.

## 5) Token adapters

- `veilmarkets_credits_build_v11.aleo`
- `veilmarkets_usdcx_build_v11.aleo`
- `veilmarkets_usad_build_v11.aleo`

Responsibilities:

- token-specific private/public transfer rail
- escrow in adapter
- route execution to core transitions
- settle pending claims back to private records

## Privacy model (honest scope)

Private:

- wallet-owned token records
- claim records/nullifier artifacts
- position ownership commitments

Public:

- aggregate market/pool state
- resolution/dispute events
- adapter-level public accounting balances

## Interaction flow

1. Create market in core (token rail + outcomes + timing).
2. Buy/sell/fund via token adapter.
3. Adapter calls core transition.
4. Core updates state and writes pending claim artifacts.
5. User claims via adapter `claim_payout`.
6. Oracle resolves market (undisputed or disputed quorum path).
7. Users claim winnings; LPs withdraw liquidity post-resolution.

## Data model

On-chain:

- all live market, pool, and payout logic

Off-chain (Supabase):

- market metadata and UI enrichment
- no off-chain authority over settlement math
