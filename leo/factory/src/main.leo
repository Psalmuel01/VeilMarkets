// VeilMarkets Factory
// Central deployment and permission management
// All contracts verify against this factory's registry
program veilmarkets_factory_v5.aleo {
    // Contract registry - maps address to official type
    mapping contracts: address => u8;

    // Initialize with admin
    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    // Register a contract address for a specific type
    // Types: 1 = TOKEN, 2 = ORACLE, 3 = CORE (reserved)
    async transition register_contract(public contract_type: u8, public contract_address: address) -> Future {
        return finalize_register_contract(contract_type, contract_address);
    }

    async function finalize_register_contract(contract_type: u8, contract_address: address) {
        Mapping::set(contracts, contract_address, contract_type);
    }

    // Authentication helper for cross-contract calls
    async transition verify_is_registered(public contract_type: u8, public caller_address: address) -> Future {
        return finalize_verify_is_registered(contract_type, caller_address);
    }

    async function finalize_verify_is_registered(contract_type: u8, caller_address: address) {
        let registered_type: u8 = Mapping::get(contracts, caller_address);
        assert_eq(registered_type, contract_type);
    }
}
