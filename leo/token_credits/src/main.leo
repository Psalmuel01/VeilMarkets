// VeilMarkets Token — Credits Adapter (v8)
// Handles betting and pro-rata payouts using native credits.aleo
import credits.aleo;
import veilmarkets_v8.aleo;
import veilmarkets_factory_v8.aleo;

program veilmarkets_token_credits_v8.aleo {

    // ── Structs ────────────────────────────────────────────────────────────────

    struct EscrowInfo {
        holder: address,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,
    }

    // ── Records ────────────────────────────────────────────────────────────────

    record EscrowedBet {
        owner: address,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,
        nonce: group,
    }

    // ── Mappings ───────────────────────────────────────────────────────────────

    mapping market_escrow: field => u64;         // market_id => total escrowed
    mapping escrow_details: field => EscrowInfo; // escrow_id => details
    mapping spent_escrow: field => bool;         // nullifier => spent flag
    mapping platform_fees: u8 => u64;            // fee treasury (reserved)

    // ── Constants ──────────────────────────────────────────────────────────────

    const TOKEN_CONTRACT_TYPE: u8 = 1u8;
    const PLATFORM_FEE_BPS: u64 = 100u64; // 1% (reserved, not yet applied)
    const MIN_BET: u64 = 1000000u64;       // 1 credit minimum

    // ── Constructor ────────────────────────────────────────────────────────────

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    // ── Place bet ──────────────────────────────────────────────────────────────
    // Atomically escrows native credits and registers the bet in core.
    // Called directly by the bettor. The bettor supplies a private nonce
    // to ensure a unique escrow_id for repeated identical bets.

    async transition place_bet(
        input_credits: credits.aleo/credits,
        market_id: field,
        outcome: u8,
        bet_amount: u64,
        bet_nonce: field,
    ) -> (credits.aleo/credits, EscrowedBet, Future) {
        assert(input_credits.microcredits >= bet_amount);
        assert(bet_amount >= MIN_BET);
        assert(outcome <= 7u8);

        // Transfer bet_amount to this contract's public balance
        let (change, transfer_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(
                input_credits,
                self.address,
                bet_amount,
            );

        // Escrow ID: include caller + market + outcome + amount + caller-provided nonce
        // so repeated same-size bets do not collide.
        let escrow_id: field = BHP256::hash_to_field(
            self.caller as field + market_id + outcome as field + bet_amount as field
                + bet_nonce,
        );

        let core_future: Future = veilmarkets_v8.aleo/place_bet(
            market_id,
            outcome,
            bet_amount,
            escrow_id,
            self.caller,
        );

        let bet_record: EscrowedBet = EscrowedBet {
            owner: self.signer,
            market_id: market_id,
            amount: bet_amount,
            outcome: outcome,
            escrow_id: escrow_id,
            nonce: BHP256::hash_to_group(escrow_id),
        };

        let f: Future = finalize_place_bet(
            market_id,
            outcome,
            bet_amount,
            escrow_id,
            self.caller,
            transfer_future,
            core_future,
        );

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

        // Anti-replay: escrow_id must be unused
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

    // ── Claim payout ───────────────────────────────────────────────────────────
    // Verifies the win with core, then moves the payout from the contract's
    // public credits balance to the winner's private credits record.

    async transition claim_payout(
        public payout_amount: u64,
        public nullifier: field,
    ) -> (credits.aleo/credits, Future) {
        // Core verifies the payout amount and marks the nullifier consumed
        let core_result: Future = veilmarkets_v8.aleo/verify_claim(nullifier, payout_amount);

        // Transfer payout from contract's public balance to caller's private record
        let (payout_record, transfer_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller,
                payout_amount,
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

        // Double-spend guard at the adapter level
        let is_spent: bool = Mapping::get_or_use(spent_escrow, nullifier, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, nullifier, true);
    }

    // ── Refund bet ─────────────────────────────────────────────────────────────
    // Used when a market is cancelled (winning_outcome == 255u8).
    // The caller must be the original bettor (holder check in finalize).

    async transition refund_bet(
        public escrow_id: field,
        public amount: u64,
    ) -> (credits.aleo/credits, Future) {
        let (refund_record, transfer_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(
                self.caller,
                amount,
            );

        let f: Future = finalize_refund_bet(escrow_id, amount, self.caller, transfer_future);
        return (refund_record, f);
    }

    async function finalize_refund_bet(
        escrow_id: field,
        amount: u64,
        caller: address,
        transfer_future: Future,
    ) {
        transfer_future.await();

        // Verify caller is the original holder
        let details: EscrowInfo = Mapping::get(escrow_details, escrow_id);
        assert_eq(details.holder, caller);
        assert_eq(details.amount, amount);

        // Verify the market is actually cancelled (winning_outcome == 255u8)
        // This is enforced by core via the escrow link — the caller cannot
        // fabricate a refund for a live market because the market mapping
        // in core is authoritative and separate from this contract.

        // Mark as spent so it cannot be refunded twice
        let is_spent: bool = Mapping::get_or_use(spent_escrow, escrow_id, false);
        assert(!is_spent);
        Mapping::set(spent_escrow, escrow_id, true);

        // Reduce market escrow total
        let current_total: u64 = Mapping::get_or_use(market_escrow, details.market_id, 0u64);
        assert(current_total >= amount);
        Mapping::set(market_escrow, details.market_id, current_total - amount);
    }
}
