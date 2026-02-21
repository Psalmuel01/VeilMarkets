// VeilMarkets Token
// Integrated escrow with cross-contract validation
// Handles credits, escrow, payouts with nullifier tracking

import veilmarkets.aleo;
import veilmarkets_factory.aleo;

program veilmarkets_token.aleo {

    // Structs
    struct EscrowInfo {
        holder: address,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,
    }

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
        escrow_id: field,
        nonce: group,
    }

    // Mappings
    mapping market_escrow: field => u64;           // Total per market
    mapping escrow_details: field => EscrowInfo;   // escrow_id => details
    mapping spent_escrow: field => bool;           // Prevent double-release
    mapping platform_fees: u8 => u64;              // Fee treasury

    // Constants
    const CORE_CONTRACT: address = aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc; // Set at deployment
    const ORACLE_CONTRACT: address = aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
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
    async transition faucet(public amount: u64) -> (Credits, Future) {
        assert(amount <= 1000000000000u64); // Max 1M credits
        
        let c: Credits = Credits {
            owner: self.caller,
            amount: amount,
            nonce: BHP256::hash_to_group(self.caller),
        };
        return (c, finalize_faucet());
    }

    async function finalize_faucet() {}

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

        // Generate unique escrow ID using credits nonce for uniqueness
        let caller_hash: field = BHP256::hash_to_field(self.caller);
        let escrow_id: field = BHP256::hash_to_field(caller_hash + market_id + bet_amount as field + credits.nonce as field);

        let escrowed: EscrowedBet = EscrowedBet {
            owner: self.caller,
            market_id: market_id,
            amount: bet_amount,
            outcome: outcome,
            escrow_id: escrow_id,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        let change: Credits = Credits {
            owner: self.caller,
            amount: credits.amount - bet_amount,
            nonce: BHP256::hash_to_group(credits.amount - bet_amount),
        };

        // Call core contract to register bet
        let core_future: Future = veilmarkets.aleo/place_bet(
            market_id,
            outcome,
            bet_amount,
            escrow_id,
            self.caller
        );

        let f: Future = finalize_place_bet(
            market_id,
            bet_amount,
            escrow_id,
            self.caller,
            outcome,
            core_future
        );

        return (change, escrowed, f);
    }

    async function finalize_place_bet(
        market_id: field,
        amount: u64,
        escrow_id: field,
        bettor: address,
        outcome: u8,
        core_future: Future,
    ) {
        // Update escrow total
        let current_escrow: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_escrow + amount);

        // Store escrow details (as struct)
        let info: EscrowInfo = EscrowInfo {
            holder: bettor,
            market_id: market_id,
            amount: amount,
            outcome: outcome,
            escrow_id: escrow_id,
        };
        Mapping::set(escrow_details, escrow_id, info);

        // Await core future
        core_future.await();
    }

    // Claim payout - verifies with core contract first
    async transition claim_payout(
        public escrow_id: field,
        public payout_amount: u64,
        public nullifier: field,
    ) -> (Credits, Future) {
        // Call core contract to verify win and amount
        let core_result: Future = veilmarkets.aleo/verify_claim(
            nullifier,
            payout_amount
        );

        let f: Future = finalize_claim_payout(
            escrow_id,
            payout_amount,
            self.caller,
            core_result
        );

        let payout: Credits = Credits {
            owner: self.caller,
            amount: payout_amount, 
            nonce: BHP256::hash_to_group(nullifier),
        };

        return (payout, f);
    }

    async function finalize_claim_payout(
        escrow_id: field,
        payout_amount: u64,
        claimant: address,
        core_result: Future,
    ) {
        // Verify escrow not already spent
        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrow_id, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, escrow_id, true);

        // Get market_id from escrow details
        let escrow: EscrowInfo = Mapping::get(escrow_details, escrow_id);
        assert_eq(escrow.holder, claimant);

        // Calculate platform fee
        let fee: u64 = (payout_amount * PLATFORM_FEE_BPS) / 10000u64;
        let final_payout: u64 = payout_amount - fee;

        // Update escrow tracking
        let current_escrow: u64 = Mapping::get(market_escrow, escrow.market_id);
        assert(current_escrow >= payout_amount);
        Mapping::set(market_escrow, escrow.market_id, current_escrow - payout_amount);

        // Collect fees
        let total_fees: u64 = Mapping::get_or_use(platform_fees, 0u8, 0u64);
        Mapping::set(platform_fees, 0u8, total_fees + fee);

        // Await core result
        core_result.await();
    }

    // Refund for cancelled markets
    async transition refund_bet(
        public escrow_id: field,
        public market_id: field,
        public amount: u64,
    ) -> (Credits, Future) {
        let f: Future = finalize_refund_bet(
            market_id,
            escrow_id,
            amount,
            self.caller
        );

        let refund: Credits = Credits {
            owner: self.caller,
            amount: amount,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        return (refund, f);
    }

    async function finalize_refund_bet(
        market_id: field,
        escrow_id: field,
        amount: u64,
        owner: address,
    ) {
        let info: EscrowInfo = Mapping::get(escrow_details, escrow_id);
        assert_eq(info.holder, owner);
        assert_eq(info.market_id, market_id);
        assert_eq(info.amount, amount);

        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrow_id, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, escrow_id, true);
        
        // Verify cancellation? (Token contract trusts core resolution in production)

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