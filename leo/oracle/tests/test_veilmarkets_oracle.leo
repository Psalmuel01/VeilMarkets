import veilmarkets_oracle_v6.aleo;

program test_veilmarkets_oracle.aleo {
    @test
    transition test_primitives() {
        let dispute_period: u64 = 14400u64;
        assert_eq(dispute_period, 14400u64);
    }

    @noupgrade
    async constructor() {}
}
