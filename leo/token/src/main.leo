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
    const CORE_CONTRACT: address = aleo162we9fnh9fugzsfn7m4hg96k075vttmgz2rjgqms5l4pftnkavxq7thcn8;
    const ORACLE_CONTRACT: address = aleo184d0frw6hten3rruus4n8qnurmp4pmg06q2ezymn07g7rxg9xg8ss6ek7k;
    const PLATFORM_FEE_BPS: u64 = 100u64; // 1%
    const MIN_BET: u64 = 1000000u64; // 1 credit minimum

    // Initialize
    @admin(address="aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc")
    async constructor() {}

    // Verify caller is core or oracle contract
    inline verify_contract_caller() {
        assert(self.caller == CORE_CONTRACT || self.caller == ORACLE_CONTRACT);
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

        // Generate unique escrow ID
        // BH256 or BHP256 for nonces is not directly available on external records easily without hashing
        let escrow_id: field = BHP256::hash_to_field(input_credits.owner as field + market_id + bet_amount as field);

        let escrowed: EscrowedBet = EscrowedBet {
            owner: self.caller,
            market_id: market_id,
            amount: bet_amount,
            outcome: outcome,
            escrow_id: escrow_id,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        // Call core contract to register bet
        let core_future: Future = veilmarkets_v3.aleo/place_bet(
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
            transfer_future,
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
        transfer_future: Future,
        core_future: Future,
    ) {
        // Await transfers
        transfer_future.await();
        core_future.await();

        // Update escrow total
        let current_escrow: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_escrow + amount);

        // Store escrow details
        let info: EscrowInfo = EscrowInfo {
            holder: bettor,
            market_id: market_id,
            amount: amount,
            outcome: outcome,
            escrow_id: escrow_id,
        };
        Mapping::set(escrow_details, escrow_id, info);
    }

    // Claim payout - verifies with core contract first
    async transition claim_payout(
        public escrow_id: field,
        public payout_amount: u64,
        public nullifier: field,
    ) -> (credits.aleo/credits, Future) {
        // Call core contract to verify win and amount
        let core_result: Future = veilmarkets_v3.aleo/verify_claim(
            nullifier,
            payout_amount
        );

        // Deduct fee and payout to user publicly then to private
        let fee: u64 = (payout_amount * PLATFORM_FEE_BPS) / 10000u64;
        let final_payout: u64 = payout_amount - fee;

        let (payout_record, payout_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            self.caller,
            final_payout
        );

        let f: Future = finalize_claim_payout(
            escrow_id,
            payout_amount,
            fee,
            self.caller,
            core_result,
            payout_future
        );

        return (payout_record, f);
    }

    async function finalize_claim_payout(
        escrow_id: field,
        payout_amount: u64,
        fee: u64,
        claimant: address,
        core_result: Future,
        payout_future: Future,
    ) {
        // Await results
        core_result.await();
        payout_future.await();

        // Verify escrow not already spent
        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrow_id, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, escrow_id, true);

        // Get market_id from escrow details
        let escrow: EscrowInfo = Mapping::get(escrow_details, escrow_id);
        assert_eq(escrow.holder, claimant);

        // Update escrow tracking
        let current_escrow: u64 = Mapping::get(market_escrow, escrow.market_id);
        assert(current_escrow >= payout_amount);
        Mapping::set(market_escrow, escrow.market_id, current_escrow - payout_amount);

        // Collect fees
        let total_fees: u64 = Mapping::get_or_use(platform_fees, 0u8, 0u64);
        Mapping::set(platform_fees, 0u8, total_fees + fee);
    }

    // Refund for cancelled markets
    async transition refund_bet(
        public escrow_id: field,
        public market_id: field,
        public amount: u64,
    ) -> (credits.aleo/credits, Future) {
        let (refund_record, payout_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            self.caller,
            amount
        );

        let f: Future = finalize_refund_bet(
            market_id,
            escrow_id,
            amount,
            self.caller,
            payout_future
        );

        return (refund_record, f);
    }

    async function finalize_refund_bet(
        market_id: field,
        escrow_id: field,
        amount: u64,
        owner: address,
        payout_future: Future,
    ) {
        payout_future.await();

        let info: EscrowInfo = Mapping::get(escrow_details, escrow_id);
        assert_eq(info.holder, owner);
        assert_eq(info.market_id, market_id);
        assert_eq(info.amount, amount);

        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrow_id, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, escrow_id, true);

        let current_escrow: u64 = Mapping::get(market_escrow, market_id);
        Mapping::set(market_escrow, market_id, current_escrow - amount);
    }

    // Admin: Withdraw fees
    async transition withdraw_fees(
        public amount: u64,
    ) -> (credits.aleo/credits, Future) {
        let (withdrawal_record, f): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(self.caller, amount);
        let final_future: Future = finalize_withdraw_fees(amount, self.caller, f);
        return (withdrawal_record, final_future);
    }

    async function finalize_withdraw_fees(amount: u64, recipient: address, f: Future) {
        f.await();
        // Verify admin
        assert_eq(recipient, aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc);
        
        let total_fees: u64 = Mapping::get(platform_fees, 0u8);
        assert(total_fees >= amount);
        Mapping::set(platform_fees, 0u8, total_fees - amount);
    }
}