// VeilMarkets Core
// Private Binary Prediction Markets with full cross-contract integration
import veilmarkets_factory_v5.aleo;

program veilmarkets_v5.aleo {
    // Records & Structs
    struct MarketInfo {
        creator: address,
        title_hash: field,
        category: u8,
        close_time: u64,
        resolution_time: u64,
        is_resolved: bool,
        winning_outcome: u8, // 0 = NO, 1 = YES, 2 = unresolved
        resolved_by_oracle: bool,
        // True if resolved via oracle
    }

    record BetPosition {
        owner: address,
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field, // Links to token contract escrow
        nonce: group,
    }

    record WinningsClaim {
        owner: address,
        market_id: field,
        payout_amount: u64,
        nullifier: field, // Prevents double-spend
        nonce: group,
    }

    struct PoolState {
        total_no: u64,
        total_yes: u64,
        participant_count: u64,
        locked: bool,
        escrowed_amount: u64,
        // Total in escrow (must match token contract)
    }

    // Mappings
    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;
    mapping spent_nullifiers: field => bool; // Anti-replay protection
    mapping position_to_escrow: field => field; // Maps position hash to escrow id
    mapping pending_payouts: field => u64; // nullifier => payout_amount (for token contract)

    // Constants
    const TOKEN_CONTRACT_TYPE: u8 = 1u8;
    const ORACLE_CONTRACT_TYPE: u8 = 2u8;

    // Initialize
    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    // Create market
    async transition create_market(
        public title_hash: field,
        public category: u8,
        public close_time: u64,
        public resolution_time: u64,
    ) -> (field, Future) {
        let caller_hash: field = BHP256::hash_to_field(self.caller);
        let market_id: field = BHP256::hash_to_field(caller_hash + title_hash);
        let f: Future = finalize_create_market(
            market_id,
            self.caller,
            title_hash,
            category,
            close_time,
            resolution_time,
        );
        return (market_id, f);
    }

    async function finalize_create_market(
        market_id: field,
        creator: address,
        title_hash: field,
        category: u8,
        close_time: u64,
        resolution_time: u64,
    ) {
        let exists: bool = Mapping::contains(markets, market_id);
        assert(!exists);
        let market: MarketInfo = MarketInfo {
            creator: creator,
            title_hash: title_hash,
            category: category,
            close_time: close_time,
            resolution_time: resolution_time,
            is_resolved: false,
            winning_outcome: 2u8,
            resolved_by_oracle: false,
        };
        // Check timestamps in finalize
        assert(close_time > block.timestamp as u64);
        assert(resolution_time > close_time);
        let pool = PoolState {
            total_no: 0u64,
            total_yes: 0u64,
            participant_count: 0u64,
            locked: false,
            escrowed_amount: 0u64,
        };
        Mapping::set(markets, market_id, market);
        Mapping::set(pools, market_id, pool);
    }

    // Place bet - INTEGRATED with token contract
    // This is called BY the token contract after escrow is confirmed
    async transition place_bet(
        public market_id: field,
        public outcome: u8,
        public amount: u64,
        public escrow_id: field, // From token contract
        public bettor: address,
    ) -> Future {
        // Must be called by the registered token contract via factory registry.
        let auth_future: Future = veilmarkets_factory_v5.aleo/verify_is_registered(
            TOKEN_CONTRACT_TYPE,
            self.caller,
        );
        assert(outcome == 0u8 || outcome == 1u8);
        assert(amount > 0u64);
        let bettor_hash: field = BHP256::hash_to_field(bettor);
        let position_hash: field = BHP256::hash_to_field(bettor_hash + market_id + escrow_id);
        let f: Future = finalize_place_bet(
            market_id,
            outcome,
            amount,
            escrow_id,
            position_hash,
            auth_future,
        );
        return f;
    }

    async function finalize_place_bet(
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field,
        position_hash: field,
        auth_future: Future,
    ) {
        auth_future.await();
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(block.timestamp as u64 < market.close_time);
        assert(!market.is_resolved);
        let pool: PoolState = Mapping::get(pools, market_id);
        assert(!pool.locked);
        // Update pool
        let new_total_no: u64 = (outcome == 0u8) ? pool.total_no + amount : pool.total_no;
        let new_total_yes: u64 = (outcome == 1u8) ? pool.total_yes + amount : pool.total_yes;
        let updated_pool: PoolState = PoolState {
            total_no: new_total_no,
            total_yes: new_total_yes,
            participant_count: pool.participant_count + 1u64,
            locked: pool.locked,
            escrowed_amount: pool.escrowed_amount + amount,
        };
        Mapping::set(pools, market_id, updated_pool);
        Mapping::set(position_to_escrow, position_hash, escrow_id);
    }

    // Generate position record (called by user after on-chain confirmation)
    transition mint_position_record(
        public market_id: field,
        public outcome: u8,
        public amount: u64,
        public escrow_id: field,
    ) -> BetPosition {
        // User generates their own record - only they know the nonce
        // This ensures privacy of the bet details
        let caller_hash: field = BHP256::hash_to_field(self.caller);
        let nonce_seed: field = BHP256::hash_to_field(caller_hash + escrow_id);
        return BetPosition {
            owner: self.caller,
            market_id: market_id,
            outcome: outcome,
            amount: amount,
            escrow_id: escrow_id,
            nonce: BHP256::hash_to_group(nonce_seed),
        };
    }

    // Resolve market - ONLY callable by oracle contract
    async transition resolve_market(
        public market_id: field,
        public winning_outcome: u8,
        public resolver: address,
    ) -> Future {
        // Must be called by the registered oracle contract via factory registry.
        let auth_future: Future = veilmarkets_factory_v5.aleo/verify_is_registered(
            ORACLE_CONTRACT_TYPE,
            self.caller,
        );
        assert(winning_outcome == 0u8 || winning_outcome == 1u8);
        return finalize_resolve_market(market_id, winning_outcome, auth_future);
    }

    async function finalize_resolve_market(
        market_id: field,
        winning_outcome: u8,
        auth_future: Future,
    ) {
        auth_future.await();
        let market: MarketInfo = Mapping::get(markets, market_id);
        // Only oracle can resolve (creator cannot directly resolve anymore)
        assert(block.timestamp as u64 >= market.resolution_time);
        assert(!market.is_resolved);
        market.is_resolved = true;
        market.winning_outcome = winning_outcome;
        market.resolved_by_oracle = true;
        Mapping::set(markets, market_id, market);
        // Lock pool
        let pool: PoolState = Mapping::get(pools, market_id);
        let updated_pool: PoolState = PoolState {
            total_no: pool.total_no,
            total_yes: pool.total_yes,
            participant_count: pool.participant_count,
            locked: true,
            escrowed_amount: pool.escrowed_amount,
        };
        Mapping::set(pools, market_id, updated_pool);
    }

    // Claim winnings - with nullifier anti-replay
    async transition claim_winnings(private position: BetPosition) -> (WinningsClaim, Future) {
        // Generate position hash (verified in finalize)
        let owner_hash: field = BHP256::hash_to_field(position.owner);
        let position_hash: field = BHP256::hash_to_field(
            owner_hash + position.market_id + position.escrow_id,
        );
        // Generate nullifier from position (verified in finalize)
        let amount_field: field = position.amount as field;
        let nullifier: field = BHP256::hash_to_field(
            owner_hash + position.market_id + amount_field + position.outcome as field
                + position.escrow_id,
        );
        let f: Future = finalize_claim_winnings(
            position.market_id,
            position.outcome,
            position.amount,
            position.escrow_id,
            nullifier,
            position_hash,
        );
        // Payout computed in finalize, returned in record
        let claim: WinningsClaim = WinningsClaim {
            owner: position.owner,
            market_id: position.market_id,
            payout_amount: 0u64, // Placeholder
            nullifier: nullifier,
            nonce: BHP256::hash_to_group(nullifier),
        };
        return (claim, f);
    }

    async function finalize_claim_winnings(
        market_id: field,
        bet_outcome: u8,
        bet_amount: u64,
        escrow_id: field,
        nullifier: field,
        position_hash: field,
    ) {
        // Anti-replay: check nullifier not spent
        let is_spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
        assert(!is_spent);
        Mapping::set(spent_nullifiers, nullifier, true);
        // Check escrow link exists and belongs to this position
        let stored_escrow: field = Mapping::get(position_to_escrow, position_hash);
        assert_eq(stored_escrow, escrow_id);
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(market.is_resolved);
        assert_eq(bet_outcome, market.winning_outcome);
        let pool: PoolState = Mapping::get(pools, market_id);
        let winning_pool: u64 = (market.winning_outcome == 0u8) ? pool.total_no : pool.total_yes;
        let total_pool: u64 = pool.total_no + pool.total_yes;
        // Pro-rata payout validation
        let payout: u64 = (bet_amount * total_pool) / winning_pool;
        assert(payout > 0u64);
        Mapping::set(pending_payouts, nullifier, payout);
    }

    // For token contract to verify payout amount
    async transition verify_claim(public nullifier: field, public payout_amount: u64) -> Future {
        let auth_future: Future = veilmarkets_factory_v5.aleo/verify_is_registered(
            TOKEN_CONTRACT_TYPE,
            self.caller,
        );
        return finalize_verify_claim(nullifier, payout_amount, auth_future);
    }

    async function finalize_verify_claim(nullifier: field, payout_amount: u64, auth_future: Future) {
        auth_future.await();
        let stored: u64 = Mapping::get(pending_payouts, nullifier);
        assert_eq(stored, payout_amount);
    }

    // Emergency cancel market (only creator, before close)
    async transition cancel_market(public market_id: field) -> Future {
        return finalize_cancel_market(market_id, self.caller);
    }

    async function finalize_cancel_market(market_id: field, caller: address) {
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert_eq(caller, market.creator);
        assert(block.timestamp as u64 < market.close_time);
        assert(!market.is_resolved);
        // Mark as resolved with special cancel code (3u8)
        market.is_resolved = true;
        market.winning_outcome = 3u8; // Cancelled
        Mapping::set(markets, market_id, market);
        let pool: PoolState = Mapping::get(pools, market_id);
        let updated_pool: PoolState = PoolState {
            total_no: pool.total_no,
            total_yes: pool.total_yes,
            participant_count: pool.participant_count,
            locked: true,
            escrowed_amount: pool.escrowed_amount,
        };
        Mapping::set(pools, market_id, updated_pool);
    }
}
