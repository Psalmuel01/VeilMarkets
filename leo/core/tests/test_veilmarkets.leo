import veilmarkets_v8.aleo;

program test_veilmarkets.aleo {
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
        return outcome_count <= 4u8;
    }

    @test
    transition validates_market_shape_rules() {
        assert_eq(is_valid_market_shape(0u8, 2u8), true);  // binary
        assert_eq(is_valid_market_shape(1u8, 2u8), true);  // categorical
        assert_eq(is_valid_market_shape(1u8, 3u8), true);  // categorical
        assert_eq(is_valid_market_shape(1u8, 4u8), true);  // categorical

        assert_eq(is_valid_market_shape(0u8, 3u8), false); // binary must be 2 outcomes
        assert_eq(is_valid_market_shape(1u8, 1u8), false); // min is 2 outcomes
        assert_eq(is_valid_market_shape(1u8, 5u8), false); // max is 4 outcomes
        assert_eq(is_valid_market_shape(2u8, 2u8), false); // unknown market type
    }

    @test
    transition payout_formula_categorical() {
        // Mirrors finalize_claim_winnings payout math:
        // payout = (bet_amount * total_pool) / winning_pool
        let total_outcome_0: u64 = 5u64;
        let total_outcome_1: u64 = 15u64;
        let total_outcome_2: u64 = 20u64;
        let total_outcome_3: u64 = 10u64;

        let winning_pool: u64 = total_outcome_2;
        let total_pool: u64 =
            total_outcome_0 + total_outcome_1 + total_outcome_2 + total_outcome_3;
        let bet_amount: u64 = 4u64;

        let payout: u64 = (bet_amount * total_pool) / winning_pool;

        assert_eq(total_pool, 50u64);
        assert_eq(winning_pool, 20u64);
        assert_eq(payout, 10u64);
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

    @noupgrade
    async constructor() {}
}
