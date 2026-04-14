program veilmarkets_create_v1.aleo {
    const OUTCOME_UNRESOLVED: u8 = 254u8;
    const MAX_CATEGORY: u8 = 6u8;
    const MAX_OUTCOMES: u8 = 8u8;

    struct MarketInfo {
        creator: address,
        title_hash: field,
        category: u8,
        market_type: u8,
        outcome_count: u8,
        close_time: u64,
        resolution_time: u64,
        is_resolved: bool,
        winning_outcome: u8,
        resolved_by_oracle: bool,
        token_id: address,
    }

    mapping markets: field => MarketInfo;

    @admin(address = "aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l")
    constructor() {}

    fn create_market(
        public title_hash: field,
        public category: u8,
        public market_type: u8,
        public outcome_count: u8,
        public close_time: u64,
        public resolution_time: u64,
        public token_id: address,
    ) -> Final {
        let caller: address = self.caller;
        let market_id: field = BHP256::hash_to_field(title_hash + caller as field);
        return final {
            finalize_create_market(
                market_id,
                caller,
                title_hash,
                category,
                market_type,
                outcome_count,
                close_time,
                resolution_time,
                token_id,
            );
        };
    }
}

final fn finalize_create_market(
    market_id: field,
    creator: address,
    title_hash: field,
    category: u8,
    market_type: u8,
    outcome_count: u8,
    close_time: u64,
    resolution_time: u64,
    token_id: address,
) {
    assert(category <= 6u8);
    assert(market_type <= 1u8);
    assert(outcome_count >= 2u8);
    assert(outcome_count <= 8u8);

    if market_type == 0u8 {
        assert(outcome_count == 2u8);
    }

    let current_time: u64 = block.timestamp as u64;
    assert(close_time > current_time);
    assert(resolution_time >= close_time);
    assert(!Mapping::contains(markets, market_id));

    let market: MarketInfo = MarketInfo {
        creator: creator,
        title_hash: title_hash,
        category: category,
        market_type: market_type,
        outcome_count: outcome_count,
        close_time: close_time,
        resolution_time: resolution_time,
        is_resolved: false,
        winning_outcome: OUTCOME_UNRESOLVED,
        resolved_by_oracle: false,
        token_id: token_id,
    };

    Mapping::set(markets, market_id, market);
}
