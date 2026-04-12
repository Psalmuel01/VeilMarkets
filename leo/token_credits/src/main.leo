// VeilMarkets Token — Credits Adapter (v11 buildathon)
// Private credits rail for buy/fund/claim + governance-gated protocol fee withdrawals.
import credits.aleo;
import veilmarkets_core_build_v11.aleo;
import veilmarkets_factory_build_v11.aleo;

program veilmarkets_credits_build_v11.aleo {
    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;
    const MIN_BET: u64 = 1000000u64;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    constructor() {}

    fn buy_shares(
        input_credits: credits.aleo::credits,
        public market_id: field,
        public outcome: u8,
        public collateral_in: u64,
        public min_shares_out: u64,
        public expected_shares_out: u64,
        public position_nonce: field,
    ) -> (credits.aleo::credits, veilmarkets_core_build_v11.aleo::BetPosition, Final) {
        assert(input_credits.microcredits >= collateral_in);
        assert(collateral_in >= MIN_BET);
        assert(min_shares_out > 0u64);
        assert(expected_shares_out > 0u64);
        assert(outcome <= 7u8);

        let (change, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(
                input_credits,
                self.address,
                collateral_in,
            );

        let position_id: field = BHP256::hash_to_field(
            self.signer as field
                + market_id
                + outcome as field
                + collateral_in as field
                + position_nonce,
        );
        let owner_commitment: field = BHP256::hash_to_field(
            self.signer as field + position_id,
        );

        let (position, core_future): (veilmarkets_core_build_v11.aleo::BetPosition, Final) =
            veilmarkets_core_build_v11.aleo::buy_shares(
                market_id,
                outcome,
                collateral_in,
                min_shares_out,
                expected_shares_out,
                position_id,
                owner_commitment,
            );

        let f: Final = final {
            finalize_buy_shares(transfer_future, core_future);
        };
        return (change, position, f);
    }

    fn fund_pool(
        input_credits: credits.aleo::credits,
        public market_id: field,
        public amount: u64,
    ) -> (credits.aleo::credits, Final) {
        assert(input_credits.microcredits >= amount);
        assert(amount >= MIN_BET);

        let (change, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(
                input_credits,
                self.address,
                amount,
            );

        // LP ownership key is intentionally stable per user for per-market LP accounting.
        // Note: this field is public when passed into core.
        let lp_owner_key: field = self.signer as field;
        let core_future: Final = veilmarkets_core_build_v11.aleo::fund_pool(
            market_id,
            amount,
            lp_owner_key,
        );

        let f: Final = final {
            finalize_fund_pool(transfer_future, core_future);
        };
        return (change, f);
    }

    fn claim_payout(
        public payout_amount: u64,
        public nullifier: field,
    ) -> (credits.aleo::credits, Final) {
        let core_result: Final = veilmarkets_core_build_v11.aleo::verify_claim(
            nullifier,
            payout_amount,
        );
        let (payout_record, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(
                self.caller,
                payout_amount,
            );

        let f: Final = final {
            finalize_claim_payout(core_result, transfer_future);
        };
        return (payout_record, f);
    }

    fn withdraw_protocol_fees(
        public amount: u64,
        public authorization_id: field,
        public recipient: address,
    ) -> (credits.aleo::credits, Final) {
        let gov_auth: Final = veilmarkets_factory_build_v11.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            self.caller,
        );
        let core_auth: Final = veilmarkets_core_build_v11.aleo::authz_fee_withdrawal(
            amount,
            authorization_id,
        );
        let (payout_record, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(
                recipient,
                amount,
            );

        let f: Final = final {
            finalize_withdraw_protocol_fees(gov_auth, core_auth, transfer_future);
        };
        return (payout_record, f);
    }
}

final fn finalize_buy_shares(transfer_future: Final, core_future: Final) {
    transfer_future.run();
    core_future.run();
}

final fn finalize_fund_pool(transfer_future: Final, core_future: Final) {
    transfer_future.run();
    core_future.run();
}

final fn finalize_claim_payout(core_result: Final, transfer_future: Final) {
    core_result.run();
    transfer_future.run();
}

final fn finalize_withdraw_protocol_fees(
    gov_auth: Final,
    core_auth: Final,
    transfer_future: Final,
) {
    gov_auth.run();
    core_auth.run();
    transfer_future.run();
}
