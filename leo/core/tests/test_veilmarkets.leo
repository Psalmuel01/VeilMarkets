fn mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
    assert(denom > 0u64);
    let a128: u128 = a as u128;
    let b128: u128 = b as u128;
    let d128: u128 = denom as u128;
    return ((a128 * b128) / d128) as u64;
}

fn calc_fpmm_buy(
    qty_outcome: u64,
    total_other_qty: u64,
    net_collateral_in: u64,
) -> u64 {
    assert(total_other_qty > 0u64);
    return mul_div_u64(qty_outcome, net_collateral_in, total_other_qty + net_collateral_in);
}

fn calc_fpmm_sell(
    qty_outcome: u64,
    total_other_qty: u64,
    shares_to_sell: u64,
) -> u64 {
    return mul_div_u64(total_other_qty, shares_to_sell, qty_outcome + shares_to_sell);
}

fn position_holder_commitment(position_id: field) -> field {
    return BHP256::hash_to_field(position_id);
}

fn lp_owner_commitment(market_id: field, owner: address) -> field {
    return BHP256::hash_to_field(market_id + owner as field);
}

fn lp_balance_key(market_id: field, lp_owner_key: field) -> field {
    return BHP256::hash_to_field(market_id + lp_owner_key);
}

fn is_valid_market_shape(market_type: u8, outcome_count: u8, max_outcomes: u8) -> bool {
    if (market_type > 1u8) {
        return false;
    }
    if (outcome_count < 2u8 || outcome_count > max_outcomes) {
        return false;
    }
    if (market_type == 0u8) {
        return outcome_count == 2u8;
    }
    return true;
}

fn winner_payout(
    winning_outcome: u8,
    position_outcome: u8,
    shares: u64,
    collateral_in: u64,
) -> u64 {
    if (winning_outcome == 255u8) {
        return collateral_in;
    }
    if (winning_outcome == position_outcome) {
        return shares;
    }
    return 0u64;
}

program test_veilmarkets.aleo {
    const DEFAULT_MAX_OUTCOMES: u8 = 8u8;
    const OUTCOME_CANCELLED: u8 = 255u8;

    @test
    fn shape_rules_v15() {
        assert_eq(is_valid_market_shape(0u8, 2u8, DEFAULT_MAX_OUTCOMES), true);
        assert_eq(is_valid_market_shape(1u8, 2u8, DEFAULT_MAX_OUTCOMES), true);
        assert_eq(is_valid_market_shape(1u8, 8u8, DEFAULT_MAX_OUTCOMES), true);

        assert_eq(is_valid_market_shape(0u8, 3u8, DEFAULT_MAX_OUTCOMES), false);
        assert_eq(is_valid_market_shape(1u8, 1u8, DEFAULT_MAX_OUTCOMES), false);
        assert_eq(is_valid_market_shape(1u8, 9u8, DEFAULT_MAX_OUTCOMES), false);
        assert_eq(is_valid_market_shape(2u8, 2u8, DEFAULT_MAX_OUTCOMES), false);
    }

    @test
    fn buy_quote_fpmm() {
        let qty_outcome: u64 = 100u64;
        let total_other_qty: u64 = 300u64;
        let collateral_in: u64 = 50u64;
        let fee_bps: u64 = 1000u64; // 10%

        let fee: u64 = mul_div_u64(collateral_in, fee_bps, 10000u64);
        let net_in: u64 = collateral_in - fee;
        let shares_out: u64 = calc_fpmm_buy(qty_outcome, total_other_qty, net_in);
        let price_micro: u64 = mul_div_u64(shares_out, 1000000u64, net_in);

        assert_eq(fee, 5u64);
        assert_eq(net_in, 45u64);
        assert_eq(shares_out, 13u64);
        assert_eq(price_micro, 288888u64);
    }

    @test
    fn sell_quote_fpmm() {
        let qty_outcome: u64 = 100u64;
        let total_other_qty: u64 = 300u64;
        let shares_to_sell: u64 = 20u64;
        let fee_bps: u64 = 500u64; // 5%

        let gross_payout: u64 = calc_fpmm_sell(qty_outcome, total_other_qty, shares_to_sell);
        let fee: u64 = mul_div_u64(gross_payout, fee_bps, 10000u64);
        let net_payout: u64 = gross_payout - fee;

        assert_eq(gross_payout, 50u64);
        assert_eq(fee, 2u64);
        assert_eq(net_payout, 48u64);
    }

    @test
    fn pos_commitment_hash() {
        let position_id_a: field = 111field;
        let position_id_b: field = 112field;

        let commitment_a: field = position_holder_commitment(position_id_a);
        let commitment_a_repeat: field = position_holder_commitment(position_id_a);
        let commitment_b: field = position_holder_commitment(position_id_b);

        assert_eq(commitment_a, BHP256::hash_to_field(position_id_a));
        assert_eq(commitment_a, commitment_a_repeat);
        assert(commitment_a != commitment_b);
    }

    @test
    fn lp_keys_depend_on_inputs() {
        let owner_a: address = aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
        let owner_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;
        let market_a: field = 77field;
        let market_b: field = 78field;

        let lp_owner_a_market_a: field = lp_owner_commitment(market_a, owner_a);
        let lp_owner_a_market_b: field = lp_owner_commitment(market_b, owner_a);
        let lp_owner_b_market_a: field = lp_owner_commitment(market_a, owner_b);

        let balance_key_a: field = lp_balance_key(market_a, lp_owner_a_market_a);
        let balance_key_b: field = lp_balance_key(market_a, lp_owner_b_market_a);

        assert(lp_owner_a_market_a != lp_owner_a_market_b);
        assert(lp_owner_a_market_a != lp_owner_b_market_a);
        assert(balance_key_a != balance_key_b);
    }

    @test
    fn settlement_semantics() {
        let shares: u64 = 6000000u64;
        let collateral_in: u64 = 4500000u64;
        let position_outcome: u8 = 2u8;

        let winning_payout: u64 = winner_payout(2u8, position_outcome, shares, collateral_in);
        let losing_payout: u64 = winner_payout(1u8, position_outcome, shares, collateral_in);
        let cancelled_payout: u64 = winner_payout(
            OUTCOME_CANCELLED,
            position_outcome,
            shares,
            collateral_in,
        );

        assert_eq(winning_payout, shares);
        assert_eq(losing_payout, 0u64);
        assert_eq(cancelled_payout, collateral_in);
    }

    @noupgrade
    constructor() {}
}
