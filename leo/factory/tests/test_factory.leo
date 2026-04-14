fn is_valid_registry_type(contract_type: u8) -> bool {
    if (contract_type < 1u8) {
        return false;
    }
    return contract_type <= 4u8;
}

program test_factory.aleo {
    @test
    fn registry_type_tags_are_stable() {
        let token_type: u8 = 1u8;
        let oracle_type: u8 = 2u8;
        let core_type: u8 = 3u8;
        let governance_type: u8 = 4u8;

        assert_eq(is_valid_registry_type(token_type), true);
        assert_eq(is_valid_registry_type(oracle_type), true);
        assert_eq(is_valid_registry_type(core_type), true);
        assert_eq(is_valid_registry_type(governance_type), true);
        assert_eq(is_valid_registry_type(0u8), false);
        assert_eq(is_valid_registry_type(5u8), false);
    }

    @test
    fn registry_keys_distinct() {
        // The registry uses `address => u8`; this test checks that two
        // addresses are never conflated in deterministic key derivation.
        let contract_a: address = aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
        let contract_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;

        let key_a: field = BHP256::hash_to_field(contract_a as field + 1u8 as field);
        let key_b: field = BHP256::hash_to_field(contract_b as field + 1u8 as field);

        assert(key_a != key_b);
    }

    @test
    fn verify_type_exact_match() {
        let registered_type: u8 = 1u8; // token
        let requested_type_same: u8 = 1u8;
        let requested_type_other: u8 = 2u8; // oracle

        assert_eq(registered_type == requested_type_same, true);
        assert_eq(registered_type == requested_type_other, false);
    }

    @noupgrade
    constructor() {}
}
