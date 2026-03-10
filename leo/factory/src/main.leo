// VeilMarkets Factory
// Central deployment and permission management
// All contracts verify against this factory's registry

program veilmarkets_factory_v3.aleo {

    // Contract registry - stores official addresses
    mapping contracts: u8 => address;
    
    // Contract type identifiers
    const CORE_CONTRACT: u8 = 0u8;
    const TOKEN_CONTRACT: u8 = 1u8;
    const ORACLE_CONTRACT: u8 = 2u8;
    
    // Admin address for initial setup
    @admin(address="aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc")
    async constructor() {}

    // Register a contract address (only callable once per type)
    async transition register_contract(
        public contract_type: u8,
        public contract_address: address,
    ) -> Future {
        assert(contract_type <= 2u8); // Valid types only
        return finalize_register_contract(contract_type, contract_address);
    }

    async function finalize_register_contract(
        contract_type: u8,
        contract_address: address,
    ) {
        // Ensure not already set
        let existing: address = Mapping::get_or_use(contracts, contract_type, aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc);
        assert_eq(existing, aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc);
        
        Mapping::set(contracts, contract_type, contract_address);
    }

    // transition to check if caller is registered contract
    // Used by other contracts via cross-contract calls
    async transition verify_is_registered(
        public contract_type: u8,
        public caller_address: address,
    ) -> Future {
        return finalize_verify_is_registered(contract_type, caller_address);
    }

    async function finalize_verify_is_registered(
        contract_type: u8,
        caller: address,
    ) {
        let registered: address = Mapping::get(contracts, contract_type);
        assert_eq(registered, caller);
    }

    // Get contract address (for on-chain awareness, though mostly used by frontend)
    async transition check_contract(
        public contract_type: u8,
        public expected_address: address,
    ) -> Future {
        return finalize_check_contract(contract_type, expected_address);
    }

    async function finalize_check_contract(
        contract_type: u8,
        expected: address,
    ) {
        let addr: address = Mapping::get(contracts, contract_type);
        assert_eq(addr, expected);
    }
}