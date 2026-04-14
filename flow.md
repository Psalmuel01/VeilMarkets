# VeilMarkets Flow

This document describes the current VeilMarkets lifecycle and protocol flow for the `v13` contract suite.

## Overview

VeilMarkets is a share-trading prediction market on Aleo with:

- binary and categorical markets
- up to `8` outcomes per market
- settlement in Aleo Credits, USDCx, or USAD
- FPMM-style pool accounting
- oracle-driven optimistic resolution with disputes and quorum voting

Settlement is fixed-share, not pari-mutuel:

- winning share = `1` payout unit
- losing share = `0`
- cancelled market = refund of original collateral

## Programs

The current suite is composed of:

- `veilmarkets_factory_v13.aleo`
- `veilmarkets_core_v13.aleo`
- `veilmarkets_governance_v13.aleo`
- `veilmarkets_oracle_v13.aleo`
- `veilmarkets_token_credits_v13.aleo`
- `veilmarkets_token_usdcx_v13.aleo`
- `veilmarkets_token_usad_v13.aleo`

## 1. Trust and Registration Flow

The factory acts as the trust anchor for cross-program authorization.

- token adapters must be registered in factory before they can create markets or participate in protected core flows
- oracle must be registered in factory before it can resolve markets on core
- governance must be registered in factory before it can execute protocol parameter changes

Factory contract types:

- `1` = token adapter
- `2` = oracle
- `3` = core
- `4` = governance

## 2. Market Creation Flow

Market creation happens in core.

1. Creator submits:
   - `title_hash`
   - `category`
   - `market_type`
   - `outcome_count`
   - `close_time`
   - `resolution_time`
   - `token_id`
2. Core verifies the selected token adapter is registered in factory.
3. Core derives `market_id` from `title_hash + creator`.
4. Core stores:
   - `MarketInfo`
   - empty `PoolState`

Current market constraints:

- categories are capped at `0-6`
- `market_type = 0` requires exactly `2` outcomes
- `market_type = 1` allows categorical markets
- outcome count must be between `2` and the configured max
- default max outcomes is `8`
- `resolution_time >= close_time`

## 3. Liquidity Provision Flow

LP funding is routed through the market's token adapter.

1. LP sends private token record to adapter.
2. Adapter transfers funds into its public balance.
3. Adapter calls core `fund_pool`.
4. Core:
   - validates market is open and unresolved
   - validates token rail via `self.caller`
   - splits LP amount evenly across all outcomes
   - increases `outcome_token_qty`
   - increases `outcome_token_supply`
   - updates `lp_supply`, `lp_collateral`, and `total_collateral`
   - credits `lp_balances` using the derived LP owner key

Result:

- the pool is initialized or deepened
- LP shares are tracked on-chain
- pricing inventory is seeded for trading

## 4. Buy Shares Flow

Buys also begin through the token adapter.

1. Trader submits:
   - private token record
   - `market_id`
   - `outcome`
   - `collateral_in`
   - `min_shares_out`
   - `expected_shares_out`
   - nonce/position inputs
2. Adapter escrows the collateral publicly.
3. Adapter derives:
   - `position_id`
   - owner commitment
4. Adapter calls core `buy_shares`.
5. Core:
   - checks market is open and unresolved
   - checks token rail matches `self.caller`
   - applies trading fee
   - computes `shares_out` with FPMM math
   - reduces pool quantity for the selected outcome
   - increases `total_collateral`
   - routes fee between LP fee pool and protocol treasury
   - stores private position state commitment

The user receives a private `BetPosition` record.

## 5. Sell Shares Flow

Selling is initiated directly on core with the user's private position record.

1. Trader submits:
   - private `BetPosition`
   - `shares_to_sell`
   - `min_payout`
   - sell nonce
2. Core:
   - validates the position commitment
   - validates market is still open
   - computes sell payout using the same FPMM path
   - increases pool quantity for the sold outcome
   - reduces `total_collateral`
   - routes fee between LP fee pool and protocol treasury
   - stores a `pending_payouts` entry keyed by nullifier
3. Trader then calls `claim_payout` on the matching token adapter.
4. Adapter verifies the pending claim on core and transfers payout back into a private token record.

## 6. Oracle Registration and Stake Flow

Oracle participation is stake-gated.

1. User submits a private Credits record to oracle `register_oracle`.
2. Oracle transfers stake publicly into the oracle contract.
3. Oracle stores active stake in `active_oracles`.
4. Oracle returns a private `OracleCredential` record for voting flows.

Additional stake rules:

- default minimum oracle stake is `20 ALEO`
- locked stake cannot be unstaked while tied to an active proposal
- unstaking is allowed only when locked stake is zero

## 7. Resolution Proposal Flow

After `resolution_time`, a registered oracle can propose an outcome.

1. Oracle submits:
   - `market_id`
   - `proposed_outcome`
2. Oracle contract:
   - checks protocol is not paused
   - checks proposer has enough active unlocked stake
   - records `ResolutionProposal`
   - locks proposer stake equal to the minimum oracle bond

If nobody disputes before `challenge_deadline`, the proposal can later be finalized directly.

## 8. Dispute and Voting Flow

Any eligible participant can dispute during the challenge window by posting the dispute bond.

1. Challenger submits private Credits record + dispute amount.
2. Oracle records:
   - dispute stake
   - challenger
   - proposal outcome being challenged
3. Staked oracles can then vote using their `OracleCredential`.

Voting behavior:

- each voter can vote once per market
- vote weight is based on current active oracle stake
- votes are tracked per `(market_id, outcome)`
- receipt, outcome, weight, and reward-claim state are stored for later distribution

Current default quorum parameters:

- minimum voters = `2`
- minimum oracle stake = `20 ALEO`
- default quorum weight = `40 ALEO`
- dispute window = `10 minutes`
- fallback timeout after challenge window = `30 minutes`

## 9. Final Resolution Flow

Resolution is finalized through oracle `resolve_on_core`.

Undisputed path:

- current time must be after `challenge_deadline`
- outcome must match proposed outcome

Disputed path:

- if quorum is met, finalization can resolve to the voted outcome
- if quorum is not met, fallback is allowed only after timeout
- timeout fallback must resolve to the originally proposed outcome

Once checks pass:

1. Oracle calls core `resolve_market`.
2. Core:
   - marks market resolved
   - computes winning payout pool as outstanding winning shares
   - computes LP return pool as remaining collateral
   - locks the pool against further trading
3. Oracle settles proposer/challenger/voter/platform economics.

## 10. Oracle Economics

Undisputed markets:

- no dispute reward flow
- proposer stake lock is released after resolution

Disputed markets:

- if no winning vote weight exists:
  - dispute bond is mostly returned to proposer
  - platform takes `10%`
- if the disputer side wins:
  - proposer bond is slashed
  - platform gets `10%`
  - voter reward pool gets `20%`
  - challenger receives original dispute stake plus remaining reward
- if proposer side wins after dispute:
  - dispute bond is split:
    - `10%` platform
    - `20%` voter reward pool
    - remaining amount to proposer

Winning voters later claim their share through `claim_vote_reward`.

## 11. Winner Claim Flow

After market resolution:

1. Winner submits private `BetPosition` to core `claim_winnings`.
2. Core verifies:
   - market is resolved
   - position is open
   - position outcome matches winner, or market is cancelled
3. Core stores a `pending_payouts` claim.
4. User calls `claim_payout` on the market's token adapter.
5. Adapter transfers payout back into a private token record.

Payout semantics:

- winning share pays `1` unit
- losing share pays `0`
- cancelled market refunds original `collateral_in`

## 12. LP Withdrawal Flow

After market resolution, LPs can withdraw using `withdraw_liquidity`.

1. LP submits:
   - `market_id`
   - LP shares
   - `min_payout`
   - nonce
2. Core:
   - verifies market is resolved
   - verifies LP balance via derived key
   - calculates pro-rata share of:
     - `market_lp_return_pool`
     - `market_fee_pool`
   - stores `pending_payouts` entry
3. LP then claims payout through the matching token adapter.

## 13. Governance Flow

Governance updates protocol parameters on core and oracle.

Current governance-controlled examples include:

- max outcomes
- fee bps
- min trade
- min liquidity
- max market collateral
- oracle min stake
- oracle dispute window
- oracle min voters
- pause flags

Governance acts through explicit execution functions rather than directly mutating remote state.

## 14. Privacy Model

VeilMarkets is privacy-aware, not fully private at trade execution time.

Private:

- wallet-owned token records
- `BetPosition` records after creation
- `WinningsClaim` records
- some ownership commitments and nullifier-linked claim artifacts

Public:

- market identifier
- chosen outcome during trade execution
- trade size
- slippage bounds
- aggregate pool state
- fee pools
- oracle actions and resolution events

This means the protocol protects stored positions and claims better than a fully public system, but it does not yet hide the trade itself.
