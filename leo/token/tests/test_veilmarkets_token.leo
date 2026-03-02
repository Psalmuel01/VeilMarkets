// The 'test_veilmarkets_token_v2' test program.
import veilmarkets_token_v2.aleo;
program test_veilmarkets_token.aleo {
    @test
    script test_primitives() {
        let min_bet: u64 = 1000000u64;
        assert_eq(min_bet, 1000000u64);
    }

    @noupgrade
    async constructor() {}
}
