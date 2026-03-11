// The 'test_veilmarkets_oracle_v4' test program.
import veilmarkets_oracle_v4.aleo;
program test_veilmarkets_oracle.aleo {
    @test
    script test_primitives() {
        let dispute_period: u64 = 14400u64;
        assert_eq(dispute_period, 14400u64);
    }

    @noupgrade
    async constructor() {}
}
