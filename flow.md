# VeilMarkets v9 Flow (Current)

This document reflects the current v9 architecture and payout math.

## 1) Core model

VeilMarkets is now a share-trading prediction market:

- Users buy and sell outcome shares before market close.
- Pricing is quote-based from pool state (FPMM-style path in core quote/execution).
- Settlement is fixed-share at resolution:
  - Winning shares redeem `1` payout unit per share.
  - Losing shares redeem `0`.
  - Cancelled markets refund original position collateral.

It is not pari-mutuel pool splitting anymore.

## 2) Public vs private

- Private: wallet records, claim artifacts, and position ownership commitments.
- Public: market metadata hash links, aggregate pool/accounting state, resolution events.
- Stablecoin rails (USDCx/USAD) require private token records + Merkle proof inputs.

## 3) End-to-end market lifecycle

1. Create market:
   - Creator sets token rail, category, market type, outcomes, close/resolution times.
2. Fund pool (optional):
   - LP collateral is added through the token adapter and tracked in core as LP state.
3. Buy shares:
   - User submits trade via token adapter.
   - Adapter escrows collateral and calls core `buy_shares`.
   - Core computes canonical quote math, mints pending position state, and updates pools.
4. Sell shares:
   - User submits position record + amount to sell.
   - Core computes payout with same canonical math path, stores pending payout claim.
   - Adapter `claim_payout` settles to user private records.
5. Resolve:
   - Oracle proposes outcome after `resolution_time`.
   - Dispute window opens.
   - If disputed, quorum voting is required.
6. Claim and withdraw:
   - Winners call `claim_winnings` then adapter `claim_payout`.
   - LPs withdraw post-resolution via `withdraw_liquidity`.

## 4) Resolution and dispute requirements

- Undisputed:
  - Finalize allowed only after `challenge_deadline`.
  - Outcome must equal proposed outcome.
- Disputed:
  - Requires minimum unique voters and minimum total vote weight.
  - Defaults: min voters = `3`, min stake = `30` credits, so quorum weight >= `90`.
  - Finalizer supplies outcome to `resolve_on_core`.

## 5) Fees and economics

- Buy and sell trades apply protocol fee.
- Current split target is LP fee pool + protocol treasury (configured in core params).
- Claiming winnings has no extra claim fee in core.
- Dispute settlement applies 90/10 winner/platform economics on slash/bond flows in oracle.

## 6) Important operational notes

- Quote transitions (`quote_buy`, `quote_sell`) are on-chain and match execution formula paths.
- Dynamic outcomes are mapping-based with governance-configurable cap (default 32).
- Oracle stake state currently uses live `active_oracles` at finalize time. If stake changes after proposal/dispute, slash/reward outcomes can change accordingly.
