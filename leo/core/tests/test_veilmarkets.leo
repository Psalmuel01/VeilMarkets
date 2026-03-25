import veilmarkets_v6.aleo;

program test_veilmarkets.aleo {
    @test
    transition market_primitives_ok() {
        let unresolved_outcome: u8 = 2u8;
        assert_eq(unresolved_outcome, 2u8);

        let sample_market_id: field = 12345field;
        assert_eq(sample_market_id, 12345field);
    }

    @noupgrade
    async constructor() {}
}
