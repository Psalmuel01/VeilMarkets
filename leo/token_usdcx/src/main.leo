// VeilMarkets Token — USDCx Adapter (v9)
// Handles share-trading settlement and payout rails using an ARC-20 token (test_usdcx_stablecoin.aleo).
// Structurally identical to the credits adapter; only the payment rail differs.
import test_usdcx_stablecoin.aleo;
import veilmarkets_core_v9.aleo;
import veilmarkets_factory_v9.aleo;

program veilmarkets_token_usdcx_v9.aleo {

    // ── Structs ────────────────────────────────────────────────────────────────

    struct EscrowInfo {
        holder_commitment: field,
        market_id: field,
        amount: u64,
        outcome: u8,
        escrow_id: field,
    }

    // Mirror of test_usdcx_stablecoin.aleo::MerkleProof, kept local to avoid
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
    // USDCx uses 6 decimal places — 1 USDC = 1_000_000 micro-units
    const MIN_BET: u64 = 1000000u64;

    // ── Constructor ────────────────────────────────────────────────────────────

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    constructor() {}

    // ── Place bet ──────────────────────────────────────────────────────────────
    // Atomically escrows USDCx tokens and registers the bet in core.
    // The input_token is an ARC-20 private Token record from test_usdcx_stablecoin.aleo.
    // This token requires a Merkle proof for private spends.

    fn place_bet(
        input_token: test_usdcx_stablecoin.aleo::Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        outcome: u8,
        bet_amount: u64,
        bet_nonce: field,
    ) -> (
        test_usdcx_stablecoin.aleo::ComplianceRecord,
        test_usdcx_stablecoin.aleo::Token,
        EscrowedBet,
        Final,
    ) {
        let bet_amount_u128: u128 = bet_amount as u128;
        assert(input_token.amount >= bet_amount_u128);
        assert(bet_amount >= MIN_BET);
        assert(outcome <= 31u8);

        // Transfer bet_amount to this contract's public USDCx balance
        let external_proof_0: test_usdcx_stablecoin.aleo::MerkleProof =
            test_usdcx_stablecoin.aleo::MerkleProof {
                siblings: token_proof_0.siblings,
                leaf_index: token_proof_0.leaf_index,
            };

        let external_proof_1: test_usdcx_stablecoin.aleo::MerkleProof =
            test_usdcx_stablecoin.aleo::MerkleProof {
                siblings: token_proof_1.siblings,
                leaf_index: token_proof_1.leaf_index,
            };

        let token_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32] =
            [external_proof_0, external_proof_1];

        let (compliance_record, change, transfer_future): (
            test_usdcx_stablecoin.aleo::ComplianceRecord,
            test_usdcx_stablecoin.aleo::Token,
            Final,
        ) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(
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

        let core_future: Final = veilmarkets_core_v9.aleo::place_bet(
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

        let f: Final = final {
            finalize_place_bet(
                market_id,
                outcome,
                bet_amount,
                escrow_id,
                owner_commitment,
                transfer_future,
                core_future,
            );
        };

        return (compliance_record, change, bet_record, f);
    }

    fn buy_shares(
        input_token: test_usdcx_stablecoin.aleo::Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        outcome: u8,
        bet_amount: u64,
        min_shares_out: u64,
        bet_nonce: field,
    ) -> (
        test_usdcx_stablecoin.aleo::ComplianceRecord,
        test_usdcx_stablecoin.aleo::Token,
        EscrowedBet,
        Final,
    ) {
        let bet_amount_u128: u128 = bet_amount as u128;
        assert(input_token.amount >= bet_amount_u128);
        assert(bet_amount >= MIN_BET);
        assert(min_shares_out > 0u64);
        assert(outcome <= 31u8);

        let external_proof_0: test_usdcx_stablecoin.aleo::MerkleProof =
            test_usdcx_stablecoin.aleo::MerkleProof {
                siblings: token_proof_0.siblings,
                leaf_index: token_proof_0.leaf_index,
            };
        let external_proof_1: test_usdcx_stablecoin.aleo::MerkleProof =
            test_usdcx_stablecoin.aleo::MerkleProof {
                siblings: token_proof_1.siblings,
                leaf_index: token_proof_1.leaf_index,
            };

        let token_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32] =
            [external_proof_0, external_proof_1];

        let (compliance_record, change, transfer_future): (
            test_usdcx_stablecoin.aleo::ComplianceRecord,
            test_usdcx_stablecoin.aleo::Token,
            Final,
        ) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(
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

        let core_future: Final = veilmarkets_core_v9.aleo::buy_shares(
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

        let f: Final = final {
            finalize_place_bet(
                market_id,
                outcome,
                bet_amount,
                escrow_id,
                owner_commitment,
                transfer_future,
                core_future,
            );
        };

        return (compliance_record, change, bet_record, f);
    }


    // ── Fund pool ───────────────────────────────────────────────────────────────
    // Adds USDCx liquidity collateral into the v9 core market pool.

    fn fund_pool(
        input_token: test_usdcx_stablecoin.aleo::Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        amount: u64,
        lp_nonce: field,
    ) -> (
        test_usdcx_stablecoin.aleo::ComplianceRecord,
        test_usdcx_stablecoin.aleo::Token,
        Final,
    ) {
        let amount_u128: u128 = amount as u128;
        assert(input_token.amount >= amount_u128);
        assert(amount >= MIN_BET);

        let external_proof_0: test_usdcx_stablecoin.aleo::MerkleProof =
            test_usdcx_stablecoin.aleo::MerkleProof {
                siblings: token_proof_0.siblings,
                leaf_index: token_proof_0.leaf_index,
            };
        let external_proof_1: test_usdcx_stablecoin.aleo::MerkleProof =
            test_usdcx_stablecoin.aleo::MerkleProof {
                siblings: token_proof_1.siblings,
                leaf_index: token_proof_1.leaf_index,
            };
        let token_proof: [test_usdcx_stablecoin.aleo::MerkleProof; 2u32] =
            [external_proof_0, external_proof_1];

        let (compliance_record, change, transfer_future): (
            test_usdcx_stablecoin.aleo::ComplianceRecord,
            test_usdcx_stablecoin.aleo::Token,
            Final,
        ) =
            test_usdcx_stablecoin.aleo::transfer_private_to_public(
                self.address,
                amount_u128,
                input_token,
                token_proof,
            );

        let lp_position_id: field = BHP256::hash_to_field(
            self.caller as field + market_id + amount as field + lp_nonce,
        );
        let lp_owner_key: field = self.caller as field;
        let owner_commitment: field =
            BHP256::hash_to_field(self.caller as field + lp_position_id);

        let core_future: Final = veilmarkets_core_v9.aleo::fund_pool(
            market_id,
            amount,
            lp_position_id,
            lp_owner_key,
            owner_commitment,
        );

        let f: Final = final {
            finalize_fund_pool(market_id, amount, transfer_future, core_future);
        };
        return (compliance_record, change, f);
    }


    // ── Claim payout ───────────────────────────────────────────────────────────
    // Verifies the win with core, then returns USDCx from the contract's
    // public balance to the winner's private Token record.

    fn claim_payout(
        public payout_amount: u64,
        public nullifier: field,
    ) -> (
        test_usdcx_stablecoin.aleo::ComplianceRecord,
        test_usdcx_stablecoin.aleo::Token,
        Final,
    ) {
        let payout_amount_u128: u128 = payout_amount as u128;

        // Core verifies the payout amount and marks the nullifier consumed
        let core_result: Final = veilmarkets_core_v9.aleo::verify_claim(nullifier, payout_amount);

        // Transfer payout from contract's public USDCx balance to caller's private record
        let (compliance_record, payout_record, transfer_future): (
            test_usdcx_stablecoin.aleo::ComplianceRecord,
            test_usdcx_stablecoin.aleo::Token,
            Final,
        ) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(
                self.caller,
                payout_amount_u128,
            );

        let f: Final = final {
            finalize_claim_payout(nullifier, transfer_future, core_result);
        };
        return (compliance_record, payout_record, f);
    }


    // ── Refund bet ─────────────────────────────────────────────────────────────
    // Used when a market is cancelled (winning_outcome == 255u8).
    // Returns USDCx to the original bettor. Caller must be the holder.

    fn refund_bet(
        public escrow_id: field,
        public amount: u64,
    ) -> (
        test_usdcx_stablecoin.aleo::ComplianceRecord,
        test_usdcx_stablecoin.aleo::Token,
        Final,
    ) {
        let amount_u128: u128 = amount as u128;

        let (compliance_record, refund_record, transfer_future): (
            test_usdcx_stablecoin.aleo::ComplianceRecord,
            test_usdcx_stablecoin.aleo::Token,
            Final,
        ) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(
                self.caller,
                amount_u128,
            );

        let caller: address = self.caller;
        let f: Final = final {
            finalize_refund_bet(escrow_id, amount, caller, transfer_future);
        };
        return (compliance_record, refund_record, f);
    }

}

final fn finalize_place_bet(
    market_id: field,
    outcome: u8,
    amount: u64,
    escrow_id: field,
    owner_commitment: field,
    transfer_future: Final,
    core_future: Final,
) {
    transfer_future.run();
    core_future.run();

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

final fn finalize_fund_pool(
    market_id: field,
    amount: u64,
    transfer_future: Final,
    core_future: Final,
) {
    transfer_future.run();
    core_future.run();

    let current_total: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
    Mapping::set(market_escrow, market_id, current_total + amount);
}

final fn finalize_claim_payout(
    nullifier: field,
    transfer_future: Final,
    core_result: Final,
) {
    transfer_future.run();
    core_result.run();

    // Double-spend guard at the adapter level
    let is_spent: bool = Mapping::get_or_use(spent_escrow, nullifier, false);
    assert(!is_spent);
    Mapping::set(spent_escrow, nullifier, true);
}

final fn finalize_refund_bet(
    escrow_id: field,
    amount: u64,
    caller: address,
    transfer_future: Final,
) {
    transfer_future.run();

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
