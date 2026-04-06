import veilmarkets_token_usad_v8.aleo;

program test_veilmarkets_token.aleo {
    const MIN_BET: u64 = 1000000u64; // 1 USAD (6 decimals)

    function compute_escrow_id(bettor: address, market_id: field, amount: u64) -> field {
        return BHP256::hash_to_field(bettor as field + market_id + amount as field);
    }

    @test
    transition usad_min_bet_decimal() {
        let one_usad_micro: u64 = 1000000u64;
        let bet_amount_u128: u128 = one_usad_micro as u128;

        assert_eq(MIN_BET, one_usad_micro);
        assert_eq(bet_amount_u128, 1000000u128);
    }

    @test
    transition usad_escrow_id_changes() {
        let bettor_a: address = aleo1w0e5f0frezk9v8x92avcvn084wx0kcxykltuw2xtnehd98paxsrq4x7r9x;
        let bettor_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;
        let market_id: field = 89field;

        let escrow_a: field = compute_escrow_id(bettor_a, market_id, 1000000u64);
        let escrow_b: field = compute_escrow_id(bettor_a, market_id, 2000000u64);
        let escrow_c: field = compute_escrow_id(bettor_b, market_id, 1000000u64);

        assert(escrow_a != escrow_b);
        assert(escrow_a != escrow_c);
    }

    @test
    transition usad_u128_cast_roundtrip() {
        let payout_u64: u64 = 987654321u64;
        let payout_u128: u128 = payout_u64 as u128;
        let payout_back_u64: u64 = payout_u128 as u64;

        assert_eq(payout_back_u64, payout_u64);
    }

    @noupgrade
    async constructor() {}
}
