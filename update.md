# VeilMarkets Update

## Wave 4 Recap (v8 + Product Revamp)

Wave 4 focused on turning VeilMarkets from a binary-only prototype into a production-shaped private prediction product with stronger UX, multi-token rails, and richer market structures.

### 1) Full UI/UX Revamp
- Refreshed core product flows across market discovery, market details, market creation, and betting.
- Improved interaction consistency and loading/success states (including post-bet success handling).
- Added cleaner market card presentation with subtle token identity so currency context is clear at a glance.

### 2) Better Experience for Non-Connected Users
- Improved read-only browsing paths so users can discover markets before connecting.
- Reduced wallet-gated friction in the default UI state.
- Tightened conditional rendering for wallet-required actions and status cards.

### 3) Multi-Token Support (ALEO Credits + USDCx + USAD)
- Extended protocol support to three token rails:
  - `credits.aleo` (Aleo Credits)
  - `test_usdcx_stablecoin.aleo` via `veilmarkets_token_usdcx_v8.aleo`
  - `test_usad_stablecoin.aleo` via `veilmarkets_token_usad_v8.aleo`
- Added token-aware behavior in frontend flows (creation, market cards, filtering, bet placement).
- Added currency filter UX in markets page so users can quickly segment by token.

### 4) Beyond Binary: Categorical Markets
- Introduced market types beyond yes/no:
  - Binary markets
  - Categorical markets (2-4 outcomes)
- Added outcome count and label support across stack:
  - Create flow collects/validates outcomes
  - Metadata stores `market_type`, `outcome_count`, `outcome_labels`
  - Detail/betting/resolution UI renders dynamic outcome sets
- Oracle/core logic upgraded to resolve indexed outcomes (not just boolean winner).

### 5) Contract Suite Upgrade to v8
- Upgraded and aligned contracts to v8 naming and interfaces:
  - `veilmarkets_factory_v8.aleo`
  - `veilmarkets_v8.aleo`
  - `veilmarkets_oracle_v8.aleo`
  - `veilmarkets_token_credits_v8.aleo`
  - `veilmarkets_token_usdcx_v8.aleo`
  - `veilmarkets_token_usad_v8.aleo`
- Updated Leo program dependencies/imports/tests accordingly.
- Rebuilt contracts and validated compile flow under v8 suite.


### 6) Oracle Lifecycle and Status Tracking
- Improved oracle status tracking in frontend state.
- Added unstake-driven status downgrade behavior (losing effective oracle status when stake falls below threshold).
- Kept registration/staking flows aligned with updated contract semantics.

### 7) Economic Hardening: Oracle Dispute Rewards
- Introduced a **90/10 reward split** for market resolution disputes:
  - **Winners** (Proposer or Disputer) receive 90% of the loser's stake/bond.
  - **Platform** collects 10% as residues to maintain the oracle network.
- **Fixed-Stake Slashing for Proposers**: Wrong proposals result in a slash of 30 Credits (minimum stake) to ensure accountability without over-penalizing large oracles.
- **Disputer-Stake Slashing**: Disputers lose their entire bond if they lose a challenge, discouraging spam/lazy disputes.



### 8) Implemented end-to-end auto-refresh behavior with React Query, invalidation, and realtime updates, for smooth user experience.
---

## Current Product State After Wave 4

VeilMarkets now supports private prediction markets across multiple settlement tokens, with both binary and categorical outcomes, and a v8 contract/metadata backbone ready for repeated deployment cycles.

---

## Wave 5 Plan (Next)

Wave 5 is focused on production hardening, deeper privacy guarantees, and scaling market design flexibility.

### A) Advanced Market Types
- Add additional non-binary market structures:
  - Scalar/range markets
  - Ranked/ordered outcome markets
  - Multi-select outcome markets
- Extend odds/probability visualization per market type.

### B) Resolution and Governance Hardening
- Expand oracle accountability (challenge/dispute tooling, slashing hooks where applicable).
- Improve proposal/vote/finalization observability in UI.
- Add stronger edge-case handling for expired/cancelled/inconclusive markets.

### C) Liquidity and Payout UX
- Improve low-balance and payout-path UX across all supported tokens.
- Add unified claim/refund center and clearer pending-state tracking.
- Strengthen payout error diagnostics for faster user recovery.

### D) Data, Analytics, and Reliability
- Add product analytics around funnel drop-off (create, bet, claim).
- Improve production filtering/search resiliency across environments.
- Expand test coverage (frontend integration + Leo interaction smoke tests).



