```markdown
# VeilMarkets Update Log

## v13 — FPMM Rewrite (Current)
**Network:** Aleo Testnet | **Status:** Live

### What Changed

**Protocol model replaced entirely.**
Moved from a broken hybrid AMM to pure Fixed Product Market Maker (FPMM) with
fixed $1 redemption. Every winning share pays exactly 1 unit of collateral.
Price equals implied probability. This is the same model Polymarket uses.

**How it works now:**
- LP deposits mint equal outcome tokens to all outcomes simultaneously
- Traders buy outcome tokens from the pool using the constant product formula
- Pool token quantity decreases for bought outcome, collateral increases
- At resolution, outstanding tokens (supply minus pool qty) = winner payout pool
- LPs receive everything remaining after winners are paid

**The formula:**
```
Buy:  tokens_out = qty_outcome × net_in / (total_other_qty + net_in)
Sell: collateral_out = total_other_qty × shares / (qty_outcome + shares)
```

---

### Bugs Fixed

| Bug | Fix |
|---|---|
| Share quote always failed | Removed solvency check that blocked trades below 50% price. FPMM math naturally enforces solvency. |
| Winners claimed LP capital | LP and trading collateral now separated. Winners paid from trading pool only. |
| No LP withdrawal | `withdraw_liquidity` implemented. Post-resolution only. Pays LP return pool + fee share. |
| Creator rug vector | `cancel_market` blocked once any liquidity or trading exists. |
| All contract calls failed with parse error | Removed inter-finalize helper function calls (`assert_protocol_not_paused`, `assert_oracle_not_paused`). Pause checks inlined directly into each finalize. SDK could not parse compiled inter-finalize call instructions. |
| Protocol fees never withdrawable | `authz_fee_withdrawal` implemented with separate `spent_auth_ids` mapping. No longer mixed with position nullifiers. |
| LP deposit had no effect on pricing | LP tokens now correctly initialize FPMM pool state via `outcome_token_qty`. |
| trader_count and lp_count conflated | Separated in PoolState. Volume, OI, TVL now consistent across all UI pages. |

---

### Oracle Updates

- Stake locking per proposal — proposer cannot unstake while bond is active
- Voter rewards — correct-side voters earn 20% of slashed stake
- Dispute timeout — if quorum not reached within 30 minutes of challenge window, falls back to proposed outcome (prevents stuck markets)
- Platform fee pool replaces hardcoded admin address
- Testnet defaults: 20 ALEO min stake, 10 minute dispute window, 2 min voters

---

### Governance Updates

- Stake-weighted voting (default weight 0 — admin must assign explicitly)
- 24-hour execution timelock after vote passes
- Oracle parameter changes authorized via `consume_oracle_u64/u8` pattern
  (breaks circular import between oracle and governance)

---

### Frontend Updates

- Quote functions fully rewritten using FPMM formula with BigInt precision
- Quotes computed client-side from `outcome_token_qty` RPC reads — no transaction needed
- `fetchMarkets` batched in groups of 8 to avoid RPC rate limits
- Resolution finalize button visible to all users, not admin only
- LP balance display reads from `lp_balances` mapping via derived key
- LP withdrawable estimate = proportional lp_return_pool + fee_pool share

---

### Privacy — What Is Actually Private in v13

| Data | Private? |
|---|---|
| Outcome you bet on | **No — public on-chain** |
| Amount you bet | **No — public on-chain** |
| Shares you hold after purchase | Yes — BetPosition record |
| Your payout when claiming | Yes — WinningsClaim record |
| LP deposit amount | **No — public on-chain** |
| Oracle votes and stake | **No — by design** |
| Market prices and pool depth | **No — by design** |

The Aleo finalize model requires outcome and amount to be public inputs
because validators must read them to update pool state. Full trade privacy
requires a commit-reveal architecture, out of scope for this version.

**Accurate claim:** Your position contents after purchase and your winnings
at claim time are private. The trade itself is not.

---

### Removed

`place_bet` · `refund_bet` · `mint_position_record` · `mint_share_record`
· quote storage mappings · `outcome_exposure` mapping · `virtual_liq` param
· `participant_count` · `EscrowedBet` record · `pending_position_*` mappings
· `escrow_id` field · `assert_protocol_not_paused()` helper fn
· `assert_oracle_not_paused()` helper fn

---

### Deployment Order

```
factory → core → governance → oracle → credits → usdcx → usad
then register all seven in factory, assign governance voter weights,
register oracle wallet with ≥ 20 ALEO stake
```

---

### Open for v14

- Fair LP fee distribution using cumulative fee index (current model
  allows late LPs to claim fees they did not earn)
- Emergency LP withdrawal for markets stuck 7+ days past resolution time
- Per-trade position size cap to prevent outcome manipulation
- On-chain challenger ≠ proposer enforcement
- Outcome label metadata via IPFS + indexer
- WithdrawLiquidityModal and CancelMarket UI fully wired
```