import veilmarkets_core_v13.aleo;
import veilmarkets_factory_v13.aleo;

program veilmarkets_governance_v13.aleo {
    struct Proposal {
        proposer: address,
        target: u8, // 0 = core, 1 = oracle
        param_key: u8,
        param_value: u64,
        as_u8: bool,
        end_time: u64,
        execute_after: u64,
        yes_votes: u64,
        no_votes: u64,
        executed: bool,
    }

    mapping proposals: field => Proposal;
    mapping vote_receipts: field => bool; // hash(proposal_id + voter)
    mapping voter_weights: address => u64;

    const TARGET_CORE: u8 = 0u8;
    const TARGET_ORACLE: u8 = 1u8;
    const ORACLE_CONTRACT_TYPE: u8 = 2u8;
    const MIN_VOTE_WINDOW: u64 = 60u64;
    const EXECUTION_TIMELOCK: u64 = 86400u64; // 24h
    const ADMIN: address = aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;

    @admin(address = "aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l")
    constructor() {}

    fn create_proposal(
        public proposal_id: field,
        public target: u8,
        public param_key: u8,
        public value: u64,
        public as_u8: bool,
        public voting_window: u64,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            finalize_create_proposal(
                proposal_id,
                target,
                param_key,
                value,
                as_u8,
                voting_window,
                caller,
            );
        };
    }

    fn admin_set_voter_weight(public voter: address, public weight: u64) -> Final {
        let caller: address = self.caller;
        return final { finalize_admin_set_voter_weight(voter, weight, caller); };
    }

    fn cast_vote(public proposal_id: field, public support: bool) -> Final {
        let caller: address = self.caller;
        return final { finalize_cast_vote(proposal_id, support, caller); };
    }

    fn execute_core_u64(
        public proposal_id: field,
        public param_key: u8,
        public value: u64,
    ) -> Final {
        let f_target: Final = veilmarkets_core_v13.aleo::set_protocol_u64(param_key, value);
        return final {
            f_target.run();
            finalize_execute(proposal_id, TARGET_CORE, param_key, value, false);
        };
    }

    fn execute_core_u8(public proposal_id: field, public param_key: u8, public value: u8) -> Final {
        let f_target: Final = veilmarkets_core_v13.aleo::set_protocol_u8(param_key, value);
        return final {
            f_target.run();
            finalize_execute(proposal_id, TARGET_CORE, param_key, value as u64, true);
        };
    }

    fn consume_oracle_u64(
        public proposal_id: field,
        public param_key: u8,
        public value: u64,
    ) -> Final {
        let caller: address = self.caller;
        let oracle_auth: Final = veilmarkets_factory_v13.aleo::verify_is_registered(
            ORACLE_CONTRACT_TYPE,
            caller,
        );
        return final {
            oracle_auth.run();
            finalize_consume_execute(proposal_id, TARGET_ORACLE, param_key, value, false);
        };
    }

    fn consume_oracle_u8(
        public proposal_id: field,
        public param_key: u8,
        public value: u8,
    ) -> Final {
        let caller: address = self.caller;
        let oracle_auth: Final = veilmarkets_factory_v13.aleo::verify_is_registered(
            ORACLE_CONTRACT_TYPE,
            caller,
        );
        return final {
            oracle_auth.run();
            finalize_consume_execute(proposal_id, TARGET_ORACLE, param_key, value as u64, true);
        };
    }
}

fn vote_key(proposal_id: field, voter: address) -> field {
    return BHP256::hash_to_field(proposal_id + voter as field);
}

final fn finalize_create_proposal(
    proposal_id: field,
    target: u8,
    param_key: u8,
    value: u64,
    as_u8: bool,
    voting_window: u64,
    proposer: address,
) {
    assert(target == TARGET_CORE || target == TARGET_ORACLE);
    assert(voting_window >= MIN_VOTE_WINDOW);
    if (as_u8) {
        assert(value <= 255u64);
    }
    let exists: bool = Mapping::contains(proposals, proposal_id);
    assert(!exists);

    let end_time: u64 = block.timestamp as u64 + voting_window;
    let proposal: Proposal = Proposal {
        proposer: proposer,
        target: target,
        param_key: param_key,
        param_value: value,
        as_u8: as_u8,
        end_time: end_time,
        execute_after: end_time + EXECUTION_TIMELOCK,
        yes_votes: 0u64,
        no_votes: 0u64,
        executed: false,
    };
    Mapping::set(proposals, proposal_id, proposal);
}

final fn finalize_cast_vote(proposal_id: field, support: bool, voter: address) {
    let proposal: Proposal = Mapping::get(proposals, proposal_id);
    assert(!proposal.executed);
    assert(block.timestamp as u64 < proposal.end_time);
    let voter_weight: u64 = Mapping::get_or_use(voter_weights, voter, 0u64);
    assert(voter_weight > 0u64);

    let receipt_key: field = vote_key(proposal_id, voter);
    let voted: bool = Mapping::get_or_use(vote_receipts, receipt_key, false);
    assert(!voted);
    Mapping::set(vote_receipts, receipt_key, true);
    let updated: Proposal = Proposal {
        proposer: proposal.proposer,
        target: proposal.target,
        param_key: proposal.param_key,
        param_value: proposal.param_value,
        as_u8: proposal.as_u8,
        end_time: proposal.end_time,
        execute_after: proposal.execute_after,
        yes_votes: support ? proposal.yes_votes + voter_weight : proposal.yes_votes,
        no_votes: support ? proposal.no_votes : proposal.no_votes + voter_weight,
        executed: proposal.executed,
    };
    Mapping::set(proposals, proposal_id, updated);
}

final fn finalize_execute(
    proposal_id: field,
    expected_target: u8,
    expected_param_key: u8,
    expected_value: u64,
    expected_as_u8: bool,
) {
    let proposal: Proposal = Mapping::get(proposals, proposal_id);
    assert(!proposal.executed);
    assert(block.timestamp as u64 >= proposal.end_time);
    assert(block.timestamp as u64 >= proposal.execute_after);
    assert(proposal.yes_votes > proposal.no_votes);

    assert_eq(proposal.target, expected_target);
    assert_eq(proposal.param_key, expected_param_key);
    assert_eq(proposal.param_value, expected_value);
    assert_eq(proposal.as_u8, expected_as_u8);
    let executed: Proposal = Proposal {
        proposer: proposal.proposer,
        target: proposal.target,
        param_key: proposal.param_key,
        param_value: proposal.param_value,
        as_u8: proposal.as_u8,
        end_time: proposal.end_time,
        execute_after: proposal.execute_after,
        yes_votes: proposal.yes_votes,
        no_votes: proposal.no_votes,
        executed: true,
    };
    Mapping::set(proposals, proposal_id, executed);
}

final fn finalize_admin_set_voter_weight(voter: address, weight: u64, caller: address) {
    assert_eq(caller, ADMIN);
    Mapping::set(voter_weights, voter, weight);
}

final fn finalize_consume_execute(
    proposal_id: field,
    expected_target: u8,
    expected_param_key: u8,
    expected_value: u64,
    expected_as_u8: bool,
) {
    let proposal: Proposal = Mapping::get(proposals, proposal_id);
    assert(!proposal.executed);
    assert(block.timestamp as u64 >= proposal.end_time);
    assert(block.timestamp as u64 >= proposal.execute_after);
    assert(proposal.yes_votes > proposal.no_votes);

    assert_eq(proposal.target, expected_target);
    assert_eq(proposal.param_key, expected_param_key);
    assert_eq(proposal.param_value, expected_value);
    assert_eq(proposal.as_u8, expected_as_u8);
    let executed: Proposal = Proposal {
        proposer: proposal.proposer,
        target: proposal.target,
        param_key: proposal.param_key,
        param_value: proposal.param_value,
        as_u8: proposal.as_u8,
        end_time: proposal.end_time,
        execute_after: proposal.execute_after,
        yes_votes: proposal.yes_votes,
        no_votes: proposal.no_votes,
        executed: true,
    };
    Mapping::set(proposals, proposal_id, executed);
}
