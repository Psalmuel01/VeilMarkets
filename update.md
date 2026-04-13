# VeilMarkets Evolution Since v8

VeilMarkets has changed substantially since the v8 era. What began as an earlier prediction market design has evolved into a modular Aleo protocol centered on share trading, multi-token settlement, oracle-driven resolution, and a more honest privacy model.

## Current State

- Current deployed-style program suite uses `v11` program IDs.
- The protocol now runs as a modular contract stack:
  - `veilmarkets_factory_v11.aleo`
  - `veilmarkets_core_v11.aleo`
  - `veilmarkets_governance_v11.aleo`
  - `veilmarkets_oracle_v11.aleo`
  - `veilmarkets_token_credits_v11.aleo`
  - `veilmarkets_token_usdcx_v11.aleo`
  - `veilmarkets_token_usad_v11.aleo`

## 1. Market Model Rewrite

The biggest change since v8 was replacing the older market flow with a true share-trading architecture.

What changed:

- Users now buy and sell outcome shares before market close.
- Pricing and execution follow a Fixed Product Market Maker style path in core.
- Settlement is fixed-share, not pari-mutuel:
  - winning share = `1` payout unit
  - losing share = `0`
  - cancelled market = refund of original collateral
- LPs seed pools by minting equal outcome inventory across all outcomes.
- Resolution accounting now separates winner payouts, LP returns, and fee pools.

This made the market semantics much closer to modern prediction exchanges rather than escrowed betting.

## 2. Multi-Program Contract Architecture

Since v8, the protocol was split into dedicated programs with clearer responsibilities.

- Factory handles contract registration and role verification.
- Core owns market creation, pool accounting, trading, claims, and LP withdrawals.
- Governance authorizes parameter updates.
- Oracle handles optimistic proposal, disputes, quorum voting, and resolution settlement.
- Token adapters route settlement through Credits, USDCx, or USAD.

This separation reduced circular dependencies and made each workflow easier to reason about.

## 3. Multi-Token Settlement Rails

Markets are no longer limited to a single token path.

Supported rails now include:

- Aleo Credits
- USDCx
- USAD

Each market is bound to one token adapter, and all bet, claim, and liquidity actions must follow that market's selected rail.

Stablecoin support added:

- private token record handling
- Merkle proof inputs for private spend flows
- adapter-mediated public settlement and private payout recovery

## 4. Oracle Resolution and Disputes

Resolution became much more robust after v8.

New oracle mechanics include:

- oracle registration with stake
- optimistic outcome proposal after `resolution_time`
- challenge / dispute window
- quorum voting on disputed markets
- proposer stake locking while a proposal is active
- challenger, proposer, voter, and platform reward/slash flows
- protocol pause control and governance-driven oracle params

The current model supports:

- undisputed finalization after the proposal deadline
- disputed finalization only after quorum requirements are met
- fallback finalization to the proposed outcome after timeout if quorum never forms

## 5. Governance Layer

Governance is now part of the protocol flow rather than an afterthought.

What changed:

- core and oracle parameters are updated through governance-authorized calls
- the factory verifies contract type registration before sensitive actions
- governance execution acts as the source of authorization for protocol changes

This removed several tightly coupled admin-only assumptions from earlier versions.

## 6. Core Economic and Accounting Fixes

Several critical fixes were made after the early versions to align the protocol with correct FPMM behavior.

Important improvements:

- LP funding now actually initializes pool inventory and pricing state
- buy/sell accounting correctly updates pool collateral and outcome quantities
- winner payout pool and LP return pool are separated at resolution
- `withdraw_liquidity` is implemented for post-resolution LP exit
- cancellation is blocked once liquidity or trading exists
- protocol fee authorization uses dedicated auth-spend tracking
- `trader_count` and `lp_count` are tracked separately

These fixes made pricing, LP economics, and settlement much more consistent across the app and contracts.

## 7. Frontend and Product Flow

The frontend was rebuilt around the newer protocol instead of legacy fallback flows.

Major product changes:

- market creation supports token rail selection
- markets page supports token filtering and token badges
- buy/sell flows use live on-chain pool state with client-side quote computation
- LP funding and withdrawal flows are wired into the market experience
- oracle registration, stake status, and unstaking are exposed in the UI
- resolution and claims follow the current core/oracle/token-adapter lifecycle
- metadata storage and reads are aligned around the current `v11` schema

The app runtime is now effectively a current-suite-only flow rather than a mixed legacy compatibility layer.

## 8. Privacy Improvements and Reality Check

Privacy has improved since v8, but the current protocol is privacy-aware, not fully private.

What is private:

- wallet-owned token records
- `BetPosition` records after purchase
- claim artifacts such as `WinningsClaim`
- some ownership commitments stored in core mappings

What is still public:

- market identity
- chosen outcome when executing a trade
- collateral amount used in a trade
- slippage and quote guard values
- aggregate pool/accounting state
- oracle actions and most resolution-side economics

Recent privacy hardening reduced some avoidable linkage:

- position and LP ownership are tracked with opaque commitments instead of simpler signer-derived linkage
- direct user flows such as selling, claiming winnings, and LP withdrawal rely less on explicit caller-address checks in finalize paths

But one hard limit remains: under the current Aleo finalize model, trade execution still needs public inputs for the market state update. Full trade privacy would require a different architecture such as commit-reveal or off-chain matching with on-chain settlement proofs.

## 9. What Was Removed Along the Way

Several earlier concepts were removed as the protocol matured:

- older escrow-style bet flows
- quote storage mappings
- pending-position helper state from prior designs
- virtual liquidity and related legacy market-shaping parameters
- monolithic assumptions about a single token rail
- earlier fallback/runtime compatibility paths in the frontend

## 10. Summary

Since v8, VeilMarkets evolved from an earlier prediction market design into a modular Aleo protocol with:

- share trading instead of simple escrowed betting
- FPMM-style pricing and fixed-share settlement
- a seven-program contract suite
- multi-token settlement rails
- oracle proposal, dispute, and quorum resolution
- governance-bound parameter control
- LP funding and withdrawal flows
- stronger commitment-based privacy for stored positions and LP state

The biggest remaining tradeoff is privacy at execution time: the system now protects records and claims much better than before, but trade direction and size are still public during execution because the market maker needs those values to update state on-chain.
