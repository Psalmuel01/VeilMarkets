// VeilMarkets Factory
// Central deployment and permission management
// All contracts verify against this factory's registry

program veilmarkets_factory.aleo {

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

    // View function to check if caller is registered contract
    // Used by other contracts via self.caller verification
    async transition is_registered(
        public contract_type: u8,
        public caller: address,
    ) -> (bool, Future) {
        let registered: address = Mapping::get_or_use(contracts, contract_type, aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc);
        let is_valid: bool = registered == caller;
        return (is_valid, finalize_is_registered());
    }

    async function finalize_is_registered() {}

    // Get contract address
    async transition get_contract(
        public contract_type: u8,
    ) -> (address, Future) {
        let addr: address = Mapping::get_or_use(contracts, contract_type, aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc);
        return (addr, finalize_get_contract());
    }

    async function finalize_get_contract() {}
}