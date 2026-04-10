// VeilMarkets Core (v10)
// Privacy-hardened share-trading engine with governance-bound risk controls.
import veilmarkets_factory_v10.aleo;

program veilmarkets_core_v10.aleo {
    const OUTCOME_UNRESOLVED: u8 = 254u8;
    const OUTCOME_CANCELLED: u8 = 255u8;

    const TOKEN_CONTRACT_TYPE: u8 = 1u8;
    const ORACLE_CONTRACT_TYPE: u8 = 2u8;
    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;

    // protocol_u8 keys
    const PARAM_MAX_OUTCOMES: u8 = 0u8;
    const PARAM_PROTOCOL_PAUSED: u8 = 1u8; // 0 = unpaused, 1 = paused

    // protocol_u64 keys
    const PARAM_FEE_BPS: u8 = 1u8;
    const PARAM_MIN_TRADE: u8 = 2u8;
    const PARAM_MIN_LIQUIDITY: u8 = 3u8;
    const PARAM_VIRTUAL_LIQ: u8 = 4u8;
    const PARAM_LP_FEE_SHARE_BPS: u8 = 5u8;
    const PARAM_MAX_MARKET_COLLATERAL: u8 = 6u8;

    const DEFAULT_MAX_OUTCOMES: u8 = 32u8;
    const DEFAULT_PROTOCOL_PAUSED: u8 = 0u8;
    const DEFAULT_FEE_BPS: u64 = 100u64; // 1%
    const DEFAULT_MIN_TRADE: u64 = 1000000u64;
    const DEFAULT_MIN_LIQUIDITY: u64 = 1000000u64;
    const DEFAULT_VIRTUAL_LIQ: u64 = 10000000u64;
    const DEFAULT_LP_FEE_SHARE_BPS: u64 = 8000u64;
    // 100,000 tokens with 6-decimal rails by default.
    const DEFAULT_MAX_MARKET_COLLATERAL: u64 = 100000000000u64;
    const LP_FEE_INDEX_SCALE: u128 = 1000000000000u128; // 1e12 fixed-point scale

    const ADMIN: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;

    struct MarketInfo {
        creator: address,
        title_hash: field,
        category: u8,
        market_type: u8, // 0 binary, 1 categorical
        outcome_count: u8, // 2..protocol max (default 32)
        close_time: u64,
        resolution_time: u64,
        is_resolved: bool,
        winning_outcome: u8,
        resolved_by_oracle: bool,
        token_id: address,
    }

    // Compatibility cache for older UI readers.
    // Authoritative per-outcome values are in `outcome_exposure` and `outcome_share_supply`.
    struct PoolState {
        total_outcome_0: u64,
        total_outcome_1: u64,
        total_outcome_2: u64,
        total_outcome_3: u64,
        total_outcome_4: u64,
        total_outcome_5: u64,
        total_outcome_6: u64,
        total_outcome_7: u64,
        trader_count: u64,
        lp_count: u64,
        locked: bool,
        trading_collateral: u64,
        lp_collateral: u64,
        total_collateral: u64,
        total_shares: u64,
        lp_supply: u64,
        cumulative_volume: u64,
    }

    record BetPosition {
        owner: address,
        position_id: field,
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field,
        shares: u64,
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
    }

    struct SellQuoteComputation {
        fee: u64,
        gross_payout: u64,
        net_payout: u64,
    }

    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;

    // Dynamic market state.
    mapping outcome_exposure: field => u64; // key = BHP256::hash_to_field(market_id + outcome_idx)
    mapping outcome_share_supply: field => u64; // key = BHP256::hash_to_field(market_id + outcome_idx)

    // Positions and ownership.
    mapping positions: field => PositionState; // key = position_id

    // LP accounting.
    mapping lp_balances: field => u64; // key = hash(market_id + lp_owner_key)
    mapping market_fee_pool: field => u64; // market_id => accrued LP fees
    mapping lp_fee_index: field => u128; // market_id => cumulative fee index
    mapping lp_fee_checkpoint: field => u128; // key = hash(market_id + lp_owner_key) => index checkpoint
    mapping lp_pending_fees: field => u64; // key = hash(market_id + lp_owner_key) => settled claimable LP fees
    mapping market_winner_supply_snapshot: field => u64; // market_id => winner supply at resolution
    mapping market_winner_payout_remaining: field => u64; // market_id => remaining winner payouts
    mapping market_lp_trading_surplus: field => u64; // market_id => loser collateral distributable to LPs

    // Claims.
    mapping spent_nullifiers: field => bool;
    mapping pending_payouts: field => PayoutClaim; // nullifier/authorization_id => payout/token contract

    // Protocol params + treasury accounting.
    mapping protocol_u8: u8 => u8;
    mapping protocol_u64: u8 => u64;
    mapping protocol_fees: address => u64; // token adapter address => accrued protocol fees

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
        let auth_future: Final = veilmarkets_factory_v10.aleo::verify_is_registered(
            TOKEN_CONTRACT_TYPE,
            token_id,
        );
        let caller: address = self.caller;
        let market_id: field = BHP256::hash_to_field(title_hash + caller as field);
        return final {
            finalize_create_market(
                market_id,
                caller,
                title_hash,
                category,
                market_type,
                outcome_count,
                close_time,
                resolution_time,
                token_id,
                auth_future,
            );
        };
    }

    fn buy_shares(
        public market_id: field,
        public outcome: u8,
        public collateral_in: u64,
        public min_shares_out: u64,
        public expected_net_collateral_in: u64,
        public expected_shares_out: u64,
        public position_id: field,
        public owner_commitment: field,
    ) -> (BetPosition, Final) {
        assert(min_shares_out > 0u64);
        assert(expected_net_collateral_in > 0u64);
        assert(expected_shares_out > 0u64);

        let position: BetPosition = BetPosition {
            owner: self.signer,
            position_id: position_id,
            market_id: market_id,
            outcome: outcome,
            amount: expected_net_collateral_in,
            escrow_id: position_id,
            shares: expected_shares_out,
            collateral_in: expected_net_collateral_in,
            nonce: BHP256::hash_to_group(position_id),
        };

        let caller: address = self.caller;
        let owner: address = self.signer;
        let f: Final = final {
            finalize_buy_shares(
                market_id,
                outcome,
                collateral_in,
                min_shares_out,
                expected_net_collateral_in,
                expected_shares_out,
                position_id,
                owner_commitment,
                owner,
                caller,
            );
        };
        return (position, f);
    }

    fn fund_pool(
        public market_id: field,
        public amount: u64,
        public lp_owner_key: field,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_fund_pool(
                market_id,
                amount,
                lp_owner_key,
                caller,
            );
        };
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
                market_id,
                lp_shares,
                lp_owner_key,
                min_payout,
                nullifier,
                caller,
            );
        };
        return (claim, f);
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
            position.collateral_in,
            shares_to_sell,
            position.shares,
        );
        let remaining_shares: u64 = position.shares - shares_to_sell;
        let remaining_collateral: u64 = position.collateral_in - sold_collateral_preview;

        let updated_position: BetPosition = BetPosition {
            owner: position.owner,
            position_id: position.position_id,
            market_id: position.market_id,
            outcome: position.outcome,
            amount: remaining_collateral,
            escrow_id: position.escrow_id,
            shares: remaining_shares,
            collateral_in: remaining_collateral,
            nonce: BHP256::hash_to_group(position.escrow_id + sell_nonce),
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
        let outcome: u8 = position.outcome;
        let shares_before: u64 = position.shares;
        let collateral_before: u64 = position.collateral_in;

        let f: Final = final {
            finalize_sell_shares(
                position_id,
                market_id,
                outcome,
                shares_before,
                collateral_before,
                shares_to_sell,
                min_payout,
                remaining_shares,
                remaining_collateral,
                nullifier,
                caller,
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
        let outcome: u8 = position.outcome;
        let shares: u64 = position.shares;
        let collateral_in: u64 = position.collateral_in;

        let f: Final = final {
            finalize_claim_winnings(
                position_id,
                market_id,
                outcome,
                shares,
                collateral_in,
                nullifier,
                caller,
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
        let auth_future: Final = veilmarkets_factory_v10.aleo::verify_is_registered(
            TOKEN_CONTRACT_TYPE,
            caller,
        );
        return final {
            finalize_authz_fee_withdrawal(
                amount,
                authorization_id,
                caller,
                auth_future,
            );
        };
    }

    fn resolve_market(
        public market_id: field,
        public winning_outcome: u8,
        public resolver: address,
    ) -> Final {
        assert(resolver != self.address);
        let caller: address = self.caller;
        let auth_future: Final = veilmarkets_factory_v10.aleo::verify_is_registered(
            ORACLE_CONTRACT_TYPE,
            caller,
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
        let auth: Final = veilmarkets_factory_v10.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            caller,
        );
        return final {
            finalize_set_protocol_u64(param_key, value, auth);
        };
    }

    fn set_protocol_u8(public param_key: u8, public value: u8) -> Final {
        let caller: address = self.caller;
        let auth: Final = veilmarkets_factory_v10.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            caller,
        );
        return final {
            finalize_set_protocol_u8(param_key, value, auth);
        };
    }
}

fn outcome_key(market_id: field, outcome: u8) -> field {
    return BHP256::hash_to_field(market_id + outcome as field);
}

fn lp_balance_key(market_id: field, lp_owner_key: field) -> field {
    return BHP256::hash_to_field(market_id + lp_owner_key);
}

fn mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
    assert(denom > 0u64);
    let a128: u128 = a as u128;
    let b128: u128 = b as u128;
    let d128: u128 = denom as u128;
    let result: u128 = (a128 * b128) / d128;
    return result as u64;
}

fn calc_total_liquidity(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
) -> u64 {
    let oc: u64 = outcome_count as u64;
    return pool_collateral + (virtual_liq * oc);
}

fn calc_outcome_liquidity(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure_value: u64,
) -> u64 {
    let oc: u64 = outcome_count as u64;
    let base_liq: u64 = (pool_collateral / oc) + virtual_liq;
    return base_liq + outcome_exposure_value;
}

fn calc_buy_shares(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure_value: u64,
    net_collateral_in: u64,
) -> u64 {
    let total_liq: u64 = calc_total_liquidity(pool_collateral, outcome_count, virtual_liq);
    let outcome_liq: u64 = calc_outcome_liquidity(
        pool_collateral,
        outcome_count,
        virtual_liq,
        outcome_exposure_value,
    );
    let raw_shares: u64 = mul_div_u64(net_collateral_in, total_liq, outcome_liq);
    return raw_shares;
}

fn calc_sell_payout(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure_value: u64,
    shares_to_sell: u64,
) -> u64 {
    let total_liq: u64 = calc_total_liquidity(pool_collateral, outcome_count, virtual_liq);
    let outcome_liq: u64 = calc_outcome_liquidity(
        pool_collateral,
        outcome_count,
        virtual_liq,
        outcome_exposure_value,
    );
    return mul_div_u64(shares_to_sell, outcome_liq, total_liq);
}

fn compute_buy_quote(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure_value: u64,
    collateral_in: u64,
    fee_bps: u64,
) -> BuyQuoteComputation {
    assert(fee_bps <= 10000u64);
    let fee: u64 = mul_div_u64(collateral_in, fee_bps, 10000u64);
    let net_collateral_in: u64 = collateral_in - fee;
    assert(net_collateral_in > 0u64);
    let shares_out: u64 = calc_buy_shares(
        pool_collateral,
        outcome_count,
        virtual_liq,
        outcome_exposure_value,
        net_collateral_in,
    );
    return BuyQuoteComputation {
        fee: fee,
        net_collateral_in: net_collateral_in,
        shares_out: shares_out,
    };
}

fn compute_sell_quote(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure_value: u64,
    shares_to_sell: u64,
    fee_bps: u64,
) -> SellQuoteComputation {
    assert(fee_bps <= 10000u64);
    let gross_payout: u64 = calc_sell_payout(
        pool_collateral,
        outcome_count,
        virtual_liq,
        outcome_exposure_value,
        shares_to_sell,
    );
    let fee: u64 = mul_div_u64(gross_payout, fee_bps, 10000u64);
    let net_payout: u64 = gross_payout - fee;
    return SellQuoteComputation {
        fee: fee,
        gross_payout: gross_payout,
        net_payout: net_payout,
    };
}

final fn accrue_lp_fee_index(market_id: field, lp_supply: u64, lp_fee_share: u64) {
    if (lp_supply > 0u64 && lp_fee_share > 0u64) {
        let current_index: u128 = Mapping::get_or_use(lp_fee_index, market_id, 0u128);
        let increment: u128 =
            ((lp_fee_share as u128) * LP_FEE_INDEX_SCALE) / (lp_supply as u128);
        Mapping::set(lp_fee_index, market_id, current_index + increment);
    }
}

final fn settle_lp_fee_accrual(
    market_id: field,
    owner_balance_key: field,
    owner_lp_balance: u64,
) {
    let current_index: u128 = Mapping::get_or_use(lp_fee_index, market_id, 0u128);
    let checkpoint: u128 = Mapping::get_or_use(
        lp_fee_checkpoint,
        owner_balance_key,
        current_index,
    );

    if (current_index > checkpoint && owner_lp_balance > 0u64) {
        let delta_index: u128 = current_index - checkpoint;
        let accrued_u128: u128 = ((owner_lp_balance as u128) * delta_index)
            / LP_FEE_INDEX_SCALE;
        let accrued_fees: u64 = accrued_u128 as u64;
        if (accrued_fees > 0u64) {
            let market_fees: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);
            assert(market_fees >= accrued_fees);
            Mapping::set(market_fee_pool, market_id, market_fees - accrued_fees);

            let pending_fees: u64 = Mapping::get_or_use(
                lp_pending_fees,
                owner_balance_key,
                0u64,
            );
            Mapping::set(lp_pending_fees, owner_balance_key, pending_fees + accrued_fees);
        }
    }

    Mapping::set(lp_fee_checkpoint, owner_balance_key, current_index);
}

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

    let max_outcomes: u8 = Mapping::get_or_use(
        protocol_u8,
        PARAM_MAX_OUTCOMES,
        DEFAULT_MAX_OUTCOMES,
    );
    assert(max_outcomes >= 2u8);
    assert(max_outcomes <= 32u8);
    assert(outcome_count >= 2u8);
    assert(outcome_count <= max_outcomes);
    if (market_type == 0u8) {
        assert_eq(outcome_count, 2u8);
    }

    assert(close_time > block.timestamp as u64);
    assert(resolution_time > close_time);

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
        total_outcome_0: 0u64,
        total_outcome_1: 0u64,
        total_outcome_2: 0u64,
        total_outcome_3: 0u64,
        total_outcome_4: 0u64,
        total_outcome_5: 0u64,
        total_outcome_6: 0u64,
        total_outcome_7: 0u64,
        trader_count: 0u64,
        lp_count: 0u64,
        locked: false,
        trading_collateral: 0u64,
        lp_collateral: 0u64,
        total_collateral: 0u64,
        total_shares: 0u64,
        lp_supply: 0u64,
        cumulative_volume: 0u64,
    };

    Mapping::set(markets, market_id, market);
    Mapping::set(pools, market_id, pool);
}

final fn finalize_buy_shares(
    market_id: field,
    outcome: u8,
    collateral_in: u64,
    min_shares_out: u64,
    expected_net_collateral_in: u64,
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

    let min_trade: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_MIN_TRADE,
        DEFAULT_MIN_TRADE,
    );
    assert(collateral_in >= min_trade);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    let exposure_key: field = outcome_key(market_id, outcome);
    let current_exposure: u64 = Mapping::get_or_use(outcome_exposure, exposure_key, 0u64);
    let current_supply: u64 = Mapping::get_or_use(outcome_share_supply, exposure_key, 0u64);

    let virtual_liq: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_VIRTUAL_LIQ,
        DEFAULT_VIRTUAL_LIQ,
    );
    assert(virtual_liq > 0u64);
    let fee_bps: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_FEE_BPS,
        DEFAULT_FEE_BPS,
    );
    let quote: BuyQuoteComputation = compute_buy_quote(
        // Pricing uses trading collateral (not LP principal) to preserve 1-unit winner redemption solvency
        // without consuming LP principal.
        pool.trading_collateral,
        market.outcome_count,
        virtual_liq,
        current_exposure,
        collateral_in,
        fee_bps,
    );
    let shares_out: u64 = quote.shares_out;
    let net_collateral_in: u64 = quote.net_collateral_in;
    let fee: u64 = quote.fee;
    assert(shares_out > 0u64);
    assert(shares_out >= min_shares_out);
    assert_eq(expected_net_collateral_in, net_collateral_in);
    assert_eq(expected_shares_out, shares_out);

    let expected_owner_commitment: field =
        BHP256::hash_to_field(owner as field + position_id);
    assert_eq(owner_commitment, expected_owner_commitment);
    let already_exists: bool = Mapping::contains(positions, position_id);
    assert(!already_exists);

    let max_market_collateral: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_MAX_MARKET_COLLATERAL,
        DEFAULT_MAX_MARKET_COLLATERAL,
    );
    assert(max_market_collateral > 0u64);
    assert(pool.total_collateral + net_collateral_in <= max_market_collateral);

    let new_trading_collateral: u64 = pool.trading_collateral + net_collateral_in;
    let new_exposure: u64 = current_exposure + net_collateral_in;
    let new_supply: u64 = current_supply + shares_out;
    // Fixed 1-unit winner redemption requires winner-side supply solvency.
    assert(new_supply <= new_trading_collateral);
    Mapping::set(outcome_exposure, exposure_key, new_exposure);
    Mapping::set(outcome_share_supply, exposure_key, new_supply);

    let new_total_0: u64 =
        (outcome == 0u8) ? new_exposure : pool.total_outcome_0;
    let new_total_1: u64 =
        (outcome == 1u8) ? new_exposure : pool.total_outcome_1;
    let new_total_2: u64 =
        (outcome == 2u8) ? new_exposure : pool.total_outcome_2;
    let new_total_3: u64 =
        (outcome == 3u8) ? new_exposure : pool.total_outcome_3;
    let new_total_4: u64 =
        (outcome == 4u8) ? new_exposure : pool.total_outcome_4;
    let new_total_5: u64 =
        (outcome == 5u8) ? new_exposure : pool.total_outcome_5;
    let new_total_6: u64 =
        (outcome == 6u8) ? new_exposure : pool.total_outcome_6;
    let new_total_7: u64 =
        (outcome == 7u8) ? new_exposure : pool.total_outcome_7;

    let updated_pool: PoolState = PoolState {
        total_outcome_0: new_total_0,
        total_outcome_1: new_total_1,
        total_outcome_2: new_total_2,
        total_outcome_3: new_total_3,
        total_outcome_4: new_total_4,
        total_outcome_5: new_total_5,
        total_outcome_6: new_total_6,
        total_outcome_7: new_total_7,
        trader_count: pool.trader_count + 1u64,
        lp_count: pool.lp_count,
        locked: pool.locked,
        trading_collateral: new_trading_collateral,
        lp_collateral: pool.lp_collateral,
        total_collateral: new_trading_collateral + pool.lp_collateral,
        total_shares: pool.total_shares + shares_out,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume + net_collateral_in,
    };
    Mapping::set(pools, market_id, updated_pool);

    let lp_fee_share_bps: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_LP_FEE_SHARE_BPS,
        DEFAULT_LP_FEE_SHARE_BPS,
    );
    assert(lp_fee_share_bps <= 10000u64);
    let raw_lp_fee_share: u64 = mul_div_u64(fee, lp_fee_share_bps, 10000u64);
    let effective_lp_fee_share: u64 = pool.lp_supply > 0u64 ? raw_lp_fee_share : 0u64;
    let protocol_fee_share: u64 = fee - effective_lp_fee_share;
    if (effective_lp_fee_share > 0u64) {
        let accrued_lp_fee: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);
        Mapping::set(market_fee_pool, market_id, accrued_lp_fee + effective_lp_fee_share);
        accrue_lp_fee_index(market_id, pool.lp_supply, effective_lp_fee_share);
    }
    let accrued_protocol_fee: u64 = Mapping::get_or_use(protocol_fees, caller, 0u64);
    Mapping::set(protocol_fees, caller, accrued_protocol_fee + protocol_fee_share);

    let state: PositionState = PositionState {
        holder_commitment: owner_commitment,
        market_id: market_id,
        outcome: outcome,
        shares: shares_out,
        collateral_in: net_collateral_in,
        token_id: market.token_id,
        is_closed: false,
    };
    Mapping::set(positions, position_id, state);
}

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
        protocol_u64,
        PARAM_MIN_LIQUIDITY,
        DEFAULT_MIN_LIQUIDITY,
    );
    assert(amount >= min_liquidity);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    let balance_key: field = lp_balance_key(market_id, lp_owner_key);
    let current_lp_balance: u64 = Mapping::get_or_use(lp_balances, balance_key, 0u64);
    settle_lp_fee_accrual(market_id, balance_key, current_lp_balance);

    let max_market_collateral: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_MAX_MARKET_COLLATERAL,
        DEFAULT_MAX_MARKET_COLLATERAL,
    );
    assert(max_market_collateral > 0u64);
    assert(pool.total_collateral + amount <= max_market_collateral);

    let new_lp_collateral: u64 = pool.lp_collateral + amount;
    let is_new_lp: bool = current_lp_balance == 0u64;
    let updated_pool: PoolState = PoolState {
        total_outcome_0: pool.total_outcome_0,
        total_outcome_1: pool.total_outcome_1,
        total_outcome_2: pool.total_outcome_2,
        total_outcome_3: pool.total_outcome_3,
        total_outcome_4: pool.total_outcome_4,
        total_outcome_5: pool.total_outcome_5,
        total_outcome_6: pool.total_outcome_6,
        total_outcome_7: pool.total_outcome_7,
        trader_count: pool.trader_count,
        lp_count: is_new_lp ? pool.lp_count + 1u64 : pool.lp_count,
        locked: pool.locked,
        trading_collateral: pool.trading_collateral,
        lp_collateral: new_lp_collateral,
        total_collateral: pool.trading_collateral + new_lp_collateral,
        total_shares: pool.total_shares,
        lp_supply: pool.lp_supply + amount,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);

    Mapping::set(lp_balances, balance_key, current_lp_balance + amount);
}

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
    let expected_holder_commitment: field =
        BHP256::hash_to_field(caller as field + position_id);
    assert_eq(state.holder_commitment, expected_holder_commitment);
    assert_eq(state.market_id, market_id);
    assert_eq(state.outcome, outcome);
    assert_eq(state.shares, shares_before);
    assert_eq(state.collateral_in, collateral_before);
    assert(state.shares >= shares_to_sell);

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert_eq(market.token_id, caller);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    let exposure_key: field = outcome_key(market_id, outcome);
    let current_exposure: u64 = Mapping::get_or_use(outcome_exposure, exposure_key, 0u64);
    let current_supply: u64 = Mapping::get_or_use(outcome_share_supply, exposure_key, 0u64);
    assert(current_supply >= shares_to_sell);

    let virtual_liq: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_VIRTUAL_LIQ,
        DEFAULT_VIRTUAL_LIQ,
    );
    assert(virtual_liq > 0u64);
    let fee_bps: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_FEE_BPS,
        DEFAULT_FEE_BPS,
    );

    let quote: SellQuoteComputation = compute_sell_quote(
        // Keep sell pricing consistent with buy-side solvency model (trading collateral only).
        pool.trading_collateral,
        market.outcome_count,
        virtual_liq,
        current_exposure,
        shares_to_sell,
        fee_bps,
    );
    let gross_payout: u64 = quote.gross_payout;
    let fee: u64 = quote.fee;
    let net_payout: u64 = quote.net_payout;
    assert(gross_payout > 0u64);
    assert(net_payout > 0u64);
    assert(net_payout >= min_payout);

    assert(current_exposure >= gross_payout);
    assert(pool.trading_collateral >= gross_payout);
    assert(pool.total_shares >= shares_to_sell);

    let new_exposure: u64 = current_exposure - gross_payout;
    let new_supply: u64 = current_supply - shares_to_sell;
    let new_trading_collateral: u64 = pool.trading_collateral - gross_payout;
    assert(new_supply <= new_trading_collateral);
    Mapping::set(outcome_exposure, exposure_key, new_exposure);
    Mapping::set(outcome_share_supply, exposure_key, new_supply);

    let new_total_0: u64 =
        (outcome == 0u8) ? new_exposure : pool.total_outcome_0;
    let new_total_1: u64 =
        (outcome == 1u8) ? new_exposure : pool.total_outcome_1;
    let new_total_2: u64 =
        (outcome == 2u8) ? new_exposure : pool.total_outcome_2;
    let new_total_3: u64 =
        (outcome == 3u8) ? new_exposure : pool.total_outcome_3;
    let new_total_4: u64 =
        (outcome == 4u8) ? new_exposure : pool.total_outcome_4;
    let new_total_5: u64 =
        (outcome == 5u8) ? new_exposure : pool.total_outcome_5;
    let new_total_6: u64 =
        (outcome == 6u8) ? new_exposure : pool.total_outcome_6;
    let new_total_7: u64 =
        (outcome == 7u8) ? new_exposure : pool.total_outcome_7;

    let updated_pool: PoolState = PoolState {
        total_outcome_0: new_total_0,
        total_outcome_1: new_total_1,
        total_outcome_2: new_total_2,
        total_outcome_3: new_total_3,
        total_outcome_4: new_total_4,
        total_outcome_5: new_total_5,
        total_outcome_6: new_total_6,
        total_outcome_7: new_total_7,
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: pool.locked,
        trading_collateral: new_trading_collateral,
        lp_collateral: pool.lp_collateral,
        total_collateral: new_trading_collateral + pool.lp_collateral,
        total_shares: pool.total_shares - shares_to_sell,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume + net_payout,
    };
    Mapping::set(pools, market_id, updated_pool);

    let lp_fee_share_bps: u64 = Mapping::get_or_use(
        protocol_u64,
        PARAM_LP_FEE_SHARE_BPS,
        DEFAULT_LP_FEE_SHARE_BPS,
    );
    assert(lp_fee_share_bps <= 10000u64);
    let raw_lp_fee_share: u64 = mul_div_u64(fee, lp_fee_share_bps, 10000u64);
    let effective_lp_fee_share: u64 = pool.lp_supply > 0u64 ? raw_lp_fee_share : 0u64;
    let protocol_fee_share: u64 = fee - effective_lp_fee_share;
    if (effective_lp_fee_share > 0u64) {
        let accrued_lp_fee: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);
        Mapping::set(market_fee_pool, market_id, accrued_lp_fee + effective_lp_fee_share);
        accrue_lp_fee_index(market_id, pool.lp_supply, effective_lp_fee_share);
    }
    let accrued_protocol_fee: u64 = Mapping::get_or_use(protocol_fees, market.token_id, 0u64);
    Mapping::set(protocol_fees, market.token_id, accrued_protocol_fee + protocol_fee_share);

    let sold_collateral: u64 = mul_div_u64(
        state.collateral_in,
        shares_to_sell,
        state.shares,
    );
    let remaining_shares_actual: u64 = state.shares - shares_to_sell;
    let remaining_collateral_actual: u64 = state.collateral_in - sold_collateral;
    assert_eq(remaining_shares, remaining_shares_actual);
    assert_eq(remaining_collateral, remaining_collateral_actual);

    let updated_state: PositionState = PositionState {
        holder_commitment: state.holder_commitment,
        market_id: state.market_id,
        outcome: state.outcome,
        shares: remaining_shares_actual,
        collateral_in: remaining_collateral_actual,
        token_id: state.token_id,
        is_closed: remaining_shares_actual == 0u64,
    };
    Mapping::set(positions, position_id, updated_state);

    let claim: PayoutClaim = PayoutClaim {
        amount: net_payout,
        token_id: market.token_id,
    };
    Mapping::set(pending_payouts, nullifier, claim);
}

final fn finalize_claim_winnings(
    position_id: field,
    market_id: field,
    outcome: u8,
    shares: u64,
    collateral_in: u64,
    nullifier: field,
    caller: address,
) {
    // Claims stay available during pause to avoid trapping already-earned user payouts.
    let spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
    assert(!spent);
    Mapping::set(spent_nullifiers, nullifier, true);

    let state: PositionState = Mapping::get(positions, position_id);
    assert(!state.is_closed);
    let expected_holder_commitment: field =
        BHP256::hash_to_field(caller as field + position_id);
    assert_eq(state.holder_commitment, expected_holder_commitment);
    assert_eq(state.market_id, market_id);
    assert_eq(state.outcome, outcome);
    assert_eq(state.shares, shares);
    assert_eq(state.collateral_in, collateral_in);
    assert(state.shares > 0u64);

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert(market.is_resolved);

    let is_cancelled: bool = market.winning_outcome == OUTCOME_CANCELLED;
    // v10 cancellation is pre-liquidity-only, so there should be no open positions to claim on cancelled markets.
    // Claims are winner-redemption only.
    assert(!is_cancelled);
    assert_eq(outcome, market.winning_outcome);
    let payout: u64 = state.shares;
    assert(payout > 0u64);

    let winner_supply_snapshot: u64 = Mapping::get_or_use(
        market_winner_supply_snapshot,
        market_id,
        0u64,
    );
    assert(winner_supply_snapshot > 0u64);
    let remaining_winner_pool: u64 = Mapping::get_or_use(
        market_winner_payout_remaining,
        market_id,
        0u64,
    );
    assert(remaining_winner_pool >= payout);
    Mapping::set(market_winner_payout_remaining, market_id, remaining_winner_pool - payout);

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

final fn finalize_withdraw_liquidity(
    market_id: field,
    lp_shares: u64,
    lp_owner_key: field,
    min_payout: u64,
    nullifier: field,
    caller: address,
) {
    // Pause blocks liquidity mutations. Claims stay available.
    assert_protocol_not_paused();

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

    let owner_balance_key: field = lp_balance_key(market_id, lp_owner_key);
    let current_lp_balance: u64 = Mapping::get_or_use(lp_balances, owner_balance_key, 0u64);
    assert(current_lp_balance >= lp_shares);

    settle_lp_fee_accrual(market_id, owner_balance_key, current_lp_balance);
    let settled_pending_fees: u64 = Mapping::get_or_use(
        lp_pending_fees,
        owner_balance_key,
        0u64,
    );
    let trading_surplus_pool: u64 = Mapping::get_or_use(market_lp_trading_surplus, market_id, 0u64);

    let principal_payout: u64 = mul_div_u64(lp_shares, pool.lp_collateral, pool.lp_supply);
    let fee_payout: u64 = mul_div_u64(lp_shares, settled_pending_fees, current_lp_balance);
    let trading_surplus_payout: u64 = mul_div_u64(lp_shares, trading_surplus_pool, pool.lp_supply);
    let payout: u64 = principal_payout + fee_payout + trading_surplus_payout;
    assert(payout > 0u64);
    assert(payout >= min_payout);

    let remaining_lp_collateral: u64 = pool.lp_collateral - principal_payout;
    let remaining_pending_fees: u64 = settled_pending_fees - fee_payout;
    let remaining_trading_surplus_pool: u64 = trading_surplus_pool - trading_surplus_payout;
    let remaining_lp_supply: u64 = pool.lp_supply - lp_shares;
    let remaining_owner_lp_shares: u64 = current_lp_balance - lp_shares;
    let lp_count_decrement: u64 = remaining_owner_lp_shares == 0u64 ? 1u64 : 0u64;
    assert(pool.lp_count >= lp_count_decrement);

    Mapping::set(lp_balances, owner_balance_key, remaining_owner_lp_shares);
    Mapping::set(lp_pending_fees, owner_balance_key, remaining_pending_fees);
    Mapping::set(market_lp_trading_surplus, market_id, remaining_trading_surplus_pool);

    let updated_pool: PoolState = PoolState {
        total_outcome_0: pool.total_outcome_0,
        total_outcome_1: pool.total_outcome_1,
        total_outcome_2: pool.total_outcome_2,
        total_outcome_3: pool.total_outcome_3,
        total_outcome_4: pool.total_outcome_4,
        total_outcome_5: pool.total_outcome_5,
        total_outcome_6: pool.total_outcome_6,
        total_outcome_7: pool.total_outcome_7,
        trader_count: pool.trader_count,
        lp_count: pool.lp_count - lp_count_decrement,
        locked: pool.locked,
        trading_collateral: pool.trading_collateral,
        lp_collateral: remaining_lp_collateral,
        total_collateral: pool.trading_collateral + remaining_lp_collateral,
        total_shares: pool.total_shares,
        lp_supply: remaining_lp_supply,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);

    if (remaining_lp_supply == 0u64) {
        // Route any residual undistributed LP fee dust to protocol treasury when the LP set empties.
        let residual_fee_pool: u64 = Mapping::get_or_use(market_fee_pool, market_id, 0u64);
        if (residual_fee_pool > 0u64) {
            let current_protocol_fees: u64 = Mapping::get_or_use(protocol_fees, market.token_id, 0u64);
            Mapping::set(protocol_fees, market.token_id, current_protocol_fees + residual_fee_pool);
            Mapping::set(market_fee_pool, market_id, 0u64);
        }
    }

    let claim: PayoutClaim = PayoutClaim {
        amount: payout,
        token_id: market.token_id,
    };
    Mapping::set(pending_payouts, nullifier, claim);
}

final fn finalize_verify_claim(nullifier: field, payout_amount: u64, caller: address) {
    let stored: PayoutClaim = Mapping::get(pending_payouts, nullifier);
    assert_eq(stored.amount, payout_amount);
    assert_eq(stored.token_id, caller);

    let consumed: PayoutClaim = PayoutClaim {
        amount: 0u64,
        token_id: caller,
    };
    Mapping::set(pending_payouts, nullifier, consumed);
}

final fn finalize_authz_fee_withdrawal(
    amount: u64,
    authorization_id: field,
    token_adapter: address,
    auth_future: Final,
) {
    auth_future.run();
    assert(amount > 0u64);
    let current_fee_balance: u64 = Mapping::get_or_use(protocol_fees, token_adapter, 0u64);
    assert(current_fee_balance >= amount);
    Mapping::set(protocol_fees, token_adapter, current_fee_balance - amount);

    let exists: bool = Mapping::contains(pending_payouts, authorization_id);
    assert(!exists);
    let claim: PayoutClaim = PayoutClaim {
        amount: amount,
        token_id: token_adapter,
    };
    Mapping::set(pending_payouts, authorization_id, claim);
}

final fn finalize_resolve_market(
    market_id: field,
    winning_outcome: u8,
    auth_future: Final,
) {
    // Resolution remains callable during pause so markets cannot be stuck unresolved.
    auth_future.run();
    let market: MarketInfo = Mapping::get(markets, market_id);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 >= market.resolution_time);
    assert(winning_outcome < market.outcome_count);

    market.is_resolved = true;
    market.winning_outcome = winning_outcome;
    market.resolved_by_oracle = true;
    Mapping::set(markets, market_id, market);

    let pool: PoolState = Mapping::get(pools, market_id);
    let winner_key: field = outcome_key(market_id, winning_outcome);
    let winner_supply_snapshot: u64 = Mapping::get_or_use(outcome_share_supply, winner_key, 0u64);
    assert(winner_supply_snapshot > 0u64);
    assert(winner_supply_snapshot <= pool.trading_collateral);
    // Economic note: if winner supply is very small vs total trading collateral,
    // the residual loser-side trading collateral is intentionally routed to LP surplus.
    let lp_trading_surplus: u64 = pool.trading_collateral - winner_supply_snapshot;

    Mapping::set(market_winner_supply_snapshot, market_id, winner_supply_snapshot);
    Mapping::set(market_winner_payout_remaining, market_id, winner_supply_snapshot);
    Mapping::set(market_lp_trading_surplus, market_id, lp_trading_surplus);

    let updated_pool: PoolState = PoolState {
        total_outcome_0: pool.total_outcome_0,
        total_outcome_1: pool.total_outcome_1,
        total_outcome_2: pool.total_outcome_2,
        total_outcome_3: pool.total_outcome_3,
        total_outcome_4: pool.total_outcome_4,
        total_outcome_5: pool.total_outcome_5,
        total_outcome_6: pool.total_outcome_6,
        total_outcome_7: pool.total_outcome_7,
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: true,
        trading_collateral: pool.trading_collateral,
        lp_collateral: pool.lp_collateral,
        total_collateral: pool.total_collateral,
        total_shares: pool.total_shares,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);
}

final fn finalize_cancel_market(market_id: field, caller: address) {
    assert_protocol_not_paused();

    let market: MarketInfo = Mapping::get(markets, market_id);
    assert_eq(market.creator, caller);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);

    // Strict anti-rug rule for v10:
    // creator cancellation is only allowed before any liquidity/trading enters.
    let pool: PoolState = Mapping::get(pools, market_id);
    assert_eq(pool.trading_collateral, 0u64);
    assert_eq(pool.lp_collateral, 0u64);
    assert_eq(pool.total_shares, 0u64);

    market.is_resolved = true;
    market.winning_outcome = OUTCOME_CANCELLED;
    market.resolved_by_oracle = false;
    Mapping::set(markets, market_id, market);

    Mapping::set(market_winner_supply_snapshot, market_id, 0u64);
    Mapping::set(market_winner_payout_remaining, market_id, 0u64);
    Mapping::set(market_lp_trading_surplus, market_id, 0u64);

    let updated_pool: PoolState = PoolState {
        total_outcome_0: pool.total_outcome_0,
        total_outcome_1: pool.total_outcome_1,
        total_outcome_2: pool.total_outcome_2,
        total_outcome_3: pool.total_outcome_3,
        total_outcome_4: pool.total_outcome_4,
        total_outcome_5: pool.total_outcome_5,
        total_outcome_6: pool.total_outcome_6,
        total_outcome_7: pool.total_outcome_7,
        trader_count: pool.trader_count,
        lp_count: pool.lp_count,
        locked: true,
        trading_collateral: pool.trading_collateral,
        lp_collateral: pool.lp_collateral,
        total_collateral: pool.total_collateral,
        total_shares: pool.total_shares,
        lp_supply: pool.lp_supply,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);
}

final fn finalize_admin_set_pause(paused: bool, caller: address) {
    assert_eq(caller, ADMIN);
    let paused_flag: u8 = paused ? 1u8 : 0u8;
    Mapping::set(protocol_u8, PARAM_PROTOCOL_PAUSED, paused_flag);
}

final fn finalize_set_protocol_u64(param_key: u8, value: u64, auth: Final) {
    auth.run();
    if (param_key == PARAM_FEE_BPS) {
        assert(value <= 2000u64);
    }
    if (param_key == PARAM_MIN_TRADE || param_key == PARAM_MIN_LIQUIDITY) {
        assert(value >= 1u64);
    }
    if (param_key == PARAM_VIRTUAL_LIQ) {
        assert(value > 0u64);
    }
    if (param_key == PARAM_LP_FEE_SHARE_BPS) {
        assert(value <= 10000u64);
    }
    if (param_key == PARAM_MAX_MARKET_COLLATERAL) {
        assert(value > 0u64);
    }
    Mapping::set(protocol_u64, param_key, value);
}

final fn finalize_set_protocol_u8(param_key: u8, value: u8, auth: Final) {
    auth.run();
    if (param_key == PARAM_MAX_OUTCOMES) {
        assert(value >= 2u8);
        assert(value <= 32u8);
    }
    if (param_key == PARAM_PROTOCOL_PAUSED) {
        assert(value <= 1u8);
    }
    Mapping::set(protocol_u8, param_key, value);
}

final fn assert_protocol_not_paused() {
    let paused_flag: u8 = Mapping::get_or_use(
        protocol_u8,
        PARAM_PROTOCOL_PAUSED,
        DEFAULT_PROTOCOL_PAUSED,
    );
    assert(paused_flag == 0u8);
}
