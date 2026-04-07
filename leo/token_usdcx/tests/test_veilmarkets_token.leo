import veilmarkets_token_usdcx_v9.aleo;

program test_veilmarkets_token.aleo {
    const MIN_BET: u64 = 1000000u64; // 1 USDCx (6 decimals)

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
    fn usdcx_min_bet_decimal() {
        let one_usdcx_micro: u64 = 1000000u64;
        let bet_amount_u128: u128 = one_usdcx_micro as u128;

        assert_eq(MIN_BET, one_usdcx_micro);
        assert_eq(bet_amount_u128, 1000000u128);
    }

    @test
    fn usdcx_escrow_id_changes() {
        let bettor_a: address = aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms;
        let bettor_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;
        let market_id: field = 88field;

        let escrow_a: field =
            compute_escrow_id(bettor_a, market_id, 0u8, 1000000u64, 21field);
        let escrow_b: field =
            compute_escrow_id(bettor_a, market_id, 0u8, 1000000u64, 22field);
        let escrow_c: field =
            compute_escrow_id(bettor_b, market_id, 0u8, 1000000u64, 21field);

        assert(escrow_a != escrow_b);
        assert(escrow_a != escrow_c);
    }

    @test
    fn usdcx_u128_cast_roundtrip() {
        let payout_u64: u64 = 123456789u64;
        let payout_u128: u128 = payout_u64 as u128;
        let payout_back_u64: u64 = payout_u128 as u64;

        assert_eq(payout_back_u64, payout_u64);
    }

    @noupgrade
    constructor() {}
}
