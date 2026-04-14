import credits.aleo;

program veilmarkets_liquidity_v1.aleo {
    const MAX_OUTCOMES: u8 = 8u8;
    const MIN_LIQUIDITY: u64 = 1000000u64;

    struct MarketConfig {
        creator: address,
        outcome_count: u8,
        close_time: u64,
        is_resolved: bool,
        token_id: address,
    }

    struct PoolState {
        trader_count: u64,
        lp_count: u64,
        locked: bool,
        total_collateral: u64,
        lp_collateral: u64,
        lp_supply: u64,
        cumulative_volume: u64,
    }

    mapping markets: field => MarketConfig;
    mapping pools: field => PoolState;
    mapping outcome_token_qty: field => u64;
    mapping outcome_token_supply: field => u64;
    mapping lp_balances: field => u64;
    mapping ping_last_seen: address => field;

    @admin(address = "aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l")
    constructor() {}

    fn register_market(
        public market_id: field,
        public outcome_count: u8,
        public close_time: u64,
        public token_id: address,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_register_market(market_id, outcome_count, close_time, token_id, caller);
        };
    }

    fn fund_pool(
        input_credits: credits.aleo::credits,
        public market_id: field,
        public amount: u64,
    ) -> (credits.aleo::credits, Final) {
        assert(input_credits.microcredits >= amount);
        assert(amount >= MIN_LIQUIDITY);
        let (change, transfer_future): (credits.aleo::credits, Final) = credits.aleo::transfer_private_to_public(
            input_credits,
            self.address,
            amount,
        );
        let lp_owner_key: field = BHP256::hash_to_field(market_id + self.signer as field);
        return (change, final {
            transfer_future.run();
            finalize_fund_pool(market_id, amount, lp_owner_key);
        });
    }

    fn ping(public nonce: field) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_ping(caller, nonce);
        };
    }
}

fn outcome_key(market_id: field, outcome: u8) -> field {
    return BHP256::hash_to_field(market_id + outcome as field);
}

fn lp_balance_key(market_id: field, lp_owner_key: field) -> field {
    return BHP256::hash_to_field(market_id + lp_owner_key);
}

final fn finalize_register_market(
    market_id: field,
    outcome_count: u8,
    close_time: u64,
    token_id: address,
    creator: address,
) {
    assert(outcome_count >= 2u8);
    assert(outcome_count <= MAX_OUTCOMES);
    assert(close_time > block.timestamp as u64);

    if Mapping::contains(markets, market_id) {
        let existing: MarketConfig = Mapping::get(markets, market_id);
        assert_eq(existing.creator, creator);
        assert_eq(existing.outcome_count, outcome_count);
        assert_eq(existing.close_time, close_time);
        assert_eq(existing.token_id, token_id);
        if !Mapping::contains(pools, market_id) {
            let empty_pool: PoolState = PoolState {
                trader_count: 0u64,
                lp_count: 0u64,
                locked: false,
                total_collateral: 0u64,
                lp_collateral: 0u64,
                lp_supply: 0u64,
                cumulative_volume: 0u64,
            };
            Mapping::set(pools, market_id, empty_pool);
        }
        return;
    }

    let market: MarketConfig = MarketConfig {
        creator: creator,
        outcome_count: outcome_count,
        close_time: close_time,
        is_resolved: false,
        token_id: token_id,
    };
    let empty_pool: PoolState = PoolState {
        trader_count: 0u64,
        lp_count: 0u64,
        locked: false,
        total_collateral: 0u64,
        lp_collateral: 0u64,
        lp_supply: 0u64,
        cumulative_volume: 0u64,
    };

    Mapping::set(markets, market_id, market);
    Mapping::set(pools, market_id, empty_pool);
}

final fn finalize_fund_pool(market_id: field, amount: u64, lp_owner_key: field) {
    let market: MarketConfig = Mapping::get(markets, market_id);
    assert(!market.is_resolved);
    assert(block.timestamp as u64 < market.close_time);

    let pool: PoolState = Mapping::get(pools, market_id);
    assert(!pool.locked);

    let per_outcome: u64 = amount / market.outcome_count as u64;
    assert(per_outcome > 0u64);

    let oc: u8 = market.outcome_count;
    if (oc > 0u8) {
        let key: field = outcome_key(market_id, 0u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 1u8) {
        let key: field = outcome_key(market_id, 1u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 2u8) {
        let key: field = outcome_key(market_id, 2u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 3u8) {
        let key: field = outcome_key(market_id, 3u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 4u8) {
        let key: field = outcome_key(market_id, 4u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 5u8) {
        let key: field = outcome_key(market_id, 5u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 6u8) {
        let key: field = outcome_key(market_id, 6u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }
    if (oc > 7u8) {
        let key: field = outcome_key(market_id, 7u8);
        let current_qty: u64 = Mapping::get_or_use(outcome_token_qty, key, 0u64);
        Mapping::set(outcome_token_qty, key, current_qty + per_outcome);
        let current_supply: u64 = Mapping::get_or_use(outcome_token_supply, key, 0u64);
        Mapping::set(outcome_token_supply, key, current_supply + per_outcome);
    }

    let updated_pool: PoolState = PoolState {
        trader_count: pool.trader_count,
        lp_count: pool.lp_count + 1u64,
        locked: false,
        total_collateral: pool.total_collateral + amount,
        lp_collateral: pool.lp_collateral + amount,
        lp_supply: pool.lp_supply + amount,
        cumulative_volume: pool.cumulative_volume,
    };
    Mapping::set(pools, market_id, updated_pool);

    let balance_key: field = lp_balance_key(market_id, lp_owner_key);
    let current_balance: u64 = Mapping::get_or_use(lp_balances, balance_key, 0u64);
    Mapping::set(lp_balances, balance_key, current_balance + amount);
}

final fn finalize_ping(caller: address, nonce: field) {
    Mapping::set(ping_last_seen, caller, nonce);
}