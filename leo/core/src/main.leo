// VeilMarkets Core (v9)
// Share-based pricing engine with dynamic outcomes and governance-bound params.
import veilmarkets_factory_v9.aleo;

program veilmarkets_v9.aleo {
    const OUTCOME_UNRESOLVED: u8 = 254u8;
    const OUTCOME_CANCELLED: u8 = 255u8;

    const TOKEN_CONTRACT_TYPE: u8 = 1u8;
    const ORACLE_CONTRACT_TYPE: u8 = 2u8;
    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;

    const PARAM_MAX_OUTCOMES: u8 = 0u8;
    const PARAM_FEE_BPS: u8 = 1u8;
    const PARAM_MIN_TRADE: u8 = 2u8;
    const PARAM_MIN_LIQUIDITY: u8 = 3u8;
    const PARAM_VIRTUAL_LIQ: u8 = 4u8;

    const FEE_TREASURY_KEY: u8 = 0u8;

    const DEFAULT_MAX_OUTCOMES: u8 = 32u8;
    const DEFAULT_FEE_BPS: u64 = 100u64; // 1%
    const DEFAULT_MIN_TRADE: u64 = 1000000u64;
    const DEFAULT_MIN_LIQUIDITY: u64 = 1000000u64;
    const DEFAULT_VIRTUAL_LIQ: u64 = 10000000u64;

    struct MarketInfo {
        creator: address,
        title_hash: field,
        category: u8,
        market_type: u8, // 0 binary, 1 categorical
        outcome_count: u8, // 2..protocol max (default 32)
        close_time: u64,
        resolution_time: u64,
        is_resolved: bool,
        winning_outcome: u8,
        resolved_by_oracle: bool,
        token_id: address,
    }

    // Compatibility cache for fast reads in existing UI paths.
    // This does NOT cap markets to 8 outcomes; authoritative per-outcome state is in
    // `outcome_exposure` / `outcome_share_supply` mappings for all 0..31 indices.
    struct PoolState {
        total_outcome_0: u64,
        total_outcome_1: u64,
        total_outcome_2: u64,
        total_outcome_3: u64,
        total_outcome_4: u64,
        total_outcome_5: u64,
        total_outcome_6: u64,
        total_outcome_7: u64,
        participant_count: u64,
        locked: bool,
        total_collateral: u64,
        total_shares: u64,
        lp_supply: u64,
    }

    // Compatibility record name retained for existing frontend flows.
    record BetPosition {
        owner: address,
        position_id: field,
        market_id: field,
        outcome: u8,
        amount: u64, // mirrors collateral_in for compatibility
        escrow_id: field, // mirrors position_id for compatibility
        shares: u64,
        collateral_in: u64,
        nonce: group,
    }

    record WinningsClaim {
        owner: address,
        market_id: field,
        payout_amount: u64,
        nullifier: field,
        nonce: group,
    }

    struct PositionState {
        holder: address,
        market_id: field,
        outcome: u8,
        shares: u64,
        collateral_in: u64,
        token_id: address,
        is_closed: bool,
    }

    struct PayoutClaim {
        amount: u64,
        token_id: address,
    }

    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;

    // Dynamic market state.
    mapping outcome_exposure: field => u64; // key = hash(market_id + outcome_idx)
    mapping outcome_share_supply: field => u64; // key = hash(market_id + outcome_idx)

    // Mint + position ownership/state.
    mapping position_to_escrow: field => field; // key = position_id => escrow_id
    mapping position_owner_commitments: field => field; // key = position_id => hash(owner + position_id)
    mapping minted_positions: field => bool; // key = position_id
    mapping positions: field => PositionState; // key = position_id
    mapping pending_position_market: field => field; // key = position_id => market_id
    mapping pending_position_outcome: field => u8; // key = position_id => outcome
    mapping pending_position_collateral: field => u64; // key = position_id => collateral_in
    mapping pending_position_shares: field => u64; // key = position_id => shares

    // Claims.
    mapping spent_nullifiers: field => bool;
    mapping pending_payouts: field => PayoutClaim; // nullifier => payout/token contract

    // Protocol params + treasury accounting.
    mapping protocol_u8: u8 => u8;
    mapping protocol_u64: u8 => u64;
    mapping protocol_fees: u8 => u64;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    inline outcome_key(market_id: field, outcome: u8) -> field {
        // Keep key derivation arithmetic so the frontend can fetch dynamic mappings
        // for outcomes > 8 without requiring an off-chain BHP helper.
        return market_id + outcome as field;
    }

    inline mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
        assert(denom > 0u64);
        let a128: u128 = a as u128;
        let b128: u128 = b as u128;
        let d128: u128 = denom as u128;
        let result: u128 = (a128 * b128) / d128;
        return result as u64;
    }

    inline calc_total_liquidity(
        pool_collateral: u64,
        outcome_count: u8,
        virtual_liq: u64,
    ) -> u64 {
        let oc: u64 = outcome_count as u64;
        return pool_collateral + (virtual_liq * oc);
    }

    inline calc_outcome_liquidity(
        pool_collateral: u64,
        outcome_count: u8,
        virtual_liq: u64,
        outcome_exposure_value: u64,
    ) -> u64 {
        let oc: u64 = outcome_count as u64;
        let base_liq: u64 = (pool_collateral / oc) + virtual_liq;
        return base_liq + outcome_exposure_value;
    }

    inline calc_buy_shares(
        pool_collateral: u64,
        outcome_count: u8,
        virtual_liq: u64,
        outcome_exposure_value: u64,
        net_collateral_in: u64,
    ) -> u64 {
        let total_liq: u64 = calc_total_liquidity(pool_collateral, outcome_count, virtual_liq);
        let outcome_liq: u64 = calc_outcome_liquidity(
            pool_collateral,
            outcome_count,
            virtual_liq,
            outcome_exposure_value,
        );
        let raw_shares: u64 = mul_div_u64(net_collateral_in, total_liq, outcome_liq);
        return (raw_shares == 0u64) ? 1u64 : raw_shares;
    }

    inline calc_sell_payout(
        pool_collateral: u64,
        outcome_count: u8,
        virtual_liq: u64,
        outcome_exposure_value: u64,
        shares_to_sell: u64,
    ) -> u64 {
        let total_liq: u64 = calc_total_liquidity(pool_collateral, outcome_count, virtual_liq);
        let outcome_liq: u64 = calc_outcome_liquidity(
            pool_collateral,
            outcome_count,
            virtual_liq,
            outcome_exposure_value,
        );
        return mul_div_u64(shares_to_sell, outcome_liq, total_liq);
    }

    async transition create_market(
        public title_hash: field,
        public category: u8,
        public market_type: u8,
        public outcome_count: u8,
        public close_time: u64,
        public resolution_time: u64,
        public token_id: address,
    ) -> Future {
        let auth_future: Future = veilmarkets_factory_v9.aleo/verify_is_registered(
            TOKEN_CONTRACT_TYPE,
            token_id,
        );
        let market_id: field = BHP256::hash_to_field(title_hash + self.caller as field);
        return finalize_create_market(
            market_id,
            self.caller,
            title_hash,
            category,
            market_type,
            outcome_count,
            close_time,
            resolution_time,
            token_id,
            auth_future,
        );
    }

    async function finalize_create_market(
        market_id: field,
        creator: address,
        title_hash: field,
        category: u8,
        market_type: u8,
        outcome_count: u8,
        close_time: u64,
        resolution_time: u64,
        token_id: address,
        auth_future: Future,
    ) {
        auth_future.await();
        let exists: bool = Mapping::contains(markets, market_id);
        assert(!exists);

        assert(category <= 6u8);
        assert(market_type <= 1u8);

        let max_outcomes: u8 = Mapping::get_or_use(
            protocol_u8,
            PARAM_MAX_OUTCOMES,
            DEFAULT_MAX_OUTCOMES,
        );
        assert(max_outcomes >= 2u8);
        assert(max_outcomes <= 32u8);
        assert(outcome_count >= 2u8);
        assert(outcome_count <= max_outcomes);

        if (market_type == 0u8) {
            assert_eq(outcome_count, 2u8);
        }

        assert(close_time > block.timestamp as u64);
        assert(resolution_time > close_time);

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

        let pool: PoolState = PoolState {
            total_outcome_0: 0u64,
            total_outcome_1: 0u64,
            total_outcome_2: 0u64,
            total_outcome_3: 0u64,
            total_outcome_4: 0u64,
            total_outcome_5: 0u64,
            total_outcome_6: 0u64,
            total_outcome_7: 0u64,
            participant_count: 0u64,
            locked: false,
            total_collateral: 0u64,
            total_shares: 0u64,
            lp_supply: 0u64,
        };

        Mapping::set(markets, market_id, market);
        Mapping::set(pools, market_id, pool);
    }

    // Compatibility entrypoint retained; internally routes to share engine.
    async transition place_bet(
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field,
        owner_commitment: field,
    ) -> Future {
        return finalize_buy_shares(
            market_id,
            outcome,
            amount,
            1u64,
            escrow_id,
            owner_commitment,
            self.caller,
        );
    }

    async transition buy_shares(
        public market_id: field,
        public outcome: u8,
        public collateral_in: u64,
        public min_shares_out: u64,
        public share_commitment: field,
        public owner_commitment: field,
    ) -> Future {
        return finalize_buy_shares(
            market_id,
            outcome,
            collateral_in,
            min_shares_out,
            share_commitment,
            owner_commitment,
            self.caller,
        );
    }

    async function finalize_buy_shares(
        market_id: field,
        outcome: u8,
        collateral_in: u64,
        min_shares_out: u64,
        share_commitment: field,
        owner_commitment: field,
        caller: address,
    ) {
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert_eq(market.token_id, caller);
        assert(!market.is_resolved);
        assert(block.timestamp as u64 < market.close_time);
        assert(outcome < market.outcome_count);

        let min_trade: u64 = Mapping::get_or_use(
            protocol_u64,
            PARAM_MIN_TRADE,
            DEFAULT_MIN_TRADE,
        );
        assert(collateral_in >= min_trade);

        let fee_bps: u64 = Mapping::get_or_use(
            protocol_u64,
            PARAM_FEE_BPS,
            DEFAULT_FEE_BPS,
        );
        assert(fee_bps <= 10000u64);
        let fee: u64 = mul_div_u64(collateral_in, fee_bps, 10000u64);
        let net_collateral_in: u64 = collateral_in - fee;
        assert(net_collateral_in > 0u64);

        let pool: PoolState = Mapping::get(pools, market_id);
        assert(!pool.locked);

        let exposure_key: field = outcome_key(market_id, outcome);
        let current_exposure: u64 = Mapping::get_or_use(outcome_exposure, exposure_key, 0u64);
        let current_supply: u64 = Mapping::get_or_use(outcome_share_supply, exposure_key, 0u64);

        let virtual_liq: u64 = Mapping::get_or_use(
            protocol_u64,
            PARAM_VIRTUAL_LIQ,
            DEFAULT_VIRTUAL_LIQ,
        );
        assert(virtual_liq > 0u64);

        let shares_out: u64 = calc_buy_shares(
            pool.total_collateral,
            market.outcome_count,
            virtual_liq,
            current_exposure,
            net_collateral_in,
        );
        assert(shares_out >= min_shares_out);
        let already_linked: bool = Mapping::contains(position_to_escrow, share_commitment);
        assert(!already_linked);
        let already_minted: bool = Mapping::get_or_use(minted_positions, share_commitment, false);
        assert(!already_minted);

        let new_exposure: u64 = current_exposure + net_collateral_in;
        let new_supply: u64 = current_supply + shares_out;
        Mapping::set(outcome_exposure, exposure_key, new_exposure);
        Mapping::set(outcome_share_supply, exposure_key, new_supply);

        let new_total_0: u64 =
            (outcome == 0u8) ? new_exposure : pool.total_outcome_0;
        let new_total_1: u64 =
            (outcome == 1u8) ? new_exposure : pool.total_outcome_1;
        let new_total_2: u64 =
            (outcome == 2u8) ? new_exposure : pool.total_outcome_2;
        let new_total_3: u64 =
            (outcome == 3u8) ? new_exposure : pool.total_outcome_3;
        let new_total_4: u64 =
            (outcome == 4u8) ? new_exposure : pool.total_outcome_4;
        let new_total_5: u64 =
            (outcome == 5u8) ? new_exposure : pool.total_outcome_5;
        let new_total_6: u64 =
            (outcome == 6u8) ? new_exposure : pool.total_outcome_6;
        let new_total_7: u64 =
            (outcome == 7u8) ? new_exposure : pool.total_outcome_7;

        let updated_pool: PoolState = PoolState {
            total_outcome_0: new_total_0,
            total_outcome_1: new_total_1,
            total_outcome_2: new_total_2,
            total_outcome_3: new_total_3,
            total_outcome_4: new_total_4,
            total_outcome_5: new_total_5,
            total_outcome_6: new_total_6,
            total_outcome_7: new_total_7,
            participant_count: pool.participant_count + 1u64,
            locked: pool.locked,
            total_collateral: pool.total_collateral + net_collateral_in,
            total_shares: pool.total_shares + shares_out,
            lp_supply: pool.lp_supply,
        };
        Mapping::set(pools, market_id, updated_pool);

        let accrued_fee: u64 = Mapping::get_or_use(protocol_fees, FEE_TREASURY_KEY, 0u64);
        Mapping::set(protocol_fees, FEE_TREASURY_KEY, accrued_fee + fee);
        Mapping::set(position_to_escrow, share_commitment, share_commitment);
        Mapping::set(position_owner_commitments, share_commitment, owner_commitment);
        Mapping::set(pending_position_market, share_commitment, market_id);
        Mapping::set(pending_position_outcome, share_commitment, outcome);
        Mapping::set(pending_position_collateral, share_commitment, collateral_in);
        Mapping::set(pending_position_shares, share_commitment, shares_out);
    }

    async transition fund_pool(
        public market_id: field,
        public amount: u64,
        public lp_position_id: field,
        public owner_commitment: field,
    ) -> Future {
        return finalize_fund_pool(
            market_id,
            amount,
            lp_position_id,
            owner_commitment,
            self.caller,
        );
    }

    async function finalize_fund_pool(
        market_id: field,
        amount: u64,
        lp_position_id: field,
        owner_commitment: field,
        caller: address,
    ) {
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert_eq(market.token_id, caller);
        assert(!market.is_resolved);
        assert(block.timestamp as u64 < market.close_time);

        let min_liquidity: u64 = Mapping::get_or_use(
            protocol_u64,
            PARAM_MIN_LIQUIDITY,
            DEFAULT_MIN_LIQUIDITY,
        );
        assert(amount >= min_liquidity);

        let already_minted: bool = Mapping::get_or_use(minted_positions, lp_position_id, false);
        assert(!already_minted);
        let already_linked: bool = Mapping::contains(position_to_escrow, lp_position_id);
        assert(!already_linked);

        let pool: PoolState = Mapping::get(pools, market_id);
        assert(!pool.locked);
        let updated_pool: PoolState = PoolState {
            total_outcome_0: pool.total_outcome_0,
            total_outcome_1: pool.total_outcome_1,
            total_outcome_2: pool.total_outcome_2,
            total_outcome_3: pool.total_outcome_3,
            total_outcome_4: pool.total_outcome_4,
            total_outcome_5: pool.total_outcome_5,
            total_outcome_6: pool.total_outcome_6,
            total_outcome_7: pool.total_outcome_7,
            participant_count: pool.participant_count + 1u64,
            locked: pool.locked,
            total_collateral: pool.total_collateral + amount,
            total_shares: pool.total_shares,
            lp_supply: pool.lp_supply + amount,
        };
        Mapping::set(pools, market_id, updated_pool);
        Mapping::set(position_to_escrow, lp_position_id, lp_position_id);
        Mapping::set(position_owner_commitments, lp_position_id, owner_commitment);
        Mapping::set(pending_position_market, lp_position_id, market_id);
        Mapping::set(pending_position_outcome, lp_position_id, OUTCOME_CANCELLED);
        Mapping::set(pending_position_collateral, lp_position_id, amount);
        Mapping::set(pending_position_shares, lp_position_id, amount);
    }

    // Compatibility mint function kept for existing frontend flow.
    async transition mint_position_record(
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field,
    ) -> (BetPosition, Future) {
        // `amount` is kept for compatibility with existing wallet/frontend flows.
        // Canonical share + collateral values are enforced from pending mappings in finalize.
        let position: BetPosition = BetPosition {
            owner: self.signer,
            position_id: escrow_id,
            market_id: market_id,
            outcome: outcome,
            amount: amount,
            escrow_id: escrow_id,
            shares: amount,
            collateral_in: amount,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        let f: Future = finalize_mint_position_record(
            escrow_id,
            market_id,
            outcome,
            amount,
            self.caller,
        );
        return (position, f);
    }

    async transition mint_share_record(
        public share_commitment: field,
        public market_id: field,
        public outcome: u8,
        public collateral_in: u64,
    ) -> (BetPosition, Future) {
        // Compatibility payload: finalize reads authoritative pending position state
        // (`pending_position_collateral` / `pending_position_shares`) before minting.
        let position: BetPosition = BetPosition {
            owner: self.signer,
            position_id: share_commitment,
            market_id: market_id,
            outcome: outcome,
            amount: collateral_in,
            escrow_id: share_commitment,
            shares: collateral_in,
            collateral_in: collateral_in,
            nonce: BHP256::hash_to_group(share_commitment),
        };

        let f: Future = finalize_mint_position_record(
            share_commitment,
            market_id,
            outcome,
            collateral_in,
            self.caller,
        );
        return (position, f);
    }

    async function finalize_mint_position_record(
        position_id: field,
        market_id: field,
        outcome: u8,
        collateral_in: u64,
        caller: address,
    ) {
        let stored_escrow: field = Mapping::get(position_to_escrow, position_id);
        assert_eq(stored_escrow, position_id);
        let stored_owner_commitment: field = Mapping::get(position_owner_commitments, position_id);
        let expected_owner_commitment: field =
            BHP256::hash_to_field(caller as field + position_id);
        assert_eq(stored_owner_commitment, expected_owner_commitment);

        let pending_market_id: field = Mapping::get(pending_position_market, position_id);
        let pending_outcome: u8 = Mapping::get(pending_position_outcome, position_id);
        let pending_collateral: u64 = Mapping::get(pending_position_collateral, position_id);
        let pending_shares: u64 = Mapping::get(pending_position_shares, position_id);
        assert_eq(pending_market_id, market_id);
        assert_eq(pending_outcome, outcome);
        assert_eq(pending_collateral, collateral_in);

        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(outcome < market.outcome_count || outcome == OUTCOME_CANCELLED);

        let already_minted: bool = Mapping::get_or_use(minted_positions, position_id, false);
        assert(!already_minted);
        Mapping::set(minted_positions, position_id, true);

        let state: PositionState = PositionState {
            holder: caller,
            market_id: market_id,
            outcome: outcome,
            shares: pending_shares,
            collateral_in: pending_collateral,
            token_id: market.token_id,
            is_closed: false,
        };
        Mapping::set(positions, position_id, state);
    }

    async transition sell_shares(
        private position: BetPosition,
        public shares_to_sell: u64,
        public min_payout: u64,
        public sell_nonce: field,
    ) -> (BetPosition, WinningsClaim, Future) {
        assert(shares_to_sell > 0u64);
        let remaining_shares: u64 = position.shares;
        let remaining_collateral: u64 = position.collateral_in;

        let updated_position: BetPosition = BetPosition {
            owner: position.owner,
            position_id: position.position_id,
            market_id: position.market_id,
            outcome: position.outcome,
            amount: remaining_collateral,
            escrow_id: position.escrow_id,
            shares: remaining_shares,
            collateral_in: remaining_collateral,
            nonce: BHP256::hash_to_group(position.escrow_id + sell_nonce),
        };

        let nullifier: field = BHP256::hash_to_field(
            position.position_id + shares_to_sell as field + sell_nonce,
        );

        let claim: WinningsClaim = WinningsClaim {
            owner: position.owner,
            market_id: position.market_id,
            payout_amount: 0u64,
            nullifier: nullifier,
            nonce: BHP256::hash_to_group(nullifier),
        };

        let f: Future = finalize_sell_shares(
            position.position_id,
            position.market_id,
            position.outcome,
            position.shares,
            position.collateral_in,
            shares_to_sell,
            min_payout,
            remaining_shares,
            remaining_collateral,
            nullifier,
            self.caller,
        );

        return (updated_position, claim, f);
    }

    async function finalize_sell_shares(
        position_id: field,
        market_id: field,
        outcome: u8,
        shares_before: u64,
        collateral_before: u64,
        shares_to_sell: u64,
        min_payout: u64,
        remaining_shares: u64,
        remaining_collateral: u64,
        nullifier: field,
        caller: address,
    ) {
        let spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
        assert(!spent);
        Mapping::set(spent_nullifiers, nullifier, true);

        let state: PositionState = Mapping::get(positions, position_id);
        assert(!state.is_closed);
        assert_eq(state.holder, caller);
        assert_eq(state.market_id, market_id);
        assert_eq(state.outcome, outcome);
        assert_eq(state.shares >= shares_to_sell, true);

        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(!market.is_resolved);
        assert(block.timestamp as u64 < market.close_time);

        let pool: PoolState = Mapping::get(pools, market_id);
        assert(!pool.locked);

        let exposure_key: field = outcome_key(market_id, outcome);
        let current_exposure: u64 = Mapping::get_or_use(outcome_exposure, exposure_key, 0u64);
        let current_supply: u64 = Mapping::get_or_use(outcome_share_supply, exposure_key, 0u64);
        assert(current_supply >= shares_to_sell);

        let virtual_liq: u64 = Mapping::get_or_use(
            protocol_u64,
            PARAM_VIRTUAL_LIQ,
            DEFAULT_VIRTUAL_LIQ,
        );
        assert(virtual_liq > 0u64);

        let gross_payout: u64 = calc_sell_payout(
            pool.total_collateral,
            market.outcome_count,
            virtual_liq,
            current_exposure,
            shares_to_sell,
        );

        let fee_bps: u64 = Mapping::get_or_use(
            protocol_u64,
            PARAM_FEE_BPS,
            DEFAULT_FEE_BPS,
        );
        assert(fee_bps <= 10000u64);
        let fee: u64 = mul_div_u64(gross_payout, fee_bps, 10000u64);
        let net_payout: u64 = gross_payout - fee;
        assert(net_payout >= min_payout);

        assert(current_exposure >= gross_payout);
        assert(pool.total_collateral >= gross_payout);
        assert(pool.total_shares >= shares_to_sell);

        let new_exposure: u64 = current_exposure - gross_payout;
        let new_supply: u64 = current_supply - shares_to_sell;
        Mapping::set(outcome_exposure, exposure_key, new_exposure);
        Mapping::set(outcome_share_supply, exposure_key, new_supply);

        let new_total_0: u64 =
            (outcome == 0u8) ? new_exposure : pool.total_outcome_0;
        let new_total_1: u64 =
            (outcome == 1u8) ? new_exposure : pool.total_outcome_1;
        let new_total_2: u64 =
            (outcome == 2u8) ? new_exposure : pool.total_outcome_2;
        let new_total_3: u64 =
            (outcome == 3u8) ? new_exposure : pool.total_outcome_3;
        let new_total_4: u64 =
            (outcome == 4u8) ? new_exposure : pool.total_outcome_4;
        let new_total_5: u64 =
            (outcome == 5u8) ? new_exposure : pool.total_outcome_5;
        let new_total_6: u64 =
            (outcome == 6u8) ? new_exposure : pool.total_outcome_6;
        let new_total_7: u64 =
            (outcome == 7u8) ? new_exposure : pool.total_outcome_7;

        let updated_pool: PoolState = PoolState {
            total_outcome_0: new_total_0,
            total_outcome_1: new_total_1,
            total_outcome_2: new_total_2,
            total_outcome_3: new_total_3,
            total_outcome_4: new_total_4,
            total_outcome_5: new_total_5,
            total_outcome_6: new_total_6,
            total_outcome_7: new_total_7,
            participant_count: pool.participant_count,
            locked: pool.locked,
            total_collateral: pool.total_collateral - gross_payout,
            total_shares: pool.total_shares - shares_to_sell,
            lp_supply: pool.lp_supply,
        };
        Mapping::set(pools, market_id, updated_pool);

        let accrued_fee: u64 = Mapping::get_or_use(protocol_fees, FEE_TREASURY_KEY, 0u64);
        Mapping::set(protocol_fees, FEE_TREASURY_KEY, accrued_fee + fee);

        let sold_collateral: u64 = mul_div_u64(
            state.collateral_in,
            shares_to_sell,
            state.shares,
        );
        let remaining_shares_actual: u64 = state.shares - shares_to_sell;
        let remaining_collateral_actual: u64 = state.collateral_in - sold_collateral;

        let updated_state: PositionState = PositionState {
            holder: state.holder,
            market_id: state.market_id,
            outcome: state.outcome,
            shares: remaining_shares_actual,
            collateral_in: remaining_collateral_actual,
            token_id: state.token_id,
            is_closed: remaining_shares_actual == 0u64,
        };
        Mapping::set(positions, position_id, updated_state);

        let claim: PayoutClaim = PayoutClaim {
            amount: net_payout,
            token_id: market.token_id,
        };
        Mapping::set(pending_payouts, nullifier, claim);
    }

    async transition claim_winnings(private position: BetPosition) -> (WinningsClaim, Future) {
        let owner_hash: field = BHP256::hash_to_field(position.owner);
        let nullifier: field = BHP256::hash_to_field(
            owner_hash + position.position_id + position.shares as field,
        );

        let claim: WinningsClaim = WinningsClaim {
            owner: position.owner,
            market_id: position.market_id,
            payout_amount: 0u64,
            nullifier: nullifier,
            nonce: BHP256::hash_to_group(nullifier),
        };

        let f: Future = finalize_claim_winnings(
            position.position_id,
            position.market_id,
            position.outcome,
            position.shares,
            position.collateral_in,
            nullifier,
            self.caller,
        );
        return (claim, f);
    }

    async function finalize_claim_winnings(
        position_id: field,
        market_id: field,
        outcome: u8,
        shares: u64,
        collateral_in: u64,
        nullifier: field,
        caller: address,
    ) {
        let spent: bool = Mapping::get_or_use(spent_nullifiers, nullifier, false);
        assert(!spent);
        Mapping::set(spent_nullifiers, nullifier, true);

        let state: PositionState = Mapping::get(positions, position_id);
        assert(!state.is_closed);
        assert_eq(state.holder, caller);
        assert_eq(state.market_id, market_id);
        assert_eq(state.outcome, outcome);
        assert(state.shares > 0u64);

        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(market.is_resolved);

        let pool: PoolState = Mapping::get(pools, market_id);
        let is_cancelled: bool = market.winning_outcome == OUTCOME_CANCELLED;
        let winner_key: field = outcome_key(market_id, market.winning_outcome);
        let winner_supply_raw: u64 = Mapping::get_or_use(outcome_share_supply, winner_key, 0u64);
        assert(is_cancelled || outcome == market.winning_outcome);
        assert(is_cancelled || winner_supply_raw > 0u64);
        let winner_supply: u64 = is_cancelled ? 1u64 : winner_supply_raw;
        let winner_payout: u64 = mul_div_u64(state.shares, pool.total_collateral, winner_supply);
        let payout: u64 = is_cancelled ? state.collateral_in : winner_payout;
        assert(payout > 0u64);

        let claim: PayoutClaim = PayoutClaim {
            amount: payout,
            token_id: market.token_id,
        };
        Mapping::set(pending_payouts, nullifier, claim);

        let closed: PositionState = PositionState {
            holder: state.holder,
            market_id: state.market_id,
            outcome: state.outcome,
            shares: 0u64,
            collateral_in: 0u64,
            token_id: state.token_id,
            is_closed: true,
        };
        Mapping::set(positions, position_id, closed);
    }

    async transition verify_claim(public nullifier: field, public payout_amount: u64) -> Future {
        return finalize_verify_claim(nullifier, payout_amount, self.caller);
    }

    async function finalize_verify_claim(nullifier: field, payout_amount: u64, caller: address) {
        let stored: PayoutClaim = Mapping::get(pending_payouts, nullifier);
        assert_eq(stored.amount, payout_amount);
        assert_eq(stored.token_id, caller);

        let consumed: PayoutClaim = PayoutClaim {
            amount: 0u64,
            token_id: caller,
        };
        Mapping::set(pending_payouts, nullifier, consumed);
    }

    async transition resolve_market(
        public market_id: field,
        public winning_outcome: u8,
        public resolver: address,
    ) -> Future {
        assert(resolver != self.address);
        let auth_future: Future = veilmarkets_factory_v9.aleo/verify_is_registered(
            ORACLE_CONTRACT_TYPE,
            self.caller,
        );
        return finalize_resolve_market(market_id, winning_outcome, auth_future);
    }

    async function finalize_resolve_market(
        market_id: field,
        winning_outcome: u8,
        auth_future: Future,
    ) {
        auth_future.await();
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(!market.is_resolved);
        assert(block.timestamp as u64 >= market.resolution_time);
        assert(winning_outcome < market.outcome_count);

        market.is_resolved = true;
        market.winning_outcome = winning_outcome;
        market.resolved_by_oracle = true;
        Mapping::set(markets, market_id, market);

        let pool: PoolState = Mapping::get(pools, market_id);
        let updated_pool: PoolState = PoolState {
            total_outcome_0: pool.total_outcome_0,
            total_outcome_1: pool.total_outcome_1,
            total_outcome_2: pool.total_outcome_2,
            total_outcome_3: pool.total_outcome_3,
            total_outcome_4: pool.total_outcome_4,
            total_outcome_5: pool.total_outcome_5,
            total_outcome_6: pool.total_outcome_6,
            total_outcome_7: pool.total_outcome_7,
            participant_count: pool.participant_count,
            locked: true,
            total_collateral: pool.total_collateral,
            total_shares: pool.total_shares,
            lp_supply: pool.lp_supply,
        };
        Mapping::set(pools, market_id, updated_pool);
    }

    async transition cancel_market(public market_id: field) -> Future {
        return finalize_cancel_market(market_id, self.caller);
    }

    async function finalize_cancel_market(market_id: field, caller: address) {
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert_eq(market.creator, caller);
        assert(!market.is_resolved);
        assert(block.timestamp as u64 < market.close_time);

        market.is_resolved = true;
        market.winning_outcome = OUTCOME_CANCELLED;
        market.resolved_by_oracle = false;
        Mapping::set(markets, market_id, market);

        let pool: PoolState = Mapping::get(pools, market_id);
        let updated_pool: PoolState = PoolState {
            total_outcome_0: pool.total_outcome_0,
            total_outcome_1: pool.total_outcome_1,
            total_outcome_2: pool.total_outcome_2,
            total_outcome_3: pool.total_outcome_3,
            total_outcome_4: pool.total_outcome_4,
            total_outcome_5: pool.total_outcome_5,
            total_outcome_6: pool.total_outcome_6,
            total_outcome_7: pool.total_outcome_7,
            participant_count: pool.participant_count,
            locked: true,
            total_collateral: pool.total_collateral,
            total_shares: pool.total_shares,
            lp_supply: pool.lp_supply,
        };
        Mapping::set(pools, market_id, updated_pool);
    }

    async transition set_protocol_u64(public param_key: u8, public value: u64) -> Future {
        let auth: Future = veilmarkets_factory_v9.aleo/verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            self.caller,
        );
        return finalize_set_protocol_u64(param_key, value, auth);
    }

    async function finalize_set_protocol_u64(param_key: u8, value: u64, auth: Future) {
        auth.await();
        if (param_key == PARAM_FEE_BPS) {
            assert(value <= 2000u64);
        }
        if (param_key == PARAM_MIN_TRADE || param_key == PARAM_MIN_LIQUIDITY) {
            assert(value >= 1u64);
        }
        if (param_key == PARAM_VIRTUAL_LIQ) {
            assert(value > 0u64);
        }
        Mapping::set(protocol_u64, param_key, value);
    }

    async transition set_protocol_u8(public param_key: u8, public value: u8) -> Future {
        let auth: Future = veilmarkets_factory_v9.aleo/verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            self.caller,
        );
        return finalize_set_protocol_u8(param_key, value, auth);
    }

    async function finalize_set_protocol_u8(param_key: u8, value: u8, auth: Future) {
        auth.await();
        if (param_key == PARAM_MAX_OUTCOMES) {
            assert(value >= 2u8);
            assert(value <= 32u8);
        }
        Mapping::set(protocol_u8, param_key, value);
    }
}
