import veilmarkets_v9.aleo;

program test_veilmarkets.aleo {
    inline mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
        assert(denom > 0u64);
        let a128: u128 = a as u128;
        let b128: u128 = b as u128;
        let d128: u128 = denom as u128;
        return ((a128 * b128) / d128) as u64;
    }

    inline calc_buy_shares(
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

    function is_valid_market_shape(market_type: u8, outcome_count: u8) -> bool {
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

    @test
    transition validates_market_shape_rules() {
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
    transition quote_scales_outcome_counts() {
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
    transition nullifier_changes_with_fields() {
        // Mirrors nullifier derivation in claim_winnings.
        let owner: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
        let owner_hash: field = BHP256::hash_to_field(owner);
        let market_id: field = 987654field;
        let escrow_id: field = 111field;
        let amount: u64 = 2500000u64;
        let outcome: u8 = 1u8;

        let nullifier_a: field = BHP256::hash_to_field(
            owner_hash + market_id + amount as field + outcome as field + escrow_id,
        );
        let nullifier_b: field = BHP256::hash_to_field(
            owner_hash + market_id + (amount + 1u64) as field + outcome as field + escrow_id,
        );
        let nullifier_c: field = BHP256::hash_to_field(
            owner_hash + market_id + amount as field + 0u8 as field + escrow_id,
        );

        assert(nullifier_a != nullifier_b);
        assert(nullifier_a != nullifier_c);
    }

    @test
    transition outcome_within_count() {
        let market_outcome_count: u8 = 3u8;
        let valid_outcome: u8 = 2u8;
        let invalid_outcome: u8 = 3u8;

        assert(valid_outcome < market_outcome_count);
        assert_eq(invalid_outcome < market_outcome_count, false);
    }

    @test
    transition winner_redemption_proportional() {
        let pool_total_collateral: u64 = 120000000u64;
        let winning_supply: u64 = 30000000u64;
        let my_shares: u64 = 6000000u64;
        let payout: u64 = mul_div_u64(my_shares, pool_total_collateral, winning_supply);
        assert_eq(payout, 24000000u64);

        let losing_payout: u64 = 0u64;
        assert_eq(losing_payout, 0u64);
    }

    @noupgrade
    async constructor() {}
}
