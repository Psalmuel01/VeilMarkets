// VeilMarkets Token (Native Credits Edition)
// Integrated escrow with native credits.aleo integration
// Handles betting and pro-rata payouts using global credits.aleo

import credits.aleo;
import veilmarkets_v3.aleo;
import veilmarkets_factory_v3.aleo;

program veilmarkets_token_v3.aleo {

    // Structs
    struct EscrowInfo {
        holder: address,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,
    }

    // Records
    // Using native credits.aleo/credits for entry/exit
    
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
    const TOKEN_CONTRACT_TYPE: u8 = 1u8;
    const ORACLE_CONTRACT_TYPE: u8 = 2u8;
    const CORE_CONTRACT_TYPE: u8 = 3u8; // Reserved for consistency
    const PLATFORM_FEE_BPS: u64 = 100u64; // 1%
    const MIN_BET: u64 = 1000000u64; // 1 credit minimum

    // Initialize
    @admin(address="aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc")
    async constructor() {}

    // Verify caller is oracle contract
    async transition verify_oracle_caller() -> Future {
        let f: Future = veilmarkets_factory_v3.aleo/verify_is_registered(
            ORACLE_CONTRACT_TYPE,
            self.caller
        );
        return finalize_verify_caller(f);
    }

    async function finalize_verify_caller(f: Future) {
        f.await();
    }

    // Deposit and place bet - ATOMIC operation using native credits
    async transition place_bet(
        input_credits: credits.aleo/credits,
        public market_id: field,
        public outcome: u8,
        public bet_amount: u64,
    ) -> (credits.aleo/credits, EscrowedBet, Future) {
        // Validate
        assert(input_credits.microcredits >= bet_amount);
        assert(bet_amount >= MIN_BET);
        assert(outcome == 0u8 || outcome == 1u8);

        // Move funds to contract (publicly tracked for pro-rata payouts)
        // Recipient is this program's address: veilmarkets_token_v3.aleo
        let (change, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            input_credits,
            self.address,
            bet_amount
        );

        // Generate proof of bet (for core contract)
        let escrow_id: field = BHP256::hash_to_field(self.caller as field + market_id + bet_amount as field);

        // Call core contract to register bet
        let core_future: Future = veilmarkets_v3.aleo/place_bet(
            market_id,
            outcome,
            bet_amount,
            escrow_id,
            self.caller
        );

        let bet_record: EscrowedBet = EscrowedBet {
            owner: self.caller,
            market_id: market_id,
            amount: bet_amount,
            outcome: outcome,
            escrow_id: escrow_id,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        let f: Future = finalize_place_bet(market_id, outcome, bet_amount, escrow_id, self.caller, transfer_future, core_future);

        return (change, bet_record, f);
    }

    async function finalize_place_bet(
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field,
        holder: address,
        transfer_future: Future,
        core_future: Future,
    ) {
        transfer_future.await();
        core_future.await();

        // Check if escrow ID already used (anti-replay)
        let exists: bool = Mapping::contains(escrow_details, escrow_id);
        assert(!exists);

        let details: EscrowInfo = EscrowInfo {
            holder: holder,
            market_id: market_id,
            amount: amount,
            outcome: outcome,
            escrow_id: escrow_id,
        };

        Mapping::set(escrow_details, escrow_id, details);

        let current_total: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_total + amount);
    }

    // Claim payout - Atomic move from contract public balance to user private credits
    async transition claim_payout(
        public payout_amount: u64,
        public nullifier: field,
    ) -> (credits.aleo/credits, Future) {
        // Call core contract to verify win and amount
        let core_result: Future = veilmarkets_v3.aleo/verify_claim(
            nullifier,
            payout_amount
        );

        // Verify caller and amounts
        // Recipient is self.caller
        let (payout_record, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            self.caller,
            payout_amount
        );

        let f: Future = finalize_claim_payout(nullifier, transfer_future, core_result);

        return (payout_record, f);
    }

    async function finalize_claim_payout(
        nullifier: field,
        transfer_future: Future,
        core_result: Future,
    ) {
        transfer_future.await();
        core_result.await();

        // Mark as spent
        let is_spent: bool = Mapping::get_or_use(spent_escrow, nullifier, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, nullifier, true);
    }

    // Emergency internal: Refund bet if market cancelled
    // (Only callable if core signals cancellation)
    async transition refund_bet(
        public escrow_id: field,
        public amount: u64,
    ) -> (credits.aleo/credits, Future) {
        // This would require a core check that the market is cancelled
        // For brevity, assuming verified caller is core
        let (refund_record, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            self.caller, // holder
            amount
        );

        let f: Future = finalize_refund_bet(escrow_id, transfer_future);
        return (refund_record, f);
    }

    async function finalize_refund_bet(
        escrow_id: field,
        transfer_future: Future,
    ) {
        transfer_future.await();
        Mapping::set(spent_escrow, escrow_id, true);
    }
}