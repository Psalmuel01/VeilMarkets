# VeilMarkets v9 Walkthrough

## Overview

VeilMarkets is a multi-token prediction market on Aleo where users trade outcome shares and settle with fixed-share redemption logic.

Supported settlement rails:

- Aleo Credits
- USDCx
- USAD

Supported market types:

- Binary
- Categorical (up to protocol cap, default 32 outcomes)

## 1) Connect wallet

- Connect an Aleo-compatible wallet.
- For USDCx/USAD private spends, wallet must expose on-chain record history/proofs.

## 2) Create market

From Create Market:

- Enter title and category.
- Choose market type (binary or categorical).
- Enter outcomes.
- Choose settlement token rail.
- Set `close_time` and `resolution_time`.

## 3) Trade shares

Buy:

- Select market and outcome.
- Enter collateral amount.
- Confirm quote/slippage and submit.

Sell:

- Select an owned position record.
- Enter shares to sell.
- Confirm min receive and submit.

## 4) Resolution flow

1. Oracle proposes an outcome after `resolution_time`.
2. Proposal enters challenge window.
3. If undisputed:
   - Finalize after deadline with proposed outcome.
4. If disputed:
   - Requires quorum vote checks before finalization.
   - Defaults: at least 3 unique voters and total vote weight >= 3 * minimum oracle stake.

## 5) Payout flow

Trader payout:

1. Call `claim_winnings` on core.
2. Call `claim_payout` on the same token adapter.

Redemption semantics:

- Winning share redeems 1 payout unit per share.
- Losing share redeems 0.
- Cancelled market refunds original collateral tracked for position.

LP payout:

- LP withdrawals happen after resolution via `withdraw_liquidity`.

## 6) Notes

- Quotes come from on-chain quote transitions and canonical execution math.
- Market cards and detail should be interpreted as:
  - Volume = cumulative traded notional
  - Open Interest = current trader exposure
  - TVL = trading collateral + LP collateral
