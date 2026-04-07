import veilmarkets_governance_v9.aleo;

program test_governance.aleo {
    fn proposal_target_valid(target: u8) -> bool {
        return target <= 1u8;
    }

    fn can_execute(yes_votes: u64, no_votes: u64, ended: bool, already_executed: bool) -> bool {
        if (already_executed) {
            return false;
        }
        if (!ended) {
            return false;
        }
        return yes_votes > no_votes;
    }

    @test
    fn target_bounds() {
        assert_eq(proposal_target_valid(0u8), true);
        assert_eq(proposal_target_valid(1u8), true);
        assert_eq(proposal_target_valid(2u8), false);
    }

    @test
    fn vote_majority_check() {
        let yes_votes: u64 = 5u64;
        let no_votes: u64 = 2u64;
        assert(yes_votes > no_votes);
    }

    @test
    fn execution_gate_checks() {
        assert_eq(can_execute(5u64, 2u64, true, false), true);
        assert_eq(can_execute(2u64, 5u64, true, false), false);
        assert_eq(can_execute(5u64, 2u64, false, false), false);
        assert_eq(can_execute(5u64, 2u64, true, true), false);
    }

    @noupgrade
    constructor() {}
}
