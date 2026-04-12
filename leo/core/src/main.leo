import veilmarkets_factory_build_v11.aleo;

program veilmarkets_core_build_v11.aleo {
    const OUTCOME_UNRESOLVED: u8 = 254u8;
    const OUTCOME_CANCELLED: u8 = 255u8;

    const TOKEN_CONTRACT_TYPE: u8 = 1u8;
    const ORACLE_CONTRACT_TYPE: u8 = 2u8;
    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;

    // protocol_u8 keys
    const PARAM_MAX_OUTCOMES: u8 = 0u8;
    const PARAM_PROTOCOL_PAUSED: u8 = 1u8;

    // protocol_u64 keys
    const PARAM_FEE_BPS: u8 = 1u8;
    const PARAM_MIN_TRADE: u8 = 2u8;
    const PARAM_MIN_LIQUIDITY: u8 = 3u8;
    const PARAM_LP_FEE_SHARE_BPS: u8 = 5u8;
    const PARAM_MAX_MARKET_COLLATERAL: u8 = 6u8;

    const DEFAULT_MAX_OUTCOMES: u8 = 8u8;
    const DEFAULT_PROTOCOL_PAUSED: u8 = 0u8;
    const DEFAULT_FEE_BPS: u64 = 100u64;
    const DEFAULT_MIN_TRADE: u64 = 1000000u64;
    const DEFAULT_MIN_LIQUIDITY: u64 = 10000000u64; // 10 tokens minimum LP
    const DEFAULT_LP_FEE_SHARE_BPS: u64 = 8000u64;
    const DEFAULT_MAX_MARKET_COLLATERAL: u64 = 100000000000u64;

    const ADMIN: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;

    struct MarketInfo {
        creator: address,
        title_hash: field,
        category: u8,
        market_type: u8,
        outcome_count: u8,
        close_time: u64,
        resolution_time: u64,
        is_resolved: bool,
        winning_outcome: u8,
        resolved_by_oracle: bool,
        token_id: address,
    }

    // Pure FPMM pool
    // outcome_token_qty mapping tracks each outcome's token quantity
    // total_collateral = sum of all collateral ever deposited (LP + traders)
    // lp_collateral = LP deposits only, used for LP redemption at resolution
    struct PoolState {
        trader_count: u64,
        lp_count: u64,
        locked: bool,
        total_collateral: u64,
        lp_collateral: u64,
        lp_supply: u64,
        cumulative_volume: u64,
    }

    record BetPosition {
        owner: address,
        position_id: field,
        market_id: field,
        outcome: u8,
        shares: u64,         // outcome tokens held — redeems 1:1 at resolution
        collateral_in: u64,
        nonce: group,
    }

    record WinningsClaim {
        owner: address,
        market_id: field,
        payout_amount: u64,
        nullifier: field,
        nonce: group,
    }

    struct PositionState {
        holder_commitment: field,
        market_id: field,
        outcome: u8,
        shares: u64,
        collateral_in: u64,
        token_id: address,
        is_closed: bool,
    }

    struct PayoutClaim {
        amount: u64,
        token_id: address,
    }

    struct BuyQuoteComputation {
        fee: u64,
        net_collateral_in: u64,
        shares_out: u64,
        price_micro: u64,
    }

    struct SellQuoteComputation {
        fee: u64,
        gross_payout: u64,
        net_payout: u64,
    }

    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;
    mapping outcome_token_qty: field => u64;
    mapping outcome_token_supply: field => u64;

    mapping positions: field => PositionState;
    mapping lp_balances: field => u64;
    mapping market_fee_pool: field => u64;

    mapping market_winner_payout_pool: field => u64;
    mapping market_lp_return_pool: field => u64;

    mapping spent_nullifiers: field => bool;
    mapping spent_auth_ids: field => bool;
    mapping pending_payouts: field => PayoutClaim;

    mapping protocol_u8: u8 => u8;
    mapping protocol_u64: u8 => u64;
    mapping protocol_fees: address => u64;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    constructor() {}

    fn create_market(
        public title_hash: field,
        public category: u8,
        public market_type: u8,
        public outcome_count: u8,
        public close_time: u64,
        public resolution_time: u64,
        public token_id: address,
    ) -> Final {
        let auth_future: Final = veilmarkets_factory_build_v11.aleo::verify_is_registered(
            TOKEN_CONTRACT_TYPE, token_id,
        );
        let caller: address = self.caller;
        let market_id: field = BHP256::hash_to_field(title_hash + caller as field);
        return final {
            finalize_create_market(
                market_id, caller, title_hash, category, market_type,
                outcome_count, close_time, resolution_time, token_id, auth_future,
            );
        };
    }

    // FPMM buy: trader sends collateral, receives outcome tokens from pool
    // Pool keeps collateral, removes outcome tokens from its balance
    fn buy_shares(
        public market_id: field,
        public outcome: u8,
        public collateral_in: u64,
        public min_shares_out: u64,
        public expected_shares_out: u64,
        public position_id: field,
        public owner_commitment: field,
    ) -> (BetPosition, Final) {
        assert(min_shares_out > 0u64);
        assert(expected_shares_out > 0u64);
        assert(expected_shares_out >= min_shares_out);

        let position: BetPosition = BetPosition {
            owner: self.signer,
            position_id: position_id,
            market_id: market_id,
            outcome: outcome,
            shares: expected_shares_out,
            collateral_in: collateral_in,
            nonce: BHP256::hash_to_group(position_id),
        };

        let caller: address = self.caller;
        let owner: address = self.signer;
        let f: Final = final {
            finalize_buy_shares(
                market_id, outcome, collateral_in, min_shares_out,
                expected_shares_out, position_id, owner_commitment, owner, caller,
            );
        };
        return (position, f);
    }

    // FPMM fund_pool: LP deposits collateral, receives equal outcome tokens minted to pool
    // LP gets lp_shares proportional to deposit
    fn fund_pool(
        public market_id: field,
        public amount: u64,
        public lp_owner_key: field,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_fund_pool(market_id, amount, lp_owner_key, caller);
        };
    }

    fn sell_shares(
        private position: BetPosition,
        public shares_to_sell: u64,
        public min_payout: u64,
        public sell_nonce: field,
    ) -> (BetPosition, WinningsClaim, Final) {
        assert(shares_to_sell > 0u64);
        assert(position.shares >= shares_to_sell);

        let sold_collateral_preview: u64 = mul_div_u64(
            position.collateral_in, shares_to_sell, position.shares,
        );
        let remaining_shares: u64 = position.shares - shares_to_sell;
        let remaining_collateral: u64 = position.collateral_in - sold_collateral_preview;

        let updated_position: BetPosition = BetPosition {
            owner: position.owner,
            position_id: position.position_id,
            market_id: position.market_id,
            outcome: position.outcome,
            shares: remaining_shares,
            collateral_in: remaining_collateral,
            nonce: BHP256::hash_to_group(position.position_id + sell_nonce),
        };

        let nullifier: field = BHP256::hash_to_field(
            position.position_id + shares_to_sell as field + sell_nonce,
        );

        let claim: WinningsClaim = WinningsClaim {
            owner: position.owner,
            market_id: position.market_id,
            payout_amount: 0u64,
            nullifier: nullifier,
            nonce: BHP256::hash_to_group(nullifier),
        };

        let caller: address = self.caller;
        let position_id: field = position.position_id;
        let market_id: field = position.market_id;
        let position_outcome: u8 = position.outcome;
        let shares_before: u64 = position.shares;
        let collateral_before: u64 = position.collateral_in;
        let f: Final = final {
            finalize_sell_shares(
                position_id, market_id, position_outcome,
                shares_before, collateral_before, shares_to_sell,
                min_payout, remaining_shares, remaining_collateral,
                nullifier, caller,
            );
        };
        return (updated_position, claim, f);
    }

    fn claim_winnings(private position: BetPosition) -> (WinningsClaim, Final) {
        let owner_hash: field = BHP256::hash_to_field(position.owner);
        let nullifier: field = BHP256::hash_to_field(
            owner_hash + position.position_id + position.shares as field,
        );
        let claim: WinningsClaim = WinningsClaim {
            owner: position.owner,
            market_id: position.market_id,
            payout_amount: 0u64,
            nullifier: nullifier,
            nonce: BHP256::hash_to_group(nullifier),
        };
        let caller: address = self.caller;
        let position_id: field = position.position_id;
        let market_id: field = position.market_id;
        let position_outcome: u8 = position.outcome;
        let position_shares: u64 = position.shares;
        let position_collateral: u64 = position.collateral_in;
        let f: Final = final {
            finalize_claim_winnings(
                position_id, market_id, position_outcome,
                position_shares, position_collateral, nullifier, caller,
            );
        };
        return (claim, f);
    }

    fn withdraw_liquidity(
        public market_id: field,
        public lp_shares: u64,
        public min_payout: u64,
        public withdraw_nonce: field,
    ) -> (WinningsClaim, Final) {
        assert(lp_shares > 0u64);
        let lp_owner_key: field = self.caller as field;
        let nullifier: field = BHP256::hash_to_field(
            lp_owner_key + market_id + lp_shares as field + withdraw_nonce,
        );
        let claim: WinningsClaim = WinningsClaim {
            owner: self.signer,
            market_id: market_id,
            payout_amount: 0u64,
            nullifier: nullifier,
            nonce: BHP256::hash_to_group(nullifier),
        };
        let caller: address = self.caller;
        let f: Final = final {
            finalize_withdraw_liquidity(
                market_id, lp_shares, lp_owner_key, min_payout, nullifier, caller,
            );
        };
        return (claim, f);
    }

    fn verify_claim(public nullifier: field, public payout_amount: u64) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_verify_claim(nullifier, payout_amount, caller);
        };
    }

    fn authz_fee_withdrawal(
        public amount: u64,
        public authorization_id: field,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_authz_fee_withdrawal(amount, authorization_id, caller);
        };
    }

    fn resolve_market(
        public market_id: field,
        public winning_outcome: u8,
        public resolver: address,
    ) -> Final {
        assert(resolver != self.address);
        let caller: address = self.caller;
        let auth_future: Final = veilmarkets_factory_build_v11.aleo::verify_is_registered(
            ORACLE_CONTRACT_TYPE, caller,
        );
        return final {
            finalize_resolve_market(market_id, winning_outcome, auth_future);
        };
    }

    fn cancel_market(public market_id: field) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_cancel_market(market_id, caller);
        };
    }

    fn admin_set_pause(public paused: bool) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_admin_set_pause(paused, caller);
        };
    }

    fn set_protocol_u64(public param_key: u8, public value: u64) -> Final {
        let caller: address = self.caller;
        let auth: Final = veilmarkets_factory_build_v11.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE, caller,
        );
        return final {
            finalize_set_protocol_u64(param_key, value, auth);
        };
    }

    fn set_protocol_u8(public param_key: u8, public value: u8) -> Final {
        let caller: address = self.caller;
        let auth: Final = veilmarkets_factory_build_v11.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE, caller,
        );
        return final {
            finalize_set_protocol_u8(param_key, value, auth);
        };
    }
}

// ── Key derivation ─────────────────────────────────────────────────────────────

fn outcome_key(market_id: field, outcome: u8) -> field {
    return BHP256::hash_to_field(market_id + outcome as field);
}

fn lp_balance_key(market_id: field, lp_owner_key: field) -> field {
    return BHP256::hash_to_field(market_id + lp_owner_key);
}

// ── Math helpers ───────────────────────────────────────────────────────────────

fn mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
    assert(denom > 0u64);
    let result: u128 = (a as u128 * b as u128) / denom as u128;
    return result as u64;
}

// ── FPMM core formula ─────────────────────────────────────────────────────────

// FPMM buy: how many outcome tokens does trader receive?
// Constant product: qty_a * qty_b = k  (binary case)
// Generalized: product of all outcome quantities = k
//
// For binary:
//   k = qty_outcome * qty_other
//   new_qty_other = qty_other + net_collateral_in  (collateral enters pool as other-side liquidity)
//   new_qty_outcome = k / new_qty_other
//   tokens_out = qty_outcome - new_qty_outcome
//
// For multi-outcome (N outcomes), we use the binary approximation per pair:
//   tokens_out = qty_outcome * net_in / (total_other_qty + net_in)
//   where total_other_qty = sum of all OTHER outcome quantities
//

fn calc_fpmm_buy(
    qty_outcome: u64,
    total_other_qty: u64,
    net_collateral_in: u64,
) -> u64 {
    assert(total_other_qty > 0u64);
    let denom: u64 = total_other_qty + net_collateral_in;
    let tokens_out: u64 = mul_div_u64(qty_outcome, net_collateral_in, denom);
    return tokens_out;
}

fn calc_fpmm_sell(
    qty_outcome: u64,
    total_other_qty: u64,
    shares_to_sell: u64,
) -> u64 {
    let denom: u64 = qty_outcome + shares_to_sell;
    let collateral_out: u64 = mul_div_u64(total_other_qty, shares_to_sell, denom);
    return collateral_out;
}

fn compute_buy_quote_fpmm(
    qty_outcome: u64,
    total_other_qty: u64,
    collateral_in: u64,
    fee_bps: u64,
) -> BuyQuoteComputation {
    assert(fee_bps <= 10000u64);
    let fee: u64 = mul_div_u64(collateral_in, fee_bps, 10000u64);
    let net_collateral_in: u64 = collateral_in - fee;
    assert(net_collateral_in > 0u64);
    let shares_out: u64 = calc_fpmm_buy(qty_outcome, total_other_qty, net_collateral_in);
    assert(shares_out > 0u64);
    let price_micro: u64 = mul_div_u64(shares_out, 1000000u64, net_collateral_in);
    return BuyQuoteComputation {
        fee: fee,
        net_collateral_in: net_collateral_in,
        shares_out: shares_out,
        price_micro: price_micro,
    };
}

fn compute_sell_quote_fpmm(
    qty_outcome: u64,
    total_other_qty: u64,
    shares_to_sell: u64,
    fee_bps: u64,
) -> SellQuoteComputation {
    assert(fee_bps <= 10000u64);
    let gross_payout: u64 = calc_fpmm_sell(qty_outcome, total_other_qty, shares_to_sell);
    let fee: u64 = mul_div_u64(gross_payout, fee_bps, 10000u64);
    let net_payout: u64 = gross_payout - fee;
    return SellQuoteComputation {
        fee: fee,
        gross_payout: gross_payout,
        net_payout: net_payout,
    };
}

// ── Finalize functions ─────────────────────────────────────────────────────────

final fn finalize_create_market(
    market_id: field,
    creator: address,
    title_hash: field,
    category: u8,
    market_type: u8,
    outcome_count: u8,
    close_time: u64,
    resolution_time: u64,
    token_id: address,
    auth_future: Final,
) {
    auth_future.run();
    assert_protocol_not_paused();

    let exists: bool = Mapping::contains(markets, market_id);
    assert(!exists);
    assert(category <= 6u8);
    assert(market_type <= 1u8);

    let max_outcomes: u8 = Mapping::get_or_use(protocol_u8, PARAM_MAX_OUTCOMES, DEFAULT_MAX_OUTCOMES);
    assert(outcome_count >= 2u8);
    assert(outcome_count <= max_outcomes);
    if (market_type == 0u8) { assert_eq(outcome_count, 2u8); }
    assert(close_time > block.timestamp as u64);
    assert(resolution_time >= close_time);

    let market: MarketInfo = MarketInfo {
        creator: creator,
        title_hash: title_hash,
        category: category,
        market_type: market_type,
        outcome_count: outcome_count,
        close_time: close_time,
        resolution_time: resolution_time,
        is_resolved: false,
        winning_outcome: OUTCOME_UNRESOLVED,
        resolved_by_oracle: false,
        token_id: token_id,
    };

    let pool: PoolState = PoolState {
        trader_count: 0u64,
        lp_count: 0u64,
        locked: false,
        total_collateral: 0u64,
        lp_collateral: 0u64,
        lp_supply: 0u64,
        cumulative_volume: 0u64,
    };

    Mapping::set(markets, market_id, market);
    Mapping::set(pools, market_id, pool);
}

// FPMM fund_pool finalize:
// Distributes LP collateral equally across all outcome token quantities
// This initializes or deepens the market's constant product invariant
final fn finalize_fund_pool(
    market_id: field,
    amount: u64,
    lp_owner_key: field,
    caller: address,
) {
    assert_protocol_not_paused();

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert_eq(market.token_id, caller);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);

    let min_liquidity: u64 = Mapping::get_or_use(
        protocol_u64, PARAM_MIN_LIQUIDITY, DEFAULT_MIN_LIQUIDITY,
    );
    assert(amount >= min_liquidity);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    let max_collateral: u64 = Mapping::get_or_use(
        protocol_u64, PARAM_MAX_MARKET_COLLATERAL, DEFAULT_MAX_MARKET_COLLATERAL,
    );
    assert(pool.total_collateral + amount <= max_collateral);

    let per_outcome: u64 = amount / market.outcome_count as u64;
    assert(per_outcome > 0u64);

    let oc: u8 = market.outcome_count;
    let key0: field = outcome_key(market_id, 0u8);
    let key1: field = outcome_key(market_id, 1u8);
    let key2: field = outcome_key(market_id, 2u8);
    let key3: field = outcome_key(market_id, 3u8);
    let key4: field = outcome_key(market_id, 4u8);
    let key5: field = outcome_key(market_id, 5u8);
    let key6: field = outcome_key(market_id, 6u8);
    let key7: field = outcome_key(market_id, 7u8);

    // Update pool token quantities — tokens enter pool for each outcome
    if (oc > 0u8) { Mapping::set(outcome_token_qty, key0, Mapping::get_or_use(outcome_token_qty, key0, 0u64) + per_outcome); }
    if (oc > 1u8) { Mapping::set(outcome_token_qty, key1, Mapping::get_or_use(outcome_token_qty, key1, 0u64) + per_outcome); }
    if (oc > 2u8) { Mapping::set(outcome_token_qty, key2, Mapping::get_or_use(outcome_token_qty, key2, 0u64) + per_outcome); }
    if (oc > 3u8) { Mapping::set(outcome_token_qty, key3, Mapping::get_or_use(outcome_token_qty, key3, 0u64) + per_outcome); }
    if (oc > 4u8) { Mapping::set(outcome_token_qty, key4, Mapping::get_or_use(outcome_token_qty, key4, 0u64) + per_outcome); }
    if (oc > 5u8) { Mapping::set(outcome_token_qty, key5, Mapping::get_or_use(outcome_token_qty, key5, 0u64) + per_outcome); }
    if (oc > 6u8) { Mapping::set(outcome_token_qty, key6, Mapping::get_or_use(outcome_token_qty, key6, 0u64) + per_outcome); }
    if (oc > 7u8) { Mapping::set(outcome_token_qty, key7, Mapping::get_or_use(outcome_token_qty, key7, 0u64) + per_outcome); }

    // Update total supply — tracks cumulative LP mints per outcome
    // Used at resolution to compute outstanding_winner_tokens = supply - pool_qty
    if (oc > 0u8) { Mapping::set(outcome_token_supply, key0, Mapping::get_or_use(outcome_token_supply, key0, 0u64) + per_outcome); }
    if (oc > 1u8) { Mapping::set(outcome_token_supply, key1, Mapping::get_or_use(outcome_token_supply, key1, 0u64) + per_outcome); }
    if (oc > 2u8) { Mapping::set(outcome_token_supply, key2, Mapping::get_or_use(outcome_token_supply, key2, 0u64) + per_outcome); }
    if (oc > 3u8) { Mapping::set(outcome_token_supply, key3, Mapping::get_or_use(outcome_token_supply, key3, 0u64) + per_outcome); }
    if (oc > 4u8) { Mapping::set(outcome_token_supply, key4, Mapping::get_or_use(outcome_token_supply, key4, 0u64) + per_outcome); }
    if (oc > 5u8) { Mapping::set(outcome_token_supply, key5, Mapping::get_or_use(outcome_token_supply, key5, 0u64) + per_outcome); }
    if (oc > 6u8) { Mapping::set(outcome_token_supply, key6, Mapping::get_or_use(outcome_token_supply, key6, 0u64) + per_outcome); }
    if (oc > 7u8) { Mapping::set(outcome_token_supply, key7, Mapping::get_or_use(outcome_token_supply, key7, 0u64) + per_outcome); }

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count,
        lp_count: pool.lp_count + 1u64,
        locked: false,
        total_collateral: pool.total_collateral + amount,
        lp_collateral: pool.lp_collateral + amount,
        lp_supply: pool.lp_supply + amount,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);

    let balance_key: field = lp_balance_key(market_id, lp_owner_key);
    let current_balance: u64 = Mapping::get_or_use(lp_balances, balance_key, 0u64);
    Mapping::set(lp_balances, balance_key, current_balance + amount);
}

// FPMM buy_shares finalize:
// Trader sends collateral → receives outcome tokens from pool
// Pool qty of bought outcome decreases, total_collateral increases
final fn finalize_buy_shares(
    market_id: field,
    outcome: u8,
    collateral_in: u64,
    min_shares_out: u64,
    expected_shares_out: u64,
    position_id: field,
    owner_commitment: field,
    owner: address,
    caller: address,
) {
    assert_protocol_not_paused();

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert_eq(market.token_id, caller);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);
    assert(outcome < market.outcome_count);

    let min_trade: u64 = Mapping::get_or_use(protocol_u64, PARAM_MIN_TRADE, DEFAULT_MIN_TRADE);
    assert(collateral_in >= min_trade);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    // First-trade safety: ensure the pool has been seeded before the very first trade.
    // After initialization, pricing math handles all liquidity edge cases naturally.
    if (pool.lp_supply == 0u64) {
        let min_liquidity: u64 = Mapping::get_or_use(
            protocol_u64, PARAM_MIN_LIQUIDITY, DEFAULT_MIN_LIQUIDITY,
        );
        assert(pool.lp_collateral >= min_liquidity);
    }

    let max_collateral: u64 = Mapping::get_or_use(
        protocol_u64, PARAM_MAX_MARKET_COLLATERAL, DEFAULT_MAX_MARKET_COLLATERAL,
    );
    assert(pool.total_collateral + collateral_in <= max_collateral);

    let outcome_qty_key: field = outcome_key(market_id, outcome);
    let current_qty_outcome: u64 = Mapping::get_or_use(outcome_token_qty, outcome_qty_key, 0u64);
    assert(current_qty_outcome > 0u64);

    let k0: field = outcome_key(market_id, 0u8);
    let k1: field = outcome_key(market_id, 1u8);
    let k2: field = outcome_key(market_id, 2u8);
    let k3: field = outcome_key(market_id, 3u8);
    let k4: field = outcome_key(market_id, 4u8);
    let k5: field = outcome_key(market_id, 5u8);
    let k6: field = outcome_key(market_id, 6u8);
    let k7: field = outcome_key(market_id, 7u8);

    let q0: u64 = (market.outcome_count > 0u8 && outcome != 0u8) ? Mapping::get_or_use(outcome_token_qty, k0, 0u64) : 0u64;
    let q1: u64 = (market.outcome_count > 1u8 && outcome != 1u8) ? Mapping::get_or_use(outcome_token_qty, k1, 0u64) : 0u64;
    let q2: u64 = (market.outcome_count > 2u8 && outcome != 2u8) ? Mapping::get_or_use(outcome_token_qty, k2, 0u64) : 0u64;
    let q3: u64 = (market.outcome_count > 3u8 && outcome != 3u8) ? Mapping::get_or_use(outcome_token_qty, k3, 0u64) : 0u64;
    let q4: u64 = (market.outcome_count > 4u8 && outcome != 4u8) ? Mapping::get_or_use(outcome_token_qty, k4, 0u64) : 0u64;
    let q5: u64 = (market.outcome_count > 5u8 && outcome != 5u8) ? Mapping::get_or_use(outcome_token_qty, k5, 0u64) : 0u64;
    let q6: u64 = (market.outcome_count > 6u8 && outcome != 6u8) ? Mapping::get_or_use(outcome_token_qty, k6, 0u64) : 0u64;
    let q7: u64 = (market.outcome_count > 7u8 && outcome != 7u8) ? Mapping::get_or_use(outcome_token_qty, k7, 0u64) : 0u64;
    let total_other_qty: u64 = q0 + q1 + q2 + q3 + q4 + q5 + q6 + q7;
    assert(total_other_qty > 0u64);

    let fee_bps: u64 = Mapping::get_or_use(protocol_u64, PARAM_FEE_BPS, DEFAULT_FEE_BPS);
    let quote: BuyQuoteComputation = compute_buy_quote_fpmm(
        current_qty_outcome, total_other_qty, collateral_in, fee_bps,
    );

    let shares_out: u64 = quote.shares_out;
    let net_collateral_in: u64 = quote.net_collateral_in;
    let fee: u64 = quote.fee;

    assert(shares_out > 0u64);
    assert(shares_out >= min_shares_out);
    assert_eq(shares_out, expected_shares_out);

    // FPMM solvency invariant: cannot drain the pool
    assert(shares_out < current_qty_outcome);

    let expected_owner_commitment: field = BHP256::hash_to_field(owner as field + position_id);
    assert_eq(owner_commitment, expected_owner_commitment);
    let already_exists: bool = Mapping::contains(positions, position_id);
    assert(!already_exists);

    // Outcome tokens leave pool → qty decreases
    // Collateral enters pool → total_collateral increases
    // outcome_token_supply is NOT updated on buy/sell — it tracks LP mints only.
    // outstanding = supply - pool_qty is computed at resolution time.
    let new_qty_outcome: u64 = current_qty_outcome - shares_out;
    Mapping::set(outcome_token_qty, outcome_qty_key, new_qty_outcome);

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count + 1u64,
        lp_count: pool.lp_count,
        locked: false,
        total_collateral: pool.total_collateral + net_collateral_in,
        lp_collateral: pool.lp_collateral,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume + collateral_in,
    };
    Mapping::set(pools, market_id, updated_pool);

    let lp_fee_share_bps: u64 = Mapping::get_or_use(
        protocol_u64, PARAM_LP_FEE_SHARE_BPS, DEFAULT_LP_FEE_SHARE_BPS,
    );
    let lp_fee: u64 = mul_div_u64(fee, lp_fee_share_bps, 10000u64);
    let protocol_fee: u64 = fee - lp_fee;
    let accrued_lp: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);
    Mapping::set(market_fee_pool, market_id, accrued_lp + lp_fee);
    let accrued_proto: u64 = Mapping::get_or_use(protocol_fees, caller, 0u64);
    Mapping::set(protocol_fees, caller, accrued_proto + protocol_fee);

    let state: PositionState = PositionState {
        holder_commitment: owner_commitment,
        market_id: market_id,
        outcome: outcome,
        shares: shares_out,
        collateral_in: collateral_in,
        token_id: market.token_id,
        is_closed: false,
    };
    Mapping::set(positions, position_id, state);
}

// FPMM sell_shares finalize:
// Trader returns outcome tokens → receives collateral from pool
// Pool qty of sold outcome increases, total_collateral decreases
final fn finalize_sell_shares(
    position_id: field,
    market_id: field,
    outcome: u8,
    shares_before: u64,
    collateral_before: u64,
    shares_to_sell: u64,
    min_payout: u64,
    remaining_shares: u64,
    remaining_collateral: u64,
    nullifier: field,
    caller: address,
) {
    assert_protocol_not_paused();

    let spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
    assert(!spent);
    Mapping::set(spent_nullifiers, nullifier, true);

    let state: PositionState = Mapping::get(positions, position_id);
    assert(!state.is_closed);
    let expected_commitment: field = BHP256::hash_to_field(caller as field + position_id);
    assert_eq(state.holder_commitment, expected_commitment);
    assert_eq(state.market_id, market_id);
    assert_eq(state.outcome, outcome);
    assert_eq(state.shares, shares_before);
    assert_eq(state.collateral_in, collateral_before);
    assert(state.shares >= shares_to_sell);

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    let outcome_qty_key: field = outcome_key(market_id, outcome);
    let current_qty_outcome: u64 = Mapping::get_or_use(outcome_token_qty, outcome_qty_key, 0u64);
    let k0: field = outcome_key(market_id, 0u8);
    let k1: field = outcome_key(market_id, 1u8);
    let k2: field = outcome_key(market_id, 2u8);
    let k3: field = outcome_key(market_id, 3u8);
    let k4: field = outcome_key(market_id, 4u8);
    let k5: field = outcome_key(market_id, 5u8);
    let k6: field = outcome_key(market_id, 6u8);
    let k7: field = outcome_key(market_id, 7u8);
    let q0: u64 = (market.outcome_count > 0u8 && outcome != 0u8) ? Mapping::get_or_use(outcome_token_qty, k0, 0u64) : 0u64;
    let q1: u64 = (market.outcome_count > 1u8 && outcome != 1u8) ? Mapping::get_or_use(outcome_token_qty, k1, 0u64) : 0u64;
    let q2: u64 = (market.outcome_count > 2u8 && outcome != 2u8) ? Mapping::get_or_use(outcome_token_qty, k2, 0u64) : 0u64;
    let q3: u64 = (market.outcome_count > 3u8 && outcome != 3u8) ? Mapping::get_or_use(outcome_token_qty, k3, 0u64) : 0u64;
    let q4: u64 = (market.outcome_count > 4u8 && outcome != 4u8) ? Mapping::get_or_use(outcome_token_qty, k4, 0u64) : 0u64;
    let q5: u64 = (market.outcome_count > 5u8 && outcome != 5u8) ? Mapping::get_or_use(outcome_token_qty, k5, 0u64) : 0u64;
    let q6: u64 = (market.outcome_count > 6u8 && outcome != 6u8) ? Mapping::get_or_use(outcome_token_qty, k6, 0u64) : 0u64;
    let q7: u64 = (market.outcome_count > 7u8 && outcome != 7u8) ? Mapping::get_or_use(outcome_token_qty, k7, 0u64) : 0u64;
    let total_other_qty: u64 = q0 + q1 + q2 + q3 + q4 + q5 + q6 + q7;
    assert(total_other_qty > 0u64);

    let fee_bps: u64 = Mapping::get_or_use(protocol_u64, PARAM_FEE_BPS, DEFAULT_FEE_BPS);
    let quote: SellQuoteComputation = compute_sell_quote_fpmm(
        current_qty_outcome, total_other_qty, shares_to_sell, fee_bps,
    );

    let gross_payout: u64 = quote.gross_payout;
    let fee: u64 = quote.fee;
    let net_payout: u64 = quote.net_payout;

    assert(gross_payout > 0u64);
    assert(net_payout > 0u64);
    assert(net_payout >= min_payout);
    assert(pool.total_collateral >= gross_payout);

    let sold_collateral: u64 = mul_div_u64(state.collateral_in, shares_to_sell, state.shares);
    assert_eq(remaining_shares, state.shares - shares_to_sell);
    assert_eq(remaining_collateral, state.collateral_in - sold_collateral);

    // Outcome tokens return to pool → qty increases
    // Collateral leaves pool → total_collateral decreases
    let new_qty_outcome: u64 = current_qty_outcome + shares_to_sell;
    Mapping::set(outcome_token_qty, outcome_qty_key, new_qty_outcome);

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: false,
        total_collateral: pool.total_collateral - gross_payout,
        lp_collateral: pool.lp_collateral,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume + gross_payout,
    };
    Mapping::set(pools, market_id, updated_pool);

    let lp_fee_share_bps: u64 = Mapping::get_or_use(
        protocol_u64, PARAM_LP_FEE_SHARE_BPS, DEFAULT_LP_FEE_SHARE_BPS,
    );
    let lp_fee: u64 = mul_div_u64(fee, lp_fee_share_bps, 10000u64);
    let protocol_fee: u64 = fee - lp_fee;
    let accrued_lp: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);
    Mapping::set(market_fee_pool, market_id, accrued_lp + lp_fee);
    let accrued_proto: u64 = Mapping::get_or_use(protocol_fees, market.token_id, 0u64);
    Mapping::set(protocol_fees, market.token_id, accrued_proto + protocol_fee);

    let updated_state: PositionState = PositionState {
        holder_commitment: state.holder_commitment,
        market_id: state.market_id,
        outcome: state.outcome,
        shares: remaining_shares,
        collateral_in: remaining_collateral,
        token_id: state.token_id,
        is_closed: remaining_shares == 0u64,
    };
    Mapping::set(positions, position_id, updated_state);

    let claim: PayoutClaim = PayoutClaim {
        amount: net_payout,
        token_id: market.token_id,
    };
    Mapping::set(pending_payouts, nullifier, claim);
}

// FPMM claim_winnings:
// Winning shares pay exactly 1 unit of collateral each
// This is the fixed $1 redemption — pure FPMM settlement
final fn finalize_claim_winnings(
    position_id: field,
    market_id: field,
    outcome: u8,
    shares: u64,
    collateral_in: u64,
    nullifier: field,
    caller: address,
) {
    let spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
    assert(!spent);
    Mapping::set(spent_nullifiers, nullifier, true);

    let state: PositionState = Mapping::get(positions, position_id);
    assert(!state.is_closed);
    let expected_commitment: field = BHP256::hash_to_field(caller as field + position_id);
    assert_eq(state.holder_commitment, expected_commitment);
    assert_eq(state.market_id, market_id);
    assert_eq(state.outcome, outcome);
    assert_eq(state.shares, shares);
    assert_eq(state.collateral_in, collateral_in);
    assert(state.shares > 0u64);

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert(market.is_resolved);

    let is_cancelled: bool = market.winning_outcome == OUTCOME_CANCELLED;
    assert(is_cancelled || outcome == market.winning_outcome);

    // Pure FPMM: each winning share redeems exactly 1 unit of collateral.
    // Cancelled markets refund original gross collateral paid.
    let payout: u64 = is_cancelled ? state.collateral_in : state.shares;

    // Verify payout pool has sufficient funds
    let payout_pool: u64 = Mapping::get_or_use(market_winner_payout_pool, market_id, 0u64);
    assert(payout_pool >= payout);
    Mapping::set(market_winner_payout_pool, market_id, payout_pool - payout);

    let claim: PayoutClaim = PayoutClaim {
        amount: payout,
        token_id: market.token_id,
    };
    Mapping::set(pending_payouts, nullifier, claim);

    let closed: PositionState = PositionState {
        holder_commitment: state.holder_commitment,
        market_id: state.market_id,
        outcome: state.outcome,
        shares: 0u64,
        collateral_in: 0u64,
        token_id: state.token_id,
        is_closed: true,
    };
    Mapping::set(positions, position_id, closed);
}

// Resolution: lock pool, compute winner payout pool and LP return pool
// winner_payout_pool = qty of winning outcome tokens that left pool (= shares outstanding)
//   Each winner gets 1 collateral per share
// lp_return_pool = total_collateral - winner_payout_pool + accrued_fees
//   LPs get everything left over
final fn finalize_resolve_market(
    market_id: field,
    winning_outcome: u8,
    auth_future: Final,
) {
    auth_future.run();

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 >= market.resolution_time);
    assert(winning_outcome < market.outcome_count);

    let winner_key: field = outcome_key(market_id, winning_outcome);
    let total_winner_supply: u64 = Mapping::get_or_use(outcome_token_supply, winner_key, 0u64);
    let pool_winner_qty: u64 = Mapping::get_or_use(outcome_token_qty, winner_key, 0u64);

 
    assert(pool_winner_qty <= total_winner_supply);

    // Outstanding = tokens held by traders = LP-minted supply minus what remains in pool.
    // Each outstanding token redeems 1 unit of collateral at resolution.
    // If nobody bought the winning outcome, outstanding = 0 and LPs keep everything.
    let outstanding_winner_tokens: u64 = total_winner_supply - pool_winner_qty;
    let winner_payout_pool: u64 = outstanding_winner_tokens;

    let pool: PoolState = Mapping::get(pools, market_id);

    // Pool must have enough real collateral to cover all winner payouts.
    // Violation here would indicate an accounting error in buy/sell logic.
    assert(pool.total_collateral >= winner_payout_pool);

    // Everything not owed to winners goes to LPs (principal + loser collateral + fees).
    let lp_return_pool: u64 = pool.total_collateral - winner_payout_pool;

    Mapping::set(market_winner_payout_pool, market_id, winner_payout_pool);
    Mapping::set(market_lp_return_pool, market_id, lp_return_pool);

    market.is_resolved = true;
    market.winning_outcome = winning_outcome;
    market.resolved_by_oracle = true;
    Mapping::set(markets, market_id, market);

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: true,
        total_collateral: pool.total_collateral,
        lp_collateral: pool.lp_collateral,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);
}

// LP withdrawal after resolution
// LPs receive proportional share of lp_return_pool + market_fee_pool
final fn finalize_withdraw_liquidity(
    market_id: field,
    lp_shares: u64,
    lp_owner_key: field,
    min_payout: u64,
    nullifier: field,
    caller: address,
) {
    let spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
    assert(!spent);
    Mapping::set(spent_nullifiers, nullifier, true);

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert(market.is_resolved);

    let expected_owner_key: field = caller as field;
    assert_eq(expected_owner_key, lp_owner_key);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(pool.lp_supply > 0u64);
    assert(pool.lp_supply >= lp_shares);

    let balance_key: field = lp_balance_key(market_id, lp_owner_key);
    let lp_balance: u64 = Mapping::get_or_use(lp_balances, balance_key, 0u64);
    assert(lp_balance >= lp_shares);

    let lp_return_pool: u64 = Mapping::get_or_use(market_lp_return_pool, market_id, 0u64);
    let fee_pool: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);

    let principal_payout: u64 = mul_div_u64(lp_shares, lp_return_pool, pool.lp_supply);
    let fee_payout: u64 = mul_div_u64(lp_shares, fee_pool, pool.lp_supply);
    let total_payout: u64 = principal_payout + fee_payout;

    assert(total_payout > 0u64);
    assert(total_payout >= min_payout);

    Mapping::set(lp_balances, balance_key, lp_balance - lp_shares);
    Mapping::set(market_lp_return_pool, market_id, lp_return_pool - principal_payout);
    Mapping::set(market_fee_pool, market_id, fee_pool - fee_payout);

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: pool.locked,
        total_collateral: pool.total_collateral - total_payout,
        lp_collateral: pool.lp_collateral,
        lp_supply: pool.lp_supply - lp_shares,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);

    let claim: PayoutClaim = PayoutClaim {
        amount: total_payout,
        token_id: market.token_id,
    };
    Mapping::set(pending_payouts, nullifier, claim);
}

final fn finalize_cancel_market(market_id: field, caller: address) {
    assert_protocol_not_paused();

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert_eq(market.creator, caller);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert_eq(pool.total_collateral, 0u64);
    assert_eq(pool.lp_collateral, 0u64);

    market.is_resolved = true;
    market.winning_outcome = OUTCOME_CANCELLED;
    market.resolved_by_oracle = false;
    Mapping::set(markets, market_id, market);

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: true,
        total_collateral: 0u64,
        lp_collateral: 0u64,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);
}

final fn finalize_verify_claim(nullifier: field, payout_amount: u64, caller: address) {
    let stored: PayoutClaim = Mapping::get(pending_payouts, nullifier);
    assert_eq(stored.amount, payout_amount);
    assert_eq(stored.token_id, caller);
    let consumed: PayoutClaim = PayoutClaim { amount: 0u64, token_id: caller };
    Mapping::set(pending_payouts, nullifier, consumed);
}

final fn finalize_authz_fee_withdrawal(
    amount: u64,
    authorization_id: field,
    caller: address,
) {
    let spent: bool = Mapping::get_or_use(spent_auth_ids, authorization_id, false);
    assert(!spent);
    Mapping::set(spent_auth_ids, authorization_id, true);

    let accrued: u64 = Mapping::get_or_use(protocol_fees, caller, 0u64);
    assert(accrued >= amount);
    Mapping::set(protocol_fees, caller, accrued - amount);
}

final fn finalize_admin_set_pause(paused: bool, caller: address) {
    assert_eq(caller, ADMIN);
    let flag: u8 = paused ? 1u8 : 0u8;
    Mapping::set(protocol_u8, PARAM_PROTOCOL_PAUSED, flag);
}

final fn finalize_set_protocol_u64(param_key: u8, value: u64, auth: Final) {
    auth.run();
    if (param_key == PARAM_FEE_BPS) { assert(value <= 2000u64); }
    if (param_key == PARAM_MIN_TRADE) { assert(value >= 1u64); }
    if (param_key == PARAM_MIN_LIQUIDITY) { assert(value >= 1u64); }
    if (param_key == PARAM_LP_FEE_SHARE_BPS) { assert(value <= 10000u64); }
    if (param_key == PARAM_MAX_MARKET_COLLATERAL) { assert(value > 0u64); }
    Mapping::set(protocol_u64, param_key, value);
}

final fn finalize_set_protocol_u8(param_key: u8, value: u8, auth: Final) {
    auth.run();
    if (param_key == PARAM_MAX_OUTCOMES) { assert(value >= 2u8); assert(value <= 8u8); }
    if (param_key == PARAM_PROTOCOL_PAUSED) { assert(value <= 1u8); }
    Mapping::set(protocol_u8, param_key, value);
}

final fn assert_protocol_not_paused() {
    let flag: u8 = Mapping::get_or_use(protocol_u8, PARAM_PROTOCOL_PAUSED, DEFAULT_PROTOCOL_PAUSED);
    assert(flag == 0u8);
}
