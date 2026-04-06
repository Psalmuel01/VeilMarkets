import veilmarkets_oracle_v8.aleo;

program test_veilmarkets_oracle.aleo {
    const MIN_ORACLE_STAKE: u64 = 30000000u64;
    const DISPUTE_WINDOW: u64 = 300u64;

    function compute_disputed_winner(vote_0: u64, vote_1: u64, vote_2: u64, vote_3: u64) -> u8 {
        let best_01_outcome: u8 = (vote_1 > vote_0) ? 1u8 : 0u8;
        let best_01_votes: u64 = (vote_1 > vote_0) ? vote_1 : vote_0;
        let best_23_outcome: u8 = (vote_3 > vote_2) ? 3u8 : 2u8;
        let best_23_votes: u64 = (vote_3 > vote_2) ? vote_3 : vote_2;
        return (best_23_votes > best_01_votes) ? best_23_outcome : best_01_outcome;
    }

    @test
    transition disputed_vote_max_weight() {
        let winner_a: u8 = compute_disputed_winner(10u64, 20u64, 40u64, 25u64);
        let winner_b: u8 = compute_disputed_winner(90u64, 20u64, 10u64, 15u64);
        let winner_c: u8 = compute_disputed_winner(1u64, 2u64, 3u64, 100u64);

        assert_eq(winner_a, 2u8);
        assert_eq(winner_b, 0u8);
        assert_eq(winner_c, 3u8);
    }

    @test
    transition split_disputer_wins() {
        let slashed: u64 = MIN_ORACLE_STAKE;
        let platform_fee: u64 = slashed / 10u64;
        let winner_reward: u64 = slashed - platform_fee;

        assert_eq(platform_fee, 3000000u64);
        assert_eq(winner_reward, 27000000u64);
        assert_eq(platform_fee + winner_reward, slashed);
    }

    @test
    transition split_proposer_wins() {
        let dispute_bond: u64 = 45000000u64;
        let platform_fee: u64 = dispute_bond / 10u64;
        let proposer_reward: u64 = dispute_bond - platform_fee;

        assert_eq(platform_fee, 4500000u64);
        assert_eq(proposer_reward, 40500000u64);
        assert_eq(platform_fee + proposer_reward, dispute_bond);
    }

    @test
    transition deadline_adds_window() {
        let now_ts: u64 = 100000u64;
        let challenge_deadline: u64 = now_ts + DISPUTE_WINDOW;

        assert_eq(challenge_deadline, 100300u64);
    }

    @noupgrade
    async constructor() {}
}
