// VeilMarkets Token — USAD Adapter (v14)
// Private stablecoin rail for buy/fund/claim + governance-gated protocol fee withdrawals.
import test_usad_stablecoin.aleo;
import veilmarkets_core_v15.aleo;
import veilmarkets_factory_v15.aleo;

program veilmarkets_token_usad_v15.aleo {
    struct TokenMerkleProof {
        siblings: [field; 16u32],
        leaf_index: u32,
    }

    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;
    const MIN_BET: u64 = 1000000u64;

    @admin(address = "aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l")
    constructor() {}

    fn buy_shares(
        input_token: test_usad_stablecoin.aleo::Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        outcome: u8,
        collateral_in: u64,
        min_shares_out: u64,
        expected_shares_out: u64,
        position_nonce: field,
    ) -> (
        test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token,
        veilmarkets_core_v15.aleo::BetPosition, Final,
    ) {
        let collateral_in_u128: u128 = collateral_in as u128;
        assert(input_token.amount >= collateral_in_u128);
        assert(collateral_in >= MIN_BET);
        assert(min_shares_out > 0u64);
        assert(expected_shares_out > 0u64);
        assert(outcome <= 7u8);
        let external_proof_0: test_usad_stablecoin.aleo::MerkleProof = test_usad_stablecoin.aleo::MerkleProof {
            siblings: token_proof_0.siblings,
            leaf_index: token_proof_0.leaf_index,
        };
        let external_proof_1: test_usad_stablecoin.aleo::MerkleProof = test_usad_stablecoin.aleo::MerkleProof {
            siblings: token_proof_1.siblings,
            leaf_index: token_proof_1.leaf_index,
        };
        let token_proof: [test_usad_stablecoin.aleo::MerkleProof; 2u32] = [
            external_proof_0,
            external_proof_1,
        ];
        let (compliance_record, change, transfer_future): (
            test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final,
        ) = test_usad_stablecoin.aleo::transfer_private_to_public(
            self.address,
            collateral_in_u128,
            input_token,
            token_proof,
        );
        let position_id: field = BHP256::hash_to_field(
            self.signer as field
                + market_id
                + outcome as field
                + collateral_in as field
                + position_nonce,
        );
        let owner_commitment: field = BHP256::hash_to_field(position_id);
        let trader_market_key: field = BHP256::hash_to_field(self.signer as field + market_id);
        let (position, core_future): (veilmarkets_core_v15.aleo::BetPosition, Final) = veilmarkets_core_v15.aleo::buy_shares(
            market_id,
            outcome,
            collateral_in,
            min_shares_out,
            expected_shares_out,
            position_id,
            owner_commitment,
            trader_market_key,
        );
        let f: Final = final {
            transfer_future.run();
            core_future.run();
        };
        return (compliance_record, change, position, f);
    }

    fn fund_pool(
        input_token: test_usad_stablecoin.aleo::Token,
        token_proof_0: TokenMerkleProof,
        token_proof_1: TokenMerkleProof,
        market_id: field,
        amount: u64,
    ) -> (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) {
        let amount_u128: u128 = amount as u128;
        assert(input_token.amount >= amount_u128);
        assert(amount >= MIN_BET);
        let external_proof_0: test_usad_stablecoin.aleo::MerkleProof = test_usad_stablecoin.aleo::MerkleProof {
            siblings: token_proof_0.siblings,
            leaf_index: token_proof_0.leaf_index,
        };
        let external_proof_1: test_usad_stablecoin.aleo::MerkleProof = test_usad_stablecoin.aleo::MerkleProof {
            siblings: token_proof_1.siblings,
            leaf_index: token_proof_1.leaf_index,
        };
        let token_proof: [test_usad_stablecoin.aleo::MerkleProof; 2u32] = [
            external_proof_0,
            external_proof_1,
        ];
        let (compliance_record, change, transfer_future): (
            test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final,
        ) = test_usad_stablecoin.aleo::transfer_private_to_public(
            self.address,
            amount_u128,
            input_token,
            token_proof,
        );
        let lp_owner_key: field = BHP256::hash_to_field(market_id + self.signer as field);
        let core_future: Final = veilmarkets_core_v15.aleo::fund_pool(
            market_id,
            amount,
            lp_owner_key,
        );
        let f: Final = final {
            transfer_future.run();
            core_future.run();
        };
        return (compliance_record, change, f);
    }

    fn claim_payout(
        payout_amount: u64,
        nullifier: field,
    ) -> (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) {
        let payout_amount_u128: u128 = payout_amount as u128;
        let core_result: Final = veilmarkets_core_v15.aleo::verify_claim(nullifier, payout_amount);
        let (compliance_record, payout_record, transfer_future): (
            test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final,
        ) = test_usad_stablecoin.aleo::transfer_public_to_private(self.caller, payout_amount_u128);
        let f: Final = final {
            core_result.run();
            transfer_future.run();
        };
        return (compliance_record, payout_record, f);
    }

    fn withdraw_protocol_fees(
        amount: u64,
        authorization_id: field,
        recipient: address,
    ) -> (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final) {
        let amount_u128: u128 = amount as u128;
        let gov_auth: Final = veilmarkets_factory_v15.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            self.caller,
        );
        let core_auth: Final = veilmarkets_core_v15.aleo::authz_fee_withdrawal(
            amount,
            authorization_id,
        );
        let (compliance_record, payout_record, transfer_future): (
            test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, Final,
        ) = test_usad_stablecoin.aleo::transfer_public_to_private(recipient, amount_u128);
        let f: Final = final {
            gov_auth.run();
            core_auth.run();
            transfer_future.run();
        };
        return (compliance_record, payout_record, f);
    }
}
