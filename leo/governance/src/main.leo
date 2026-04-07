import veilmarkets_v9.aleo;
import veilmarkets_oracle_v9.aleo;

program veilmarkets_governance_v9.aleo {
    struct Proposal {
        proposer: address,
        target: u8, // 0 = core, 1 = oracle
        param_key: u8,
        param_value: u64,
        as_u8: bool,
        end_time: u64,
        yes_votes: u64,
        no_votes: u64,
        executed: bool,
    }

    mapping proposals: field => Proposal;
    mapping vote_receipts: field => bool; // hash(proposal_id + voter)

    const TARGET_CORE: u8 = 0u8;
    const TARGET_ORACLE: u8 = 1u8;
    const MIN_VOTE_WINDOW: u64 = 60u64;

    @admin(address = "aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n")
    async constructor() {}

    inline vote_key(proposal_id: field, voter: address) -> field {
        return BHP256::hash_to_field(proposal_id + voter as field);
    }

    async transition create_proposal(
        public proposal_id: field,
        public target: u8,
        public param_key: u8,
        public value: u64,
        public as_u8: bool,
        public voting_window: u64,
    ) -> Future {
        return finalize_create_proposal(
            proposal_id,
            target,
            param_key,
            value,
            as_u8,
            voting_window,
            self.caller,
        );
    }

    async function finalize_create_proposal(
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

        let proposal: Proposal = Proposal {
            proposer: proposer,
            target: target,
            param_key: param_key,
            param_value: value,
            as_u8: as_u8,
            end_time: block.timestamp as u64 + voting_window,
            yes_votes: 0u64,
            no_votes: 0u64,
            executed: false,
        };
        Mapping::set(proposals, proposal_id, proposal);
    }

    async transition cast_vote(public proposal_id: field, public support: bool) -> Future {
        return finalize_cast_vote(proposal_id, support, self.caller);
    }

    async function finalize_cast_vote(proposal_id: field, support: bool, voter: address) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        assert(!proposal.executed);
        assert(block.timestamp as u64 < proposal.end_time);

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
            yes_votes: support ? proposal.yes_votes + 1u64 : proposal.yes_votes,
            no_votes: support ? proposal.no_votes : proposal.no_votes + 1u64,
            executed: proposal.executed,
        };
        Mapping::set(proposals, proposal_id, updated);
    }

    async transition execute_core_u64(
        public proposal_id: field,
        public param_key: u8,
        public value: u64,
    ) -> Future {
        let f_target: Future = veilmarkets_v9.aleo/set_protocol_u64(param_key, value);
        return finalize_execute(proposal_id, TARGET_CORE, param_key, value, false, f_target);
    }

    async transition execute_core_u8(
        public proposal_id: field,
        public param_key: u8,
        public value: u8,
    ) -> Future {
        let f_target: Future = veilmarkets_v9.aleo/set_protocol_u8(param_key, value);
        return finalize_execute(
            proposal_id,
            TARGET_CORE,
            param_key,
            value as u64,
            true,
            f_target,
        );
    }

    async transition execute_oracle_u64(
        public proposal_id: field,
        public param_key: u8,
        public value: u64,
    ) -> Future {
        let f_target: Future = veilmarkets_oracle_v9.aleo/set_protocol_u64(param_key, value);
        return finalize_execute(proposal_id, TARGET_ORACLE, param_key, value, false, f_target);
    }

    async transition execute_oracle_u8(
        public proposal_id: field,
        public param_key: u8,
        public value: u8,
    ) -> Future {
        let f_target: Future = veilmarkets_oracle_v9.aleo/set_protocol_u8(param_key, value);
        return finalize_execute(
            proposal_id,
            TARGET_ORACLE,
            param_key,
            value as u64,
            true,
            f_target,
        );
    }

    async function finalize_execute(
        proposal_id: field,
        expected_target: u8,
        expected_param_key: u8,
        expected_value: u64,
        expected_as_u8: bool,
        f_target: Future,
    ) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        assert(!proposal.executed);
        assert(block.timestamp as u64 >= proposal.end_time);
        assert(proposal.yes_votes > proposal.no_votes);

        assert_eq(proposal.target, expected_target);
        assert_eq(proposal.param_key, expected_param_key);
        assert_eq(proposal.param_value, expected_value);
        assert_eq(proposal.as_u8, expected_as_u8);

        f_target.await();

        let executed: Proposal = Proposal {
            proposer: proposal.proposer,
            target: proposal.target,
            param_key: proposal.param_key,
            param_value: proposal.param_value,
            as_u8: proposal.as_u8,
            end_time: proposal.end_time,
            yes_votes: proposal.yes_votes,
            no_votes: proposal.no_votes,
            executed: true,
        };
        Mapping::set(proposals, proposal_id, executed);
    }
}
