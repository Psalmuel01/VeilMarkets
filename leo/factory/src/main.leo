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
    constructor() {}

    fn register_contract(public contract_type: u8, public contract_address: address) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_register_contract(
                contract_type,
                contract_address,
                caller,
                ADMIN,
                TYPE_TOKEN,
                TYPE_ORACLE,
                TYPE_CORE,
                TYPE_GOVERNANCE,
            );
        };
    }

    fn verify_is_registered(public contract_type: u8, public caller_address: address) -> Final {
        return final {
            finalize_verify_is_registered(contract_type, caller_address);
        };
    }
}

final fn finalize_register_contract(
    contract_type: u8,
    contract_address: address,
    caller: address,
    admin: address,
    type_token: u8,
    type_oracle: u8,
    type_core: u8,
    type_governance: u8,
) {
    assert_eq(caller, admin);
    assert(
        contract_type == type_token
            || contract_type == type_oracle
            || contract_type == type_core
            || contract_type == type_governance
    );
    Mapping::set(contracts, contract_address, contract_type);
}

final fn finalize_verify_is_registered(contract_type: u8, caller_address: address) {
    let registered_type: u8 = Mapping::get(contracts, caller_address);
    assert_eq(registered_type, contract_type);
}
