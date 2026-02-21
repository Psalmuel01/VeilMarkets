// VeilMarkets Token
// Integrated escrow with cross-contract validation
// Handles credits, escrow, payouts with nullifier tracking

import veilmarkets.aleo;
import veilmarkets_factory.aleo;

program vmtoken.aleo {

    // Records
    
    record Credits {
        owner: address,
        amount: u64,
        nonce: group,
    }
    
    record EscrowedBet {
        owner: address,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,          // Unique identifier
        core_position_hash: field, // Links to core contract
        nonce: group,
    }

    record PayoutReceipt {
        owner: address,
        amount: u64,
        market_id: field,
        escrow_id: field,
        nonce: group,
    }

    // Mappings
    mapping market_escrow: field => u64;           // Total per market
    mapping escrow_details: field => EscrowedBet;  // escrow_id => details (encrypted)
    mapping spent_escrow: field => bool;           // Prevent double-release
    mapping platform_fees: u8 => u64;              // Fee treasury
    mapping user_escrow_index: address => u64;     // Nonce counter

    // Constants
    const CORE_CONTRACT: address = aleo1...; // Set at deployment
    const ORACLE_CONTRACT: address = aleo1...;
    const PLATFORM_FEE_BPS: u64 = 100u64; // 1%
    const MIN_BET: u64 = 1000000u64; // 1 credit minimum

    // Initialize
    @admin(address="aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc")
    async constructor() {}

    // Verify caller is core or oracle contract
    inline verify_contract_caller() {
        assert(self.caller == CORE_CONTRACT || self.caller == ORACLE_CONTRACT);
    }

    // Faucet for testing
    transition faucet(public amount: u64) -> Credits {
        assert(amount <= 1000000000000u64); // Max 1M credits
        return Credits {
            owner: self.caller,
            amount: amount,
            nonce: BHP256::hash_to_group(self.caller + amount + block.height as field),
        };
    }

    // Deposit and place bet - ATOMIC operation
    async transition place_bet(
        credits: Credits,
        public market_id: field,
        public outcome: u8,
        public bet_amount: u64,
    ) -> (Credits, EscrowedBet, Future) {
        // Validate
        assert(credits.amount >= bet_amount);
        assert(bet_amount >= MIN_BET);
        assert(outcome == 0u8 || outcome == 1u8);

        // Generate unique escrow ID
        let user_nonce: u64 = Mapping::get_or_use(user_escrow_index, self.caller, 0u64);
        let escrow_id: field = BHP256::hash_to_field(self.caller + market_id + bet_amount + user_nonce);
        
        let core_position_hash: field = BHP256::hash_to_field(self.caller + market_id + escrow_id);

        let escrowed: EscrowedBet = EscrowedBet {
            owner: self.caller,
            market_id: market_id,
            amount: bet_amount,
            outcome: outcome,
            escrow_id: escrow_id,
            core_position_hash: core_position_hash,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        let change: Credits = Credits {
            owner: self.caller,
            amount: credits.amount - bet_amount,
            nonce: BHP256::hash_to_group(credits.amount - bet_amount),
        };

        let f: Future = finalize_place_bet(
            market_id,
            bet_amount,
            escrow_id,
            self.caller,
            user_nonce,
            outcome,
            core_position_hash
        );

        return (change, escrowed, f);
    }

    async function finalize_place_bet(
        market_id: field,
        amount: u64,
        escrow_id: field,
        bettor: address,
        user_nonce: u64,
        outcome: u8,
        core_position_hash: field,
    ) {
        // Update escrow total
        let current_escrow: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_escrow + amount);

        // Increment user nonce
        Mapping::set(user_escrow_index, bettor, user_nonce + 1u64);

        // Store escrow details (for refund/cancel scenarios)
        // Note: In production, encrypt this or store only hash
        let escrow_stub: EscrowedBet = EscrowedBet {
            owner: bettor,
            market_id: market_id,
            amount: amount,
            outcome: outcome,
            escrow_id: escrow_id,
            core_position_hash: core_position_hash,
            nonce: BHP256::hash_to_group(escrow_id),
        };
        Mapping::set(escrow_details, escrow_id, escrow_stub);

        // Call core contract to register bet
        // This links token escrow to core position
        let core_future: Future = veilmarkets.aleo/place_bet(
            market_id,
            outcome,
            amount,
            escrow_id,
            bettor
        );
    }

    // Claim payout - verifies with core contract first
    async transition claim_payout(
        escrowed: EscrowedBet,
        private position_proof: field, // ZK proof of position ownership
    ) -> (Credits, Future) {
        // Verify escrow not already spent
        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrowed.escrow_id, false);
        assert(!is_spent);

        // Call core contract to verify win and calculate payout
        let core_result: Future = veilmarkets.aleo/claim_winnings(
            BetPosition {
                owner: escrowed.owner,
                market_id: escrowed.market_id,
                outcome: escrowed.outcome,
                amount: escrowed.amount,
                escrow_id: escrowed.escrow_id,
                nonce: BHP256::hash_to_group(escrowed.escrow_id),
            }
        );

        let f: Future = finalize_claim_payout(
            escrowed.market_id,
            escrowed.escrow_id,
            escrowed.amount,
            escrowed.owner,
            core_result
        );

        // Placeholder - actual amount computed in finalize
        let payout: Credits = Credits {
            owner: escrowed.owner,
            amount: 0u64,
            nonce: BHP256::hash_to_group(escrowed.escrow_id),
        };

        return (payout, f);
    }

    async function finalize_claim_payout(
        market_id: field,
        escrow_id: field,
        bet_amount: u64,
        claimant: address,
        core_result: Future,
    ) -> u64 {
        // Core contract already verified win and spent nullifier
        // Get payout amount from core contract result
        // For now, calculate here (in production, use async return values)
        
        let market_escrow_total: u64 = Mapping::get(market_escrow, market_id);
        
        // Get pool info from core (simplified - should call core view)
        // Assuming we have winning_pool and total_pool from core
        
        // This is simplified - real version would get ratios from core contract
        let payout_before_fee: u64 = bet_amount * 2u64; // Placeholder
        let fee: u64 = (payout_before_fee * PLATFORM_FEE_BPS) / 10000u64;
        let net_payout: u64 = payout_before_fee - fee;

        // Update escrow tracking
        Mapping::set(spent_escrow, escrow_id, true);
        
        let current_escrow: u64 = Mapping::get(market_escrow, market_id);
        assert(current_escrow >= net_payout + fee);
        Mapping::set(market_escrow, market_id, current_escrow - net_payout - fee);

        // Collect fees
        let total_fees: u64 = Mapping::get_or_use(platform_fees, 0u8, 0u64);
        Mapping::set(platform_fees, 0u8, total_fees + fee);

        return net_payout;
    }

    // Refund for cancelled markets
    async transition refund_bet(
        escrowed: EscrowedBet,
    ) -> (Credits, Future) {
        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrowed.escrow_id, false);
        assert(!is_spent);

        let f: Future = finalize_refund_bet(
            escrowed.market_id,
            escrowed.escrow_id,
            escrowed.amount,
            escrowed.owner
        );

        let refund: Credits = Credits {
            owner: escrowed.owner,
            amount: escrowed.amount,
            nonce: BHP256::hash_to_group(escrowed.escrow_id),
        };

        return (refund, f);
    }

    async function finalize_refund_bet(
        market_id: field,
        escrow_id: field,
        amount: u64,
        owner: address,
    ) {
        // Verify market is cancelled via core contract
        // (Simplified - should call core to verify cancellation)

        Mapping::set(spent_escrow, escrow_id, true);
        
        let current_escrow: u64 = Mapping::get(market_escrow, market_id);
        Mapping::set(market_escrow, market_id, current_escrow - amount);
    }

    // Admin: Withdraw fees
    async transition withdraw_fees(
        public amount: u64,
    ) -> (Credits, Future) {
        let f: Future = finalize_withdraw_fees(amount, self.caller);
        
        let withdrawal: Credits = Credits {
            owner: self.caller,
            amount: amount,
            nonce: BHP256::hash_to_group(amount),
        };
        
        return (withdrawal, f);
    }

    async function finalize_withdraw_fees(amount: u64, recipient: address) {
        // Verify admin
        assert_eq(recipient, aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc);
        
        let total_fees: u64 = Mapping::get(platform_fees, 0u8);
        assert(total_fees >= amount);
        Mapping::set(platform_fees, 0u8, total_fees - amount);
    }

    // Utilities
    transition combine_credits(c1: Credits, c2: Credits) -> Credits {
        assert_eq(c1.owner, c2.owner);
        return Credits {
            owner: c1.owner,
            amount: c1.amount + c2.amount,
            nonce: BHP256::hash_to_group(c1.amount + c2.amount),
        };
    }

    transition split_credits(credits: Credits, amount: u64) -> (Credits, Credits) {
        assert(credits.amount >= amount);
        return (
            Credits { owner: credits.owner, amount: amount, nonce: BHP256::hash_to_group(amount) },
            Credits { owner: credits.owner, amount: credits.amount - amount, nonce: BHP256::hash_to_group(credits.amount - amount) }
        );
    }
}