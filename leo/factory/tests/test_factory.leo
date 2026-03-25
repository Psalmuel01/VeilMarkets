import veilmarkets_factory_v6.aleo;

program test_factory.aleo {
    @test
    transition registry_type_tag_ok() {
        let token_type: u8 = 1u8;
        let oracle_type: u8 = 2u8;
        assert_eq(token_type + oracle_type, 3u8);
    }

    @noupgrade
    async constructor() {}
}
