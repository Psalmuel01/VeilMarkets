// VeilMarkets Oracle (v9)
// Quorum-aware optimistic resolution with dispute bonds and stake slashing.
import credits.aleo;
import veilmarkets_v9.aleo;
import veilmarkets_factory_v9.aleo;

program veilmarkets_oracle_v9.aleo {
    struct ResolutionProposal {
        market_id: field,
        proposed_outcome: u8,
        challenge_deadline: u64,
        is_disputed: bool,
        proposer: address,
    }

    record OracleCredential {
        owner: address,
        staked_amount: u64,
        reputation_score: u64,
        nonce: group,
    }

    struct Dispute {
        challenger: address,
        stake: u64,
        proposal_outcome: u8,
    }

    mapping proposals: field => ResolutionProposal;
    mapping active_oracles: address => u64;
    mapping votes: field => u64; // (market_id + outcome) => weighted votes
    mapping vote_weight_totals: field => u64; // market_id => total disputed vote weight
    mapping disputed_voter_counts: field => u64; // market_id => unique disputed voters
    mapping vote_receipts: field => bool; // hash(market_id + voter)
    mapping disputes: field => Dispute;
    mapping oracle_u64: u8 => u64;
    mapping oracle_u8: u8 => u8;

    const CORE_CONTRACT_TYPE: u8 = 3u8;
    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;
    const PLATFORM_ADDR: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;

    const PARAM_MIN_ORACLE_STAKE: u8 = 0u8;
    const PARAM_DISPUTE_WINDOW: u8 = 1u8;
    const PARAM_MIN_VOTERS: u8 = 0u8; // oracle_u8

    const DEFAULT_MIN_ORACLE_STAKE: u64 = 30000000u64; // 30 ALEO
    const DEFAULT_DISPUTE_WINDOW: u64 = 10800u64; // 3 hours
    const DEFAULT_MIN_VOTERS: u8 = 3u8;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    inline outcome_vote_key(market_id: field, outcome: u8) -> field {
        return BHP256::hash_to_field(market_id + outcome as field);
    }

    inline vote_receipt_key(market_id: field, voter: address) -> field {
        return BHP256::hash_to_field(market_id + voter as field);
    }

    async transition register_oracle(stake_credits: credits.aleo/credits, public amount: u64) -> (
        credits.aleo/credits,
        OracleCredential,
        Future,
    ) {
        let (change, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            stake_credits,
            self.address,
            amount,
        );
        let credential: OracleCredential = OracleCredential {
            owner: self.signer,
            staked_amount: amount,
            reputation_score: 100u64,
            nonce: BHP256::hash_to_group(self.signer as field),
        };
        let f: Future = finalize_register_oracle(self.caller, amount, transfer_future);
        return (change, credential, f);
    }

    async function finalize_register_oracle(oracle: address, amount: u64, transfer_future: Future) {
        transfer_future.await();
        let min_stake: u64 = Mapping::get_or_use(
            oracle_u64,
            PARAM_MIN_ORACLE_STAKE,
            DEFAULT_MIN_ORACLE_STAKE,
        );
        assert(amount >= min_stake);
        let current_stake: u64 = Mapping::get_or_use(active_oracles, oracle, 0u64);
        Mapping::set(active_oracles, oracle, current_stake + amount);
    }

    async transition propose_resolution(public market_id: field, public proposed_outcome: u8) -> Future {
        assert(proposed_outcome <= 31u8);
        return finalize_propose_resolution(market_id, proposed_outcome, self.caller);
    }

    async function finalize_propose_resolution(
        market_id: field,
        proposed_outcome: u8,
        proposer: address,
    ) {
        let min_stake: u64 = Mapping::get_or_use(
            oracle_u64,
            PARAM_MIN_ORACLE_STAKE,
            DEFAULT_MIN_ORACLE_STAKE,
        );
        let stake: u64 = Mapping::get(active_oracles, proposer);
        assert(stake >= min_stake);
        let existing: bool = Mapping::contains(proposals, market_id);
        assert(!existing);
        let dispute_window: u64 = Mapping::get_or_use(
            oracle_u64,
            PARAM_DISPUTE_WINDOW,
            DEFAULT_DISPUTE_WINDOW,
        );
        let proposal: ResolutionProposal = ResolutionProposal {
            market_id: market_id,
            proposed_outcome: proposed_outcome,
            challenge_deadline: block.timestamp as u64 + dispute_window,
            is_disputed: false,
            proposer: proposer,
        };
        Mapping::set(proposals, market_id, proposal);
    }

    async transition dispute_resolution(
        dispute_stake: credits.aleo/credits,
        public market_id: field,
        public amount: u64,
    ) -> (credits.aleo/credits, Future) {
        let (change, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            dispute_stake,
            self.address,
            amount,
        );
        return (
            change,
            finalize_dispute_resolution(market_id, self.caller, amount, transfer_future),
        );
    }

    async function finalize_dispute_resolution(
        market_id: field,
        challenger: address,
        amount: u64,
        transfer_future: Future,
    ) {
        transfer_future.await();
        let min_stake: u64 = Mapping::get_or_use(
            oracle_u64,
            PARAM_MIN_ORACLE_STAKE,
            DEFAULT_MIN_ORACLE_STAKE,
        );
        assert(amount >= min_stake);
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        assert(!proposal.is_disputed);
        assert(block.timestamp as u64 < proposal.challenge_deadline);
        proposal.is_disputed = true;
        Mapping::set(proposals, market_id, proposal);
        let dispute: Dispute = Dispute {
            challenger: challenger,
            stake: amount,
            proposal_outcome: proposal.proposed_outcome,
        };
        Mapping::set(disputes, market_id, dispute);
    }

    async transition vote_on_resolution(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8,
    ) -> (OracleCredential, Future) {
        assert(outcome <= 31u8);
        assert_eq(credential.owner, self.caller);
        let updated_credential: OracleCredential = OracleCredential {
            owner: credential.owner,
            staked_amount: credential.staked_amount,
            reputation_score: credential.reputation_score,
            nonce: BHP256::hash_to_group(credential.nonce as field),
        };
        let f: Future = finalize_vote_on_resolution(market_id, outcome, self.caller);
        return (updated_credential, f);
    }

    async function finalize_vote_on_resolution(market_id: field, outcome: u8, voter: address) {
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        assert(proposal.is_disputed);

        let receipt_key: field = vote_receipt_key(market_id, voter);
        let voted: bool = Mapping::get_or_use(vote_receipts, receipt_key, false);
        assert(!voted);
        Mapping::set(vote_receipts, receipt_key, true);

        let min_stake: u64 = Mapping::get_or_use(
            oracle_u64,
            PARAM_MIN_ORACLE_STAKE,
            DEFAULT_MIN_ORACLE_STAKE,
        );
        let weight: u64 = Mapping::get(active_oracles, voter);
        assert(weight >= min_stake);

        let vote_id: field = outcome_vote_key(market_id, outcome);
        let current_votes: u64 = Mapping::get_or_use(votes, vote_id, 0u64);
        Mapping::set(votes, vote_id, current_votes + weight);

        let total_weight: u64 = Mapping::get_or_use(vote_weight_totals, market_id, 0u64);
        Mapping::set(vote_weight_totals, market_id, total_weight + weight);
        let voter_count: u64 = Mapping::get_or_use(disputed_voter_counts, market_id, 0u64);
        Mapping::set(disputed_voter_counts, market_id, voter_count + 1u64);
    }

    // Alias for the new naming.
    async transition submit_quorum_vote(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8,
    ) -> (OracleCredential, Future) {
        assert(outcome <= 31u8);
        assert_eq(credential.owner, self.caller);
        let updated_credential: OracleCredential = OracleCredential {
            owner: credential.owner,
            staked_amount: credential.staked_amount,
            reputation_score: credential.reputation_score,
            nonce: BHP256::hash_to_group(credential.nonce as field),
        };
        let f: Future = finalize_vote_on_resolution(market_id, outcome, self.caller);
        return (updated_credential, f);
    }

    async transition resolve_on_core(public market_id: field, public outcome: u8) -> Future {
        assert(outcome <= 31u8);
        let f_core: Future = veilmarkets_v9.aleo/resolve_market(
            market_id,
            outcome,
            self.address,
        );
        return finalize_resolve_on_core(market_id, outcome, f_core);
    }

    async function finalize_resolve_on_core(market_id: field, outcome: u8, f_core: Future) {
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);

        if (proposal.is_disputed) {
            let vote_weight: u64 = Mapping::get_or_use(votes, outcome_vote_key(market_id, outcome), 0u64);
            let total_weight: u64 = Mapping::get_or_use(vote_weight_totals, market_id, 0u64);

            let min_voters: u8 = Mapping::get_or_use(oracle_u8, PARAM_MIN_VOTERS, DEFAULT_MIN_VOTERS);
            let min_stake: u64 = Mapping::get_or_use(
                oracle_u64,
                PARAM_MIN_ORACLE_STAKE,
                DEFAULT_MIN_ORACLE_STAKE,
            );
            let quorum_weight: u64 = min_stake * min_voters as u64;
            let voter_count: u64 = Mapping::get_or_use(disputed_voter_counts, market_id, 0u64);
            assert(voter_count >= min_voters as u64);
            assert(total_weight >= quorum_weight);
            assert(vote_weight > 0u64);
        } else {
            assert(block.timestamp as u64 >= proposal.challenge_deadline);
            assert_eq(outcome, proposal.proposed_outcome);
        }

        f_core.await();

        if (proposal.is_disputed) {
            let dispute: Dispute = Mapping::get(disputes, market_id);
            let min_stake: u64 = Mapping::get_or_use(
                oracle_u64,
                PARAM_MIN_ORACLE_STAKE,
                DEFAULT_MIN_ORACLE_STAKE,
            );

            if (outcome != proposal.proposed_outcome) {
                let proposer_stake: u64 = Mapping::get(active_oracles, proposal.proposer);
                let slash_amount: u64 =
                    (proposer_stake >= min_stake) ? min_stake : proposer_stake;
                Mapping::set(active_oracles, proposal.proposer, proposer_stake - slash_amount);

                let platform_fee: u64 = slash_amount / 10u64;
                let winner_reward: u64 = slash_amount - platform_fee;

                let disputer_balance: u64 = Mapping::get_or_use(active_oracles, dispute.challenger, 0u64);
                Mapping::set(
                    active_oracles,
                    dispute.challenger,
                    disputer_balance + dispute.stake + winner_reward,
                );

                let platform_balance: u64 = Mapping::get_or_use(active_oracles, PLATFORM_ADDR, 0u64);
                Mapping::set(active_oracles, PLATFORM_ADDR, platform_balance + platform_fee);
            } else {
                let bond: u64 = dispute.stake;
                let platform_fee: u64 = bond / 10u64;
                let proposer_reward: u64 = bond - platform_fee;

                let proposer_balance: u64 = Mapping::get(active_oracles, proposal.proposer);
                Mapping::set(active_oracles, proposal.proposer, proposer_balance + proposer_reward);

                let platform_balance: u64 = Mapping::get_or_use(active_oracles, PLATFORM_ADDR, 0u64);
                Mapping::set(active_oracles, PLATFORM_ADDR, platform_balance + platform_fee);
            }
        }
    }

    async transition execute_quorum_resolution(public market_id: field, public outcome: u8) -> Future {
        assert(outcome <= 31u8);
        let f_core: Future = veilmarkets_v9.aleo/resolve_market(
            market_id,
            outcome,
            self.address,
        );
        return finalize_resolve_on_core(market_id, outcome, f_core);
    }

    async transition unstake_credits(public amount: u64) -> (credits.aleo/credits, Future) {
        let (output_credits, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            self.caller,
            amount,
        );
        return (output_credits, finalize_unstake_credits(self.caller, amount, transfer_future));
    }

    async function finalize_unstake_credits(oracle: address, amount: u64, transfer_future: Future) {
        transfer_future.await();
        let current_stake: u64 = Mapping::get(active_oracles, oracle);
        assert(current_stake >= amount);
        Mapping::set(active_oracles, oracle, current_stake - amount);
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
        if (param_key == PARAM_MIN_ORACLE_STAKE) {
            assert(value > 0u64);
        }
        if (param_key == PARAM_DISPUTE_WINDOW) {
            assert(value >= 60u64);
        }
        Mapping::set(oracle_u64, param_key, value);
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
        if (param_key == PARAM_MIN_VOTERS) {
            assert(value >= 3u8);
            assert(value <= 32u8);
        }
        Mapping::set(oracle_u8, param_key, value);
    }
}
