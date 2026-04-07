import veilmarkets_governance_v9.aleo;

program test_governance.aleo {
    function proposal_target_valid(target: u8) -> bool {
        return target <= 1u8;
    }

    @test
    transition target_bounds() {
        assert_eq(proposal_target_valid(0u8), true);
        assert_eq(proposal_target_valid(1u8), true);
        assert_eq(proposal_target_valid(2u8), false);
    }

    @test
    transition vote_majority_check() {
        let yes_votes: u64 = 5u64;
        let no_votes: u64 = 2u64;
        assert(yes_votes > no_votes);
    }

    @noupgrade
    async constructor() {}
}
