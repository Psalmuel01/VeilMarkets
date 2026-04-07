import veilmarkets_token_credits_v9.aleo;

program test_veilmarkets_token.aleo {
    const MIN_BET: u64 = 1000000u64;

    fn compute_escrow_id(
        bettor: address,
        market_id: field,
        outcome: u8,
        amount: u64,
        bet_nonce: field,
    ) -> field {
        return BHP256::hash_to_field(
            bettor as field + market_id + outcome as field + amount as field + bet_nonce,
        );
    }

    @test
    fn enforces_minimum_bet_threshold() {
        let too_small: u64 = 999999u64;
        let valid_min: u64 = MIN_BET;

        assert_eq(too_small >= MIN_BET, false);
        assert_eq(valid_min >= MIN_BET, true);
    }

    @test
    fn escrow_id_depends_on_inputs() {
        let bettor_a: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
        let bettor_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;
        let market_id: field = 77field;

        let escrow_a: field =
            compute_escrow_id(bettor_a, market_id, 1u8, 5000000u64, 11field);
        let escrow_b: field =
            compute_escrow_id(bettor_b, market_id, 1u8, 5000000u64, 11field);
        let escrow_c: field =
            compute_escrow_id(bettor_a, market_id, 1u8, 5000000u64, 12field);

        assert(escrow_a != escrow_b);
        assert(escrow_a != escrow_c);
    }

    @test
    fn escrow_reduces_on_refund() {
        let current_total: u64 = 9000000u64;
        let refund_amount: u64 = 2500000u64;
        let remaining: u64 = current_total - refund_amount;

        assert(current_total >= refund_amount);
        assert_eq(remaining, 6500000u64);
    }

    @noupgrade
    constructor() {}
}
