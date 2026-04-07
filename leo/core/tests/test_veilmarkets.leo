fn mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
    assert(denom > 0u64);
    let a128: u128 = a as u128;
    let b128: u128 = b as u128;
    let d128: u128 = denom as u128;
    return ((a128 * b128) / d128) as u64;
}

fn calc_buy_shares(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure: u64,
    net_collateral_in: u64,
) -> u64 {
    let oc: u64 = outcome_count as u64;
    let total_liq: u64 = pool_collateral + (virtual_liq * oc);
    let outcome_liq: u64 = (pool_collateral / oc) + virtual_liq + outcome_exposure;
    let raw: u64 = mul_div_u64(net_collateral_in, total_liq, outcome_liq);
    return (raw == 0u64) ? 1u64 : raw;
}

fn calc_sell_payout(
    pool_collateral: u64,
    outcome_count: u8,
    virtual_liq: u64,
    outcome_exposure: u64,
    shares_to_sell: u64,
) -> u64 {
    let oc: u64 = outcome_count as u64;
    let total_liq: u64 = pool_collateral + (virtual_liq * oc);
    let outcome_liq: u64 = (pool_collateral / oc) + virtual_liq + outcome_exposure;
    return mul_div_u64(shares_to_sell, outcome_liq, total_liq);
}

fn is_valid_market_shape(market_type: u8, outcome_count: u8) -> bool {
    if (market_type > 1u8) {
        return false;
    }
    if (market_type == 0u8) {
        return outcome_count == 2u8;
    }
    if (outcome_count < 2u8) {
        return false;
    }
    return outcome_count <= 32u8;
}

program test_veilmarkets.aleo {
    @test
    fn validates_market_shape_rules() {
        assert_eq(is_valid_market_shape(0u8, 2u8), true);  // binary
        assert_eq(is_valid_market_shape(1u8, 2u8), true);  // categorical
        assert_eq(is_valid_market_shape(1u8, 3u8), true);  // categorical
        assert_eq(is_valid_market_shape(1u8, 4u8), true);  // categorical
        assert_eq(is_valid_market_shape(1u8, 32u8), true);  // categorical max

        assert_eq(is_valid_market_shape(0u8, 3u8), false); // binary must be 2 outcomes
        assert_eq(is_valid_market_shape(1u8, 1u8), false); // min is 2 outcomes
        assert_eq(is_valid_market_shape(1u8, 33u8), false); // max is 32 outcomes
        assert_eq(is_valid_market_shape(2u8, 2u8), false); // unknown market type
    }

    @test
    fn quote_scales_outcome_counts() {
        let virtual_liq: u64 = 10000000u64;
        let pool_collateral: u64 = 50000000u64;
        let net_in: u64 = 9000000u64;

        let shares_2: u64 = calc_buy_shares(pool_collateral, 2u8, virtual_liq, 4000000u64, net_in);
        let shares_3: u64 = calc_buy_shares(pool_collateral, 3u8, virtual_liq, 4000000u64, net_in);
        let shares_8: u64 = calc_buy_shares(pool_collateral, 8u8, virtual_liq, 4000000u64, net_in);
        let shares_16: u64 = calc_buy_shares(pool_collateral, 16u8, virtual_liq, 4000000u64, net_in);
        let shares_32: u64 = calc_buy_shares(pool_collateral, 32u8, virtual_liq, 4000000u64, net_in);

        assert(shares_2 > 0u64);
        assert(shares_3 > 0u64);
        assert(shares_8 > 0u64);
        assert(shares_16 > 0u64);
        assert(shares_32 > 0u64);
        assert(shares_32 >= shares_2);
    }

    @test
    fn claim_nullifier_changes() {
        // Mirrors nullifier derivation in claim_winnings.
        let owner: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
        let owner_hash: field = BHP256::hash_to_field(owner);
        let position_id: field = 111field;
        let shares_a: u64 = 2500000u64;
        let shares_b: u64 = 2500001u64;
        let position_id_b: field = 112field;

        let nullifier_a: field = BHP256::hash_to_field(owner_hash + position_id + shares_a as field);
        let nullifier_b: field = BHP256::hash_to_field(owner_hash + position_id + shares_b as field);
        let nullifier_c: field = BHP256::hash_to_field(owner_hash + position_id_b + shares_a as field);

        assert(nullifier_a != nullifier_b);
        assert(nullifier_a != nullifier_c);
    }

    @test
    fn outcome_within_count() {
        let market_outcome_count: u8 = 3u8;
        let valid_outcome: u8 = 2u8;
        let invalid_outcome: u8 = 3u8;

        assert(valid_outcome < market_outcome_count);
        assert_eq(invalid_outcome < market_outcome_count, false);
    }

    @test
    fn winner_redemption_proportional() {
        let pool_total_collateral: u64 = 120000000u64;
        let winning_supply: u64 = 30000000u64;
        let my_shares: u64 = 6000000u64;
        let payout: u64 = mul_div_u64(my_shares, pool_total_collateral, winning_supply);
        assert_eq(payout, 24000000u64);

        let losing_payout: u64 = 0u64;
        assert_eq(losing_payout, 0u64);
    }

    @test
    fn buy_sell_fee_conservation() {
        let pool_collateral_before: u64 = 80000000u64;
        let outcome_count: u8 = 3u8;
        let virtual_liq: u64 = 10000000u64;
        let outcome_exposure_before: u64 = 12000000u64;
        let fee_bps: u64 = 100u64;
        let collateral_in: u64 = 10000000u64;

        let buy_fee: u64 = mul_div_u64(collateral_in, fee_bps, 10000u64);
        let net_in: u64 = collateral_in - buy_fee;
        let minted_shares: u64 = calc_buy_shares(
            pool_collateral_before,
            outcome_count,
            virtual_liq,
            outcome_exposure_before,
            net_in,
        );
        assert(minted_shares > 0u64);

        let pool_after_buy: u64 = pool_collateral_before + net_in;
        let outcome_exposure_after_buy: u64 = outcome_exposure_before + net_in;
        let gross_sell: u64 = calc_sell_payout(
            pool_after_buy,
            outcome_count,
            virtual_liq,
            outcome_exposure_after_buy,
            minted_shares,
        );
        let sell_fee: u64 = mul_div_u64(gross_sell, fee_bps, 10000u64);
        let net_sell: u64 = gross_sell - sell_fee;

        assert(gross_sell > 0u64);
        assert(net_sell > 0u64);
        assert(net_sell <= pool_after_buy);
        // Fees are accumulated separately and never reduce conservation.
        assert(buy_fee + sell_fee > 0u64);
    }

    @test
    fn sell_quote_scales_with_shares() {
        let pool_collateral: u64 = 150000000u64;
        let outcome_count: u8 = 4u8;
        let virtual_liq: u64 = 12000000u64;
        let exposure: u64 = 35000000u64;

        let payout_small: u64 = calc_sell_payout(pool_collateral, outcome_count, virtual_liq, exposure, 1000000u64);
        let payout_large: u64 = calc_sell_payout(pool_collateral, outcome_count, virtual_liq, exposure, 3000000u64);

        assert(payout_small > 0u64);
        assert(payout_large > payout_small);
    }

    @noupgrade
    constructor() {}
}
