// VeilMarkets Token — USAD Adapter (v8)
// Handles betting and pro-rata payouts using an ARC-20 token (test_usad_stablecoin.aleo).
// Structurally identical to the credits adapter; only the payment rail differs.
import test_usad_stablecoin.aleo;
import veilmarkets_v9.aleo;
import veilmarkets_factory_v9.aleo;

program veilmarkets_token_usad_v9.aleo {

    // ── Structs ────────────────────────────────────────────────────────────────

    struct EscrowInfo {
        holder_commitment: field,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,
    }

    // Mirror of test_usad_stablecoin.aleo/MerkleProof, kept local to avoid
    // parser edge-cases with private arrays of imported structs.
    struct TokenMerkleProof {
        siblings: [field; 16u32],
        leaf_index: u32,
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
    // USAD uses 6 decimal places — 1 USAD = 1_000_000 micro-units
    const MIN_BET: u64 = 1000000u64;

    // ── Constructor ────────────────────────────────────────────────────────────

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    // ── Place bet ──────────────────────────────────────────────────────────────
    // Atomically escrows USAD tokens and registers the bet in core.
    // The input_token is an ARC-20 private Token record from test_usad_stablecoin.aleo.
    // This token requires a Merkle proof for private spends.

    async transition place_bet(
        input_token: test_usad_stablecoin.aleo/Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        outcome: u8,
        bet_amount: u64,
        bet_nonce: field,
    ) -> (
        test_usad_stablecoin.aleo/ComplianceRecord,
        test_usad_stablecoin.aleo/Token,
        EscrowedBet,
        Future,
    ) {
        let bet_amount_u128: u128 = bet_amount as u128;
        assert(input_token.amount >= bet_amount_u128);
        assert(bet_amount >= MIN_BET);
        assert(outcome <= 31u8);

        // Transfer bet_amount to this contract's public USAD balance
        let external_proof_0: test_usad_stablecoin.aleo/MerkleProof =
            test_usad_stablecoin.aleo/MerkleProof {
                siblings: token_proof_0.siblings,
                leaf_index: token_proof_0.leaf_index,
            };

        let external_proof_1: test_usad_stablecoin.aleo/MerkleProof =
            test_usad_stablecoin.aleo/MerkleProof {
                siblings: token_proof_1.siblings,
                leaf_index: token_proof_1.leaf_index,
            };

        let token_proof: [test_usad_stablecoin.aleo/MerkleProof; 2u32] =
            [external_proof_0, external_proof_1];

        let (compliance_record, change, transfer_future): (
            test_usad_stablecoin.aleo/ComplianceRecord,
            test_usad_stablecoin.aleo/Token,
            Future,
        ) =
            test_usad_stablecoin.aleo/transfer_private_to_public(
                self.address,
                bet_amount_u128,
                input_token,
                token_proof,
            );

        let escrow_id: field = BHP256::hash_to_field(
            self.caller as field + market_id + outcome as field + bet_amount as field
                + bet_nonce,
        );
        let owner_commitment: field = BHP256::hash_to_field(self.caller as field + escrow_id);

        let core_future: Future = veilmarkets_v9.aleo/place_bet(
            market_id,
            outcome,
            bet_amount,
            escrow_id,
            owner_commitment,
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
            owner_commitment,
            transfer_future,
            core_future,
        );

        return (compliance_record, change, bet_record, f);
    }

    async transition buy_shares(
        input_token: test_usad_stablecoin.aleo/Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        outcome: u8,
        bet_amount: u64,
        min_shares_out: u64,
        bet_nonce: field,
    ) -> (
        test_usad_stablecoin.aleo/ComplianceRecord,
        test_usad_stablecoin.aleo/Token,
        EscrowedBet,
        Future,
    ) {
        let bet_amount_u128: u128 = bet_amount as u128;
        assert(input_token.amount >= bet_amount_u128);
        assert(bet_amount >= MIN_BET);
        assert(min_shares_out > 0u64);
        assert(outcome <= 31u8);

        let external_proof_0: test_usad_stablecoin.aleo/MerkleProof =
            test_usad_stablecoin.aleo/MerkleProof {
                siblings: token_proof_0.siblings,
                leaf_index: token_proof_0.leaf_index,
            };
        let external_proof_1: test_usad_stablecoin.aleo/MerkleProof =
            test_usad_stablecoin.aleo/MerkleProof {
                siblings: token_proof_1.siblings,
                leaf_index: token_proof_1.leaf_index,
            };
        let token_proof: [test_usad_stablecoin.aleo/MerkleProof; 2u32] =
            [external_proof_0, external_proof_1];

        let (compliance_record, change, transfer_future): (
            test_usad_stablecoin.aleo/ComplianceRecord,
            test_usad_stablecoin.aleo/Token,
            Future,
        ) =
            test_usad_stablecoin.aleo/transfer_private_to_public(
                self.address,
                bet_amount_u128,
                input_token,
                token_proof,
            );

        let escrow_id: field = BHP256::hash_to_field(
            self.caller as field + market_id + outcome as field + bet_amount as field
                + bet_nonce,
        );
        let owner_commitment: field = BHP256::hash_to_field(self.caller as field + escrow_id);

        let core_future: Future = veilmarkets_v9.aleo/buy_shares(
            market_id,
            outcome,
            bet_amount,
            min_shares_out,
            escrow_id,
            owner_commitment,
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
            owner_commitment,
            transfer_future,
            core_future,
        );

        return (compliance_record, change, bet_record, f);
    }

    async function finalize_place_bet(
        market_id: field,
        outcome: u8,
        amount: u64,
        escrow_id: field,
        owner_commitment: field,
        transfer_future: Future,
        core_future: Future,
    ) {
        transfer_future.await();
        core_future.await();

        // Anti-replay: escrow_id must be unused
        let exists: bool = Mapping::contains(escrow_details, escrow_id);
        assert(!exists);

        let details: EscrowInfo = EscrowInfo {
            holder_commitment: owner_commitment,
            market_id: market_id,
            amount: amount,
            outcome: outcome,
            escrow_id: escrow_id,
        };
        Mapping::set(escrow_details, escrow_id, details);

        let current_total: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_total + amount);
    }

    // ── Fund pool ───────────────────────────────────────────────────────────────
    // Adds USAD liquidity collateral into the v9 core market pool.

    async transition fund_pool(
        input_token: test_usad_stablecoin.aleo/Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        amount: u64,
        lp_nonce: field,
    ) -> (
        test_usad_stablecoin.aleo/ComplianceRecord,
        test_usad_stablecoin.aleo/Token,
        Future,
    ) {
        let amount_u128: u128 = amount as u128;
        assert(input_token.amount >= amount_u128);
        assert(amount >= MIN_BET);

        let external_proof_0: test_usad_stablecoin.aleo/MerkleProof =
            test_usad_stablecoin.aleo/MerkleProof {
                siblings: token_proof_0.siblings,
                leaf_index: token_proof_0.leaf_index,
            };
        let external_proof_1: test_usad_stablecoin.aleo/MerkleProof =
            test_usad_stablecoin.aleo/MerkleProof {
                siblings: token_proof_1.siblings,
                leaf_index: token_proof_1.leaf_index,
            };
        let token_proof: [test_usad_stablecoin.aleo/MerkleProof; 2u32] =
            [external_proof_0, external_proof_1];

        let (compliance_record, change, transfer_future): (
            test_usad_stablecoin.aleo/ComplianceRecord,
            test_usad_stablecoin.aleo/Token,
            Future,
        ) =
            test_usad_stablecoin.aleo/transfer_private_to_public(
                self.address,
                amount_u128,
                input_token,
                token_proof,
            );

        let lp_position_id: field = BHP256::hash_to_field(
            self.caller as field + market_id + amount as field + lp_nonce,
        );
        let owner_commitment: field =
            BHP256::hash_to_field(self.caller as field + lp_position_id);

        let core_future: Future = veilmarkets_v9.aleo/fund_pool(
            market_id,
            amount,
            lp_position_id,
            owner_commitment,
        );

        let f: Future = finalize_fund_pool(market_id, amount, transfer_future, core_future);
        return (compliance_record, change, f);
    }

    async function finalize_fund_pool(
        market_id: field,
        amount: u64,
        transfer_future: Future,
        core_future: Future,
    ) {
        transfer_future.await();
        core_future.await();

        let current_total: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_total + amount);
    }

    // ── Claim payout ───────────────────────────────────────────────────────────
    // Verifies the win with core, then returns USAD from the contract's
    // public balance to the winner's private Token record.

    async transition claim_payout(
        public payout_amount: u64,
        public nullifier: field,
    ) -> (
        test_usad_stablecoin.aleo/ComplianceRecord,
        test_usad_stablecoin.aleo/Token,
        Future,
    ) {
        let payout_amount_u128: u128 = payout_amount as u128;

        // Core verifies the payout amount and marks the nullifier consumed
        let core_result: Future = veilmarkets_v9.aleo/verify_claim(nullifier, payout_amount);

        // Transfer payout from contract's public USAD balance to caller's private record
        let (compliance_record, payout_record, transfer_future): (
            test_usad_stablecoin.aleo/ComplianceRecord,
            test_usad_stablecoin.aleo/Token,
            Future,
        ) =
            test_usad_stablecoin.aleo/transfer_public_to_private(
                self.caller,
                payout_amount_u128,
            );

        let f: Future = finalize_claim_payout(nullifier, transfer_future, core_result);
        return (compliance_record, payout_record, f);
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
    // Returns USAD to the original bettor. Caller must be the holder.

    async transition refund_bet(
        public escrow_id: field,
        public amount: u64,
    ) -> (
        test_usad_stablecoin.aleo/ComplianceRecord,
        test_usad_stablecoin.aleo/Token,
        Future,
    ) {
        let amount_u128: u128 = amount as u128;

        let (compliance_record, refund_record, transfer_future): (
            test_usad_stablecoin.aleo/ComplianceRecord,
            test_usad_stablecoin.aleo/Token,
            Future,
        ) =
            test_usad_stablecoin.aleo/transfer_public_to_private(
                self.caller,
                amount_u128,
            );

        let f: Future = finalize_refund_bet(escrow_id, amount, self.caller, transfer_future);
        return (compliance_record, refund_record, f);
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
        let expected_holder_commitment: field =
            BHP256::hash_to_field(caller as field + escrow_id);
        assert_eq(details.holder_commitment, expected_holder_commitment);
        assert_eq(details.amount, amount);

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
