fn outcome_vote_key(market_id: field, outcome: u8) -> field {
    return BHP256::hash_to_field(market_id + outcome as field);
}

fn vote_receipt_key(market_id: field, voter: address) -> field {
    return BHP256::hash_to_field(market_id + voter as field);
}

fn mul_div_u64(a: u64, b: u64, denom: u64) -> u64 {
    assert(denom > 0u64);
    let a128: u128 = a as u128;
    let b128: u128 = b as u128;
    let d128: u128 = denom as u128;
    return ((a128 * b128) / d128) as u64;
}

fn compute_disputed_winner(
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

program test_veilmarkets_oracle.aleo {
    const DEFAULT_MIN_ORACLE_STAKE: u64 = 20000000u64;
    const DEFAULT_DISPUTE_WINDOW: u64 = 600u64;
    const DEFAULT_DISPUTED_FINAL_TIMEOUT: u64 = 1800u64;
    const DEFAULT_MIN_VOTERS: u8 = 2u8;

    @test
    fn vote_keys_change() {
        let market_id: field = 91field;
        let voter_a: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
        let voter_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;

        let outcome_key_0: field = outcome_vote_key(market_id, 0u8);
        let outcome_key_1: field = outcome_vote_key(market_id, 1u8);
        let receipt_a: field = vote_receipt_key(market_id, voter_a);
        let receipt_b: field = vote_receipt_key(market_id, voter_b);

        assert(outcome_key_0 != outcome_key_1);
        assert(receipt_a != receipt_b);
    }

    @test
    fn default_quorum_weight() {
        let quorum_weight: u64 = DEFAULT_MIN_ORACLE_STAKE * DEFAULT_MIN_VOTERS as u64;
        assert_eq(quorum_weight, 40000000u64);
    }

    @test
    fn disputed_winner_max_vote() {
        let winner_a: u8 = compute_disputed_winner(10u64, 20u64, 40u64, 25u64, 9u64, 8u64, 7u64, 6u64);
        let winner_b: u8 = compute_disputed_winner(90u64, 20u64, 10u64, 15u64, 16u64, 17u64, 18u64, 19u64);
        let winner_c: u8 = compute_disputed_winner(1u64, 2u64, 3u64, 4u64, 5u64, 6u64, 7u64, 100u64);

        assert_eq(winner_a, 2u8);
        assert_eq(winner_b, 0u8);
        assert_eq(winner_c, 7u8);
    }

    @test
    fn timeout_defaults() {
        let now_ts: u64 = 100000u64;
        let challenge_deadline: u64 = now_ts + DEFAULT_DISPUTE_WINDOW;
        let fallback_ready_at: u64 = challenge_deadline + DEFAULT_DISPUTED_FINAL_TIMEOUT;

        assert_eq(challenge_deadline, 100600u64);
        assert_eq(fallback_ready_at, 102400u64);
    }

    @test
    fn no_vote_split() {
        let dispute_bond: u64 = DEFAULT_MIN_ORACLE_STAKE;
        let platform_fee: u64 = dispute_bond / 10u64;
        let proposer_reward: u64 = dispute_bond - platform_fee;

        assert_eq(platform_fee, 2000000u64);
        assert_eq(proposer_reward, 18000000u64);
        assert_eq(platform_fee + proposer_reward, dispute_bond);
    }

    @test
    fn disputer_win_split() {
        let locked_bond: u64 = DEFAULT_MIN_ORACLE_STAKE;
        let platform_fee: u64 = locked_bond / 10u64;
        let voter_reward_pool: u64 = locked_bond / 5u64;
        let disputer_reward: u64 = locked_bond - platform_fee - voter_reward_pool;
        let challenger_credit: u64 = DEFAULT_MIN_ORACLE_STAKE + disputer_reward;

        assert_eq(platform_fee, 2000000u64);
        assert_eq(voter_reward_pool, 4000000u64);
        assert_eq(disputer_reward, 14000000u64);
        assert_eq(challenger_credit, 34000000u64);
    }

    @test
    fn proposer_win_split() {
        let dispute_bond: u64 = 30000000u64;
        let platform_fee: u64 = dispute_bond / 10u64;
        let voter_reward_pool: u64 = dispute_bond / 5u64;
        let proposer_reward: u64 = dispute_bond - platform_fee - voter_reward_pool;

        assert_eq(platform_fee, 3000000u64);
        assert_eq(voter_reward_pool, 6000000u64);
        assert_eq(proposer_reward, 21000000u64);
        assert_eq(platform_fee + voter_reward_pool + proposer_reward, dispute_bond);
    }

    @test
    fn vote_reward_prorata() {
        let vote_weight: u64 = 20u64;
        let reward_pool: u64 = 18u64;
        let winning_vote_weight: u64 = 60u64;
        let reward: u64 = mul_div_u64(vote_weight, reward_pool, winning_vote_weight);
        let remaining_pool: u64 = reward_pool - reward;
        let remaining_weight: u64 = winning_vote_weight - vote_weight;

        assert_eq(reward, 6u64);
        assert_eq(remaining_pool, 12u64);
        assert_eq(remaining_weight, 40u64);
    }

    @noupgrade
    constructor() {}
}
