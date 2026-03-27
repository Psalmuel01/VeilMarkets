import veilmarkets_token_usdcx_v8.aleo;

program test_veilmarkets_token.aleo {
    @test
    transition test_primitives() {
        let min_bet: u64 = 1000000u64;
        assert_eq(min_bet, 1000000u64);
    }

    @noupgrade
    async constructor() {}
}
