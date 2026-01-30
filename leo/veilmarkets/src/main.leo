// VeilMarkets.aleo
// Private Binary Prediction Markets on Aleo
// - Private BetPosition records (encrypted)
// - Public pool totals & market metadata
// - Async pattern for on-chain updates

program veilmarkets.aleo {

    // ============================================================================
    // Records & Structs
    // ============================================================================

    struct MarketInfo {
        creator: address,
        title_hash: field,         // Hash of title/question (off-chain reveal)
        category: u8,
        close_block: u64,          // Better: use block height for close
        resolution_block: u64,
        is_resolved: bool,
        winning_outcome: u8,       // 0 = NO, 1 = YES, 2 = unresolved
    }

    record BetPosition {
        owner: address,
        market_id: field,
        outcome: u8,               // 0 = NO, 1 = YES
        amount: u64,               // in microcredits (or future token units)
        nonce: group,             // Required for record privacy
    }

    record WinningsClaim {
        owner: address,
        market_id: field,
        payout_amount: u64,
        nonce: group,
    }

    struct PoolState {
        total_no: u64,
        total_yes: u64,
        participant_count: u64,
        locked: bool,
    }

    // ============================================================================
    // Mappings (public)
    // ============================================================================

    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;

    // ============================================================================
    // Transitions & Async Functions
    // ============================================================================

    // Create market (off-chain compute market_id, on-chain state update)
    async transition create_market(
        public title_hash: field,
        public category: u8,
        public close_block: u64,
        public resolution_block: u64
    ) -> (field, Future) {
        let market_id: field = BHP256::hash_to_field(self.caller);  // Simple deterministic ID; improve with nonce if needed

        let f: Future = create_market_onchain(
            market_id,
            self.caller,
            title_hash,
            category,
            close_block,
            resolution_block
        );

        return (market_id, f);
    }

    async function create_market_onchain(
        market_id: field,
        creator: address,
        title_hash: field,
        category: u8,
        close_block: u64,
        resolution_block: u64
    ) {
        // Prevent overwrite
        let existing_opt = Mapping::get(markets, market_id);
        // "Market ID already exists"
        assert_eq(existing_opt == none, true);

        let market = MarketInfo {
            creator: creator,
            title_hash: title_hash,
            category: category,
            close_block: close_block,
            resolution_block: resolution_block,
            is_resolved: false,
            winning_outcome: 2u8,
        };

        let pool = PoolState {
            total_no: 0u64,
            total_yes: 0u64,
            participant_count: 0u64,
            locked: false,
        };

        Mapping::set(markets, market_id, market);
        Mapping::set(pools, market_id, pool);
    }

    // Place private bet
    async transition place_bet(
        public market_id: field,
        public outcome: u8,         // 0 or 1
        public amount: u64
    ) -> (BetPosition, Future) {
        assert(outcome == 0u8 || outcome == 1u8); // invalid outcome

        let position = BetPosition {
            owner: self.caller,
            market_id: market_id,
            outcome: outcome,
            amount: amount,
            nonce: BHP256::hash_to_group(amount)  // Dummy nonce; use real randomness in prod
        };

        let f: Future = place_bet_onchain(market_id, outcome, amount);

        return (position, f);
    }

    async function place_bet_onchain(
        market_id: field,
        outcome: u8,
        amount: u64
    ) {
        let market_opt = Mapping::get(markets, market_id);
        assert(market_opt != none); // market does not exist
        let market = market_opt.unwrap();

        assert(block.height < market.close_block); // market closed
        assert(!market.is_resolved); // market resolved

        let pool_opt = Mapping::get(pools, market_id);
        let pool = pool_opt.unwrap_or(PoolState { total_no: 0u64, total_yes: 0u64, participant_count: 0u64, locked: false });
        assert(!pool.locked); // pool locked

        if (outcome == 0u8) {
            pool.total_no += amount;
        } else {
            pool.total_yes += amount;
        }
        pool.participant_count += 1u64;

        Mapping::set(pools, market_id, pool);
    }

    // Resolve market (only creator, after resolution block)
    async transition resolve_market(
        public market_id: field,
        public winning_outcome: u8   // 0 or 1
    ) -> Future {
        assert(winning_outcome == 0u8 || winning_outcome == 1u8); // invalid outcome

        return resolve_market_onchain(market_id, winning_outcome, self.caller);
    }

    async function resolve_market_onchain(
        market_id: field,
        winning_outcome: u8,
        caller: address
    ) {
        let market_opt = Mapping::get(markets, market_id);
        assert(market_opt != none); // market not found
        let market = market_opt.unwrap();

        // "Not creator"
        assert_eq(caller, market.creator);
        assert(block.height >= market.resolution_block); // too early
        assert(!market.is_resolved); // already resolved

        market.is_resolved = true;
        market.winning_outcome = winning_outcome;

        Mapping::set(markets, market_id, market);

        // Lock pool
        let pool_opt = Mapping::get(pools, market_id);
        let pool = pool_opt.unwrap();
        pool.locked = true;
        Mapping::set(pools, market_id, pool);
    }

    // Claim winnings (private → private)
    async transition claim_winnings(
        private position: BetPosition,
        public market_id: field
    ) -> (WinningsClaim, Future) {
        // "Wrong market"
        assert_eq(position.market_id, market_id);

        let claim = WinningsClaim {
            owner: position.owner,
            market_id: market_id,
            payout_amount: 0u64,  // Computed in finalize
            nonce: BHP256::hash_to_group(position.amount)
        };

        let f: Future = claim_winnings_onchain(
            market_id,
            position.outcome,
            position.amount
        );

        return (claim, f);
    }

    async function claim_winnings_onchain(
        market_id: field,
        bet_outcome: u8,
        bet_amount: u64
    ) {
        let market_opt = Mapping::get(markets, market_id);
        assert(market_opt != none); // market not found
        let market = market_opt.unwrap();

        assert(market.is_resolved); // not resolved
        // "Did not win"
        assert_eq(bet_outcome, market.winning_outcome);

        let pool_opt = Mapping::get(pools, market_id);
        let pool = pool_opt.unwrap();

        let winning_pool: u64 = (market.winning_outcome == 0u8) ? pool.total_no : pool.total_yes;        
        let total_pool: u64 = pool.total_no + pool.total_yes;

        // Pro-rata payout (simplified; no fees yet)
        let payout: u64 = (bet_amount * total_pool) / winning_pool;

        // In real version: transfer shielded credits here or return payout to user record
        // For now: just compute (extend with credits.aleo integration later)
        assert_gt(payout, 0u64, "No payout");
    }
}