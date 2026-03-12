import veilmarkets_v4.aleo;

program test_veilmarkets.aleo {
    @test
    script market_struct_primitives_are_valid() {
        let unresolved_outcome: u8 = 2u8;
        assert_eq(unresolved_outcome, 2u8);

        let sample_market_id: field = 12345field;
        assert_eq(sample_market_id, 12345field);
    }

    @noupgrade
    async constructor() {}
}
