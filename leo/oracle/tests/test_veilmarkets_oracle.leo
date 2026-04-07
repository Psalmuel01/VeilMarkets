import veilmarkets_oracle_v9.aleo;

program test_veilmarkets_oracle.aleo {
    const MIN_ORACLE_STAKE: u64 = 30000000u64;
    const DISPUTE_WINDOW: u64 = 10800u64;

    function compute_disputed_winner(
        vote_0: u64,
        vote_1: u64,
        vote_2: u64,
        vote_3: u64,
        vote_4: u64,
        vote_5: u64,
        vote_6: u64,
        vote_7: u64,
    ) -> u8 {
        let best_01_outcome: u8 = (vote_1 > vote_0) ? 1u8 : 0u8;
        let best_01_votes: u64 = (vote_1 > vote_0) ? vote_1 : vote_0;
        let best_23_outcome: u8 = (vote_3 > vote_2) ? 3u8 : 2u8;
        let best_23_votes: u64 = (vote_3 > vote_2) ? vote_3 : vote_2;
        let best_45_outcome: u8 = (vote_5 > vote_4) ? 5u8 : 4u8;
        let best_45_votes: u64 = (vote_5 > vote_4) ? vote_5 : vote_4;
        let best_67_outcome: u8 = (vote_7 > vote_6) ? 7u8 : 6u8;
        let best_67_votes: u64 = (vote_7 > vote_6) ? vote_7 : vote_6;

        let best_0123_outcome: u8 = (best_23_votes > best_01_votes) ? best_23_outcome : best_01_outcome;
        let best_0123_votes: u64 = (best_23_votes > best_01_votes) ? best_23_votes : best_01_votes;
        let best_4567_outcome: u8 = (best_67_votes > best_45_votes) ? best_67_outcome : best_45_outcome;
        let best_4567_votes: u64 = (best_67_votes > best_45_votes) ? best_67_votes : best_45_votes;

        return (best_4567_votes > best_0123_votes) ? best_4567_outcome : best_0123_outcome;
    }

    @test
    transition disputed_vote_max_weight() {
        let winner_a: u8 = compute_disputed_winner(10u64, 20u64, 40u64, 25u64, 9u64, 8u64, 7u64, 6u64);
        let winner_b: u8 = compute_disputed_winner(90u64, 20u64, 10u64, 15u64, 16u64, 17u64, 18u64, 19u64);
        let winner_c: u8 = compute_disputed_winner(1u64, 2u64, 3u64, 4u64, 5u64, 6u64, 7u64, 100u64);

        assert_eq(winner_a, 2u8);
        assert_eq(winner_b, 0u8);
        assert_eq(winner_c, 7u8);
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

        assert_eq(challenge_deadline, 110800u64);
    }

    @noupgrade
    async constructor() {}
}
