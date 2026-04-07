// VeilMarkets Factory (v9)
// Canonical registry + trust anchor for cross-program authorization.
program veilmarkets_factory_v9.aleo {
    mapping contracts: address => u8;

    const TYPE_TOKEN: u8 = 1u8;
    const TYPE_ORACLE: u8 = 2u8;
    const TYPE_CORE: u8 = 3u8;
    const TYPE_GOVERNANCE: u8 = 4u8;
    const ADMIN: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    async transition register_contract(public contract_type: u8, public contract_address: address) -> Future {
        return finalize_register_contract(contract_type, contract_address, self.caller);
    }

    async function finalize_register_contract(contract_type: u8, contract_address: address, caller: address) {
        assert_eq(caller, ADMIN);
        assert(
            contract_type == TYPE_TOKEN
                || contract_type == TYPE_ORACLE
                || contract_type == TYPE_CORE
                || contract_type == TYPE_GOVERNANCE
        );
        Mapping::set(contracts, contract_address, contract_type);
    }

    async transition verify_is_registered(public contract_type: u8, public caller_address: address) -> Future {
        return finalize_verify_is_registered(contract_type, caller_address);
    }

    async function finalize_verify_is_registered(contract_type: u8, caller_address: address) {
        let registered_type: u8 = Mapping::get(contracts, caller_address);
        assert_eq(registered_type, contract_type);
    }
}
