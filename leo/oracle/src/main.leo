// VeilMarkets Oracle (v11 buildathon)
// Quorum-aware optimistic resolution with proposer stake locks, dispute slashing, and pause controls.
import credits.aleo;
import veilmarkets_core_v11.aleo;
import veilmarkets_factory_v11.aleo;
import veilmarkets_governance_v11.aleo;

program veilmarkets_oracle_v11.aleo {
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
    mapping oracle_locked_stake: address => u64;
    mapping proposal_locked_bond: field => u64;
    mapping votes: field => u64;
    mapping vote_weight_totals: field => u64;
    mapping disputed_voter_counts: field => u64;
    mapping vote_receipts: field => bool;
    mapping vote_outcomes: field => u8;
    mapping vote_weights: field => u64;
    mapping vote_reward_claimed: field => bool;
    mapping disputes: field => Dispute;
    mapping oracle_u64: u8 => u64;
    mapping oracle_u8: u8 => u8;
    mapping platform_fee_pool: u8 => u64;
    mapping market_voter_reward_pool: field => u64;
    mapping market_winning_vote_weight: field => u64;
    mapping resolved_outcomes: field => u8;

    const GOVERNANCE_CONTRACT_TYPE: u8 = 4u8;
    const PLATFORM_FEE_POOL_KEY: u8 = 0u8;

    const PARAM_MIN_ORACLE_STAKE: u8 = 0u8;
    const PARAM_DISPUTE_WINDOW: u8 = 1u8;
    const PARAM_MIN_VOTERS: u8 = 0u8;
    const PARAM_ORACLE_PAUSED: u8 = 1u8;

    const DEFAULT_MIN_ORACLE_STAKE: u64 = 20000000u64; // 20 ALEO (testing default)
    const DEFAULT_DISPUTE_WINDOW: u64 = 600u64; // 10 minutes (testing default)
    const DEFAULT_DISPUTED_FINAL_TIMEOUT: u64 = 1800u64; // 30 minutes after challenge window
    const DEFAULT_MIN_VOTERS: u8 = 2u8;
    const DEFAULT_ORACLE_PAUSED: u8 = 0u8;

    const ADMIN: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    constructor() {}

    fn register_oracle(
        stake_credits: credits.aleo::credits,
        public amount: u64,
    ) -> (credits.aleo::credits, OracleCredential, Final) {
        let caller: address = self.caller;
        let (change, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(
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
        let f: Final = final {
            finalize_register_oracle(caller, amount, transfer_future);
        };
        return (change, credential, f);
    }

    fn propose_resolution(public market_id: field, public proposed_outcome: u8) -> Final {
        assert(proposed_outcome <= 7u8);
        let caller: address = self.caller;
        return final {
            finalize_propose_resolution(market_id, proposed_outcome, caller);
        };
    }

    fn dispute_resolution(
        dispute_stake: credits.aleo::credits,
        public market_id: field,
        public amount: u64,
    ) -> (credits.aleo::credits, Final) {
        let caller: address = self.caller;
        let (change, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_private_to_public(
                dispute_stake,
                self.address,
                amount,
            );
        let f: Final = final {
            finalize_dispute_resolution(market_id, caller, amount, transfer_future);
        };
        return (change, f);
    }

    fn submit_quorum_vote(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8,
    ) -> (OracleCredential, Final) {
        assert(outcome <= 7u8);
        assert_eq(credential.owner, self.caller);
        let updated_credential: OracleCredential = OracleCredential {
            owner: credential.owner,
            staked_amount: credential.staked_amount,
            reputation_score: credential.reputation_score,
            nonce: BHP256::hash_to_group(credential.nonce as field),
        };
        let caller: address = self.caller;
        let f: Final = final {
            finalize_vote_on_resolution(market_id, outcome, caller);
        };
        return (updated_credential, f);
    }

    fn vote_on_resolution(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8,
    ) -> (OracleCredential, Final) {
        assert(outcome <= 7u8);
        assert_eq(credential.owner, self.caller);
        let updated_credential: OracleCredential = OracleCredential {
            owner: credential.owner,
            staked_amount: credential.staked_amount,
            reputation_score: credential.reputation_score,
            nonce: BHP256::hash_to_group(credential.nonce as field),
        };
        let caller: address = self.caller;
        let f: Final = final {
            finalize_vote_on_resolution(market_id, outcome, caller);
        };
        return (updated_credential, f);
    }

    fn execute_quorum_resolution(public market_id: field, public outcome: u8) -> Final {
        assert(outcome <= 7u8);
        let f_core: Final = veilmarkets_core_v11.aleo::resolve_market(
            market_id,
            outcome,
            self.address,
        );
        return final {
            finalize_resolve_on_core(market_id, outcome, f_core);
        };
    }

    fn resolve_on_core(public market_id: field, public outcome: u8) -> Final {
        assert(outcome <= 7u8);
        let f_core: Final = veilmarkets_core_v11.aleo::resolve_market(
            market_id,
            outcome,
            self.address,
        );
        return final {
            finalize_resolve_on_core(market_id, outcome, f_core);
        };
    }

    fn unstake_credits(public amount: u64) -> (credits.aleo::credits, Final) {
        let caller: address = self.caller;
        let (output_credits, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(
                caller,
                amount,
            );
        let f: Final = final {
            finalize_unstake_credits(caller, amount, transfer_future);
        };
        return (output_credits, f);
    }

    fn claim_vote_reward(public market_id: field) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_claim_vote_reward(market_id, caller);
        };
    }

    fn withdraw_platform_fees(
        public amount: u64,
        public recipient: address,
    ) -> (credits.aleo::credits, Final) {
        let gov_auth: Final = veilmarkets_factory_v11.aleo::verify_is_registered(
            GOVERNANCE_CONTRACT_TYPE,
            self.caller,
        );
        let (output_credits, transfer_future): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(
                recipient,
                amount,
            );
        let f: Final = final {
            finalize_withdraw_platform_fees(amount, gov_auth, transfer_future);
        };
        return (output_credits, f);
    }

    fn admin_set_pause(public paused: bool) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_admin_set_pause(paused, caller);
        };
    }

    fn set_protocol_u64(public proposal_id: field, public param_key: u8, public value: u64) -> Final {
        let auth: Final = veilmarkets_governance_v11.aleo::consume_oracle_u64(
            proposal_id,
            param_key,
            value,
        );
        return final {
            finalize_set_protocol_u64(param_key, value, auth);
        };
    }

    fn set_protocol_u8(public proposal_id: field, public param_key: u8, public value: u8) -> Final {
        let auth: Final = veilmarkets_governance_v11.aleo::consume_oracle_u8(
            proposal_id,
            param_key,
            value,
        );
        return final {
            finalize_set_protocol_u8(param_key, value, auth);
        };
    }
}

fn outcome_vote_key(market_id: field, outcome: u8) -> field {
    return BHP256::hash_to_field(market_id + outcome as field);
}

fn vote_receipt_key(market_id: field, voter: address) -> field {
    return BHP256::hash_to_field(market_id + voter as field);
}

fn mul_div_u64(a: u64, b: u64, den: u64) -> u64 {
    assert(den > 0u64);
    let a_u128: u128 = a as u128;
    let b_u128: u128 = b as u128;
    let den_u128: u128 = den as u128;
    let result_u128: u128 = (a_u128 * b_u128) / den_u128;
    return result_u128 as u64;
}

final fn finalize_register_oracle(oracle: address, amount: u64, transfer_future: Final) {
    let oracle_paused: u8 = Mapping::get_or_use(oracle_u8, PARAM_ORACLE_PAUSED, DEFAULT_ORACLE_PAUSED);
    assert(oracle_paused == 0u8);
    transfer_future.run();
    let min_stake: u64 = Mapping::get_or_use(
        oracle_u64,
        PARAM_MIN_ORACLE_STAKE,
        DEFAULT_MIN_ORACLE_STAKE,
    );
    assert(amount >= min_stake);
    let current_stake: u64 = Mapping::get_or_use(active_oracles, oracle, 0u64);
    Mapping::set(active_oracles, oracle, current_stake + amount);
}

final fn finalize_propose_resolution(
    market_id: field,
    proposed_outcome: u8,
    proposer: address,
) {
    let oracle_paused: u8 = Mapping::get_or_use(oracle_u8, PARAM_ORACLE_PAUSED, DEFAULT_ORACLE_PAUSED);
    assert(oracle_paused == 0u8);
    let min_stake: u64 = Mapping::get_or_use(
        oracle_u64,
        PARAM_MIN_ORACLE_STAKE,
        DEFAULT_MIN_ORACLE_STAKE,
    );
    let stake: u64 = Mapping::get(active_oracles, proposer);
    let locked_stake: u64 = Mapping::get_or_use(oracle_locked_stake, proposer, 0u64);
    assert(stake >= locked_stake);
    let available_stake: u64 = stake - locked_stake;
    assert(available_stake >= min_stake);
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
    Mapping::set(oracle_locked_stake, proposer, locked_stake + min_stake);
    Mapping::set(proposal_locked_bond, market_id, min_stake);
}

final fn finalize_dispute_resolution(
    market_id: field,
    challenger: address,
    amount: u64,
    transfer_future: Final,
) {
    let oracle_paused: u8 = Mapping::get_or_use(oracle_u8, PARAM_ORACLE_PAUSED, DEFAULT_ORACLE_PAUSED);
    assert(oracle_paused == 0u8);
    transfer_future.run();
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

final fn finalize_vote_on_resolution(market_id: field, outcome: u8, voter: address) {
    let oracle_paused: u8 = Mapping::get_or_use(oracle_u8, PARAM_ORACLE_PAUSED, DEFAULT_ORACLE_PAUSED);
    assert(oracle_paused == 0u8);
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
    Mapping::set(vote_outcomes, receipt_key, outcome);
    Mapping::set(vote_weights, receipt_key, weight);
    Mapping::set(vote_reward_claimed, receipt_key, false);
}

final fn finalize_resolve_on_core(market_id: field, outcome: u8, f_core: Final) {
    let oracle_paused: u8 = Mapping::get_or_use(oracle_u8, PARAM_ORACLE_PAUSED, DEFAULT_ORACLE_PAUSED);
    assert(oracle_paused == 0u8);
    let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
    let locked_bond: u64 = Mapping::get_or_use(proposal_locked_bond, market_id, 0u64);
    assert(locked_bond > 0u64);
    let proposer_locked_stake: u64 = Mapping::get_or_use(
        oracle_locked_stake,
        proposal.proposer,
        0u64,
    );
    assert(proposer_locked_stake >= locked_bond);

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
        let timeout_ready: bool = block.timestamp as u64 >= proposal.challenge_deadline + DEFAULT_DISPUTED_FINAL_TIMEOUT;
        let quorum_ready: bool = voter_count >= min_voters as u64
            && total_weight >= quorum_weight
            && vote_weight > 0u64;

        if (!quorum_ready) {
            assert(timeout_ready);
            assert_eq(outcome, proposal.proposed_outcome);
        }
    } else {
        assert(block.timestamp as u64 >= proposal.challenge_deadline);
        assert_eq(outcome, proposal.proposed_outcome);
    }

    f_core.run();
    Mapping::set(resolved_outcomes, market_id, outcome);

    if (proposal.is_disputed) {
        let dispute: Dispute = Mapping::get(disputes, market_id);
        let winning_vote_weight: u64 = Mapping::get_or_use(
            votes,
            outcome_vote_key(market_id, outcome),
            0u64,
        );
        let has_vote_winner: bool = winning_vote_weight > 0u64;

        if (!has_vote_winner) {
            let bond: u64 = dispute.stake;
            let platform_fee: u64 = bond / 10u64;
            let proposer_reward: u64 = bond - platform_fee;

            let proposer_balance: u64 = Mapping::get(active_oracles, proposal.proposer);
            Mapping::set(active_oracles, proposal.proposer, proposer_balance + proposer_reward);

            let current_pool: u64 = Mapping::get_or_use(platform_fee_pool, PLATFORM_FEE_POOL_KEY, 0u64);
            Mapping::set(platform_fee_pool, PLATFORM_FEE_POOL_KEY, current_pool + platform_fee);
            Mapping::set(market_voter_reward_pool, market_id, 0u64);
            Mapping::set(market_winning_vote_weight, market_id, 0u64);
        } else if (outcome != proposal.proposed_outcome) {
            let proposer_stake: u64 = Mapping::get(active_oracles, proposal.proposer);
            assert(proposer_stake >= locked_bond);
            let slash_amount: u64 = locked_bond;
            Mapping::set(active_oracles, proposal.proposer, proposer_stake - slash_amount);

            let platform_fee: u64 = slash_amount / 10u64;
            let voter_reward_pool: u64 = slash_amount / 5u64;
            let disputer_reward: u64 = slash_amount - platform_fee - voter_reward_pool;

            let disputer_balance: u64 = Mapping::get_or_use(active_oracles, dispute.challenger, 0u64);
            Mapping::set(
                active_oracles,
                dispute.challenger,
                disputer_balance + dispute.stake + disputer_reward,
            );

            let current_pool: u64 = Mapping::get_or_use(platform_fee_pool, PLATFORM_FEE_POOL_KEY, 0u64);
            Mapping::set(platform_fee_pool, PLATFORM_FEE_POOL_KEY, current_pool + platform_fee);
            Mapping::set(market_voter_reward_pool, market_id, voter_reward_pool);
            Mapping::set(market_winning_vote_weight, market_id, winning_vote_weight);
        } else {
            let bond: u64 = dispute.stake;
            let platform_fee: u64 = bond / 10u64;
            let voter_reward_pool: u64 = bond / 5u64;
            let proposer_reward: u64 = bond - platform_fee - voter_reward_pool;

            let proposer_balance: u64 = Mapping::get(active_oracles, proposal.proposer);
            Mapping::set(active_oracles, proposal.proposer, proposer_balance + proposer_reward);

            let current_pool: u64 = Mapping::get_or_use(platform_fee_pool, PLATFORM_FEE_POOL_KEY, 0u64);
            Mapping::set(platform_fee_pool, PLATFORM_FEE_POOL_KEY, current_pool + platform_fee);
            Mapping::set(market_voter_reward_pool, market_id, voter_reward_pool);
            Mapping::set(market_winning_vote_weight, market_id, winning_vote_weight);
        }
    } else {
        Mapping::set(market_voter_reward_pool, market_id, 0u64);
        Mapping::set(market_winning_vote_weight, market_id, 0u64);
    }

    Mapping::set(
        oracle_locked_stake,
        proposal.proposer,
        proposer_locked_stake - locked_bond,
    );
    Mapping::set(proposal_locked_bond, market_id, 0u64);
}

final fn finalize_unstake_credits(oracle: address, amount: u64, transfer_future: Final) {
    let oracle_paused: u8 = Mapping::get_or_use(oracle_u8, PARAM_ORACLE_PAUSED, DEFAULT_ORACLE_PAUSED);
    assert(oracle_paused == 0u8);
    transfer_future.run();
    let current_stake: u64 = Mapping::get(active_oracles, oracle);
    let locked_stake: u64 = Mapping::get_or_use(oracle_locked_stake, oracle, 0u64);
    assert(current_stake >= locked_stake);
    assert_eq(locked_stake, 0u64);
    assert(current_stake >= amount);
    let remaining_stake: u64 = current_stake - amount;
    assert(remaining_stake >= locked_stake);
    Mapping::set(active_oracles, oracle, remaining_stake);
}

final fn finalize_claim_vote_reward(market_id: field, voter: address) {
    let locked_bond: u64 = Mapping::get_or_use(proposal_locked_bond, market_id, 0u64);
    assert_eq(locked_bond, 0u64);

    let reward_pool: u64 = Mapping::get_or_use(market_voter_reward_pool, market_id, 0u64);
    assert(reward_pool > 0u64);
    let winning_vote_weight: u64 = Mapping::get_or_use(market_winning_vote_weight, market_id, 0u64);
    assert(winning_vote_weight > 0u64);

    let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
    assert(proposal.is_disputed);
    let resolved_outcome: u8 = Mapping::get(resolved_outcomes, market_id);

    let receipt_key: field = vote_receipt_key(market_id, voter);
    let voted: bool = Mapping::get_or_use(vote_receipts, receipt_key, false);
    assert(voted);
    let already_claimed: bool = Mapping::get_or_use(vote_reward_claimed, receipt_key, false);
    assert(!already_claimed);

    let voted_outcome: u8 = Mapping::get_or_use(vote_outcomes, receipt_key, 255u8);
    assert_eq(voted_outcome, resolved_outcome);
    let vote_weight: u64 = Mapping::get_or_use(vote_weights, receipt_key, 0u64);
    assert(vote_weight > 0u64);
    assert(winning_vote_weight >= vote_weight);

    let reward: u64 = mul_div_u64(vote_weight, reward_pool, winning_vote_weight);
    let remaining_pool: u64 = reward_pool - reward;
    let remaining_winning_weight: u64 = winning_vote_weight - vote_weight;
    Mapping::set(market_voter_reward_pool, market_id, remaining_pool);
    Mapping::set(market_winning_vote_weight, market_id, remaining_winning_weight);
    Mapping::set(vote_reward_claimed, receipt_key, true);

    if (reward > 0u64) {
        let current_stake: u64 = Mapping::get_or_use(active_oracles, voter, 0u64);
        Mapping::set(active_oracles, voter, current_stake + reward);
    }
}

final fn finalize_withdraw_platform_fees(
    amount: u64,
    gov_auth: Final,
    transfer_future: Final,
) {
    gov_auth.run();
    assert(amount > 0u64);
    let current_pool: u64 = Mapping::get_or_use(platform_fee_pool, PLATFORM_FEE_POOL_KEY, 0u64);
    assert(current_pool >= amount);
    Mapping::set(platform_fee_pool, PLATFORM_FEE_POOL_KEY, current_pool - amount);
    transfer_future.run();
}

final fn finalize_admin_set_pause(paused: bool, caller: address) {
    assert_eq(caller, ADMIN);
    let paused_flag: u8 = paused ? 1u8 : 0u8;
    Mapping::set(oracle_u8, PARAM_ORACLE_PAUSED, paused_flag);
}

final fn finalize_set_protocol_u64(param_key: u8, value: u64, auth: Final) {
    auth.run();
    if (param_key == PARAM_MIN_ORACLE_STAKE) {
        assert(value > 0u64);
    }
    if (param_key == PARAM_DISPUTE_WINDOW) {
        assert(value >= 60u64);
    }
    Mapping::set(oracle_u64, param_key, value);
}

final fn finalize_set_protocol_u8(param_key: u8, value: u8, auth: Final) {
    auth.run();
    if (param_key == PARAM_MIN_VOTERS) {
        assert(value >= 2u8);
        assert(value <= 8u8);
    }
    if (param_key == PARAM_ORACLE_PAUSED) {
        assert(value <= 1u8);
    }
    Mapping::set(oracle_u8, param_key, value);
}


