import veilmarkets_factory_build_v11.aleo;
import veilmarkets_core_build_v11.aleo;
import veilmarkets_gov_build_v11.aleo;
import credits.aleo;
program veilmarkets_oracle_build_v11.aleo;

record OracleCredential:
    owner as address.private;
    staked_amount as u64.private;
    reputation_score as u64.private;
    nonce as group.private;

struct ResolutionProposal:
    market_id as field;
    proposed_outcome as u8;
    challenge_deadline as u64;
    is_disputed as boolean;
    proposer as address;

struct Dispute:
    challenger as address;
    stake as u64;
    proposal_outcome as u8;

mapping proposals:
    key as field.public;
    value as ResolutionProposal.public;

mapping active_oracles:
    key as address.public;
    value as u64.public;

mapping oracle_locked_stake:
    key as address.public;
    value as u64.public;

mapping proposal_locked_bond:
    key as field.public;
    value as u64.public;

mapping votes:
    key as field.public;
    value as u64.public;

mapping vote_weight_totals:
    key as field.public;
    value as u64.public;

mapping disputed_voter_counts:
    key as field.public;
    value as u64.public;

mapping vote_receipts:
    key as field.public;
    value as boolean.public;

mapping vote_outcomes:
    key as field.public;
    value as u8.public;

mapping vote_weights:
    key as field.public;
    value as u64.public;

mapping vote_reward_claimed:
    key as field.public;
    value as boolean.public;

mapping disputes:
    key as field.public;
    value as Dispute.public;

mapping oracle_u64:
    key as u8.public;
    value as u64.public;

mapping oracle_u8:
    key as u8.public;
    value as u8.public;

mapping platform_fee_pool:
    key as u8.public;
    value as u64.public;

mapping market_voter_reward_pool:
    key as field.public;
    value as u64.public;

mapping market_winning_vote_weight:
    key as field.public;
    value as u64.public;

mapping resolved_outcomes:
    key as field.public;
    value as u8.public;

function register_oracle:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.public;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_build_v11.aleo r1 into r2 r3;
    cast self.signer into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast self.signer r1 100u64 r5 into r6 as OracleCredential.record;
    async register_oracle self.caller r1 r3 into r7;
    output r2 as credits.aleo/credits.record;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_build_v11.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_private_to_public.future;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    await r2;
    get.or_use oracle_u64[0u8] 20000000u64 into r5;
    gte r1 r5 into r6;
    assert.eq r6 true;
    get.or_use active_oracles[r0] 0u64 into r7;
    add r7 r1 into r8;
    set r8 into active_oracles[r0];

function propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 7u8 into r2;
    assert.eq r2 true;
    async propose_resolution r0 r1 self.caller into r3;
    output r3 as veilmarkets_oracle_build_v11.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get.or_use oracle_u64[0u8] 20000000u64 into r5;
    get active_oracles[r2] into r6;
    get.or_use oracle_locked_stake[r2] 0u64 into r7;
    gte r6 r7 into r8;
    assert.eq r8 true;
    sub r6 r7 into r9;
    gte r9 r5 into r10;
    assert.eq r10 true;
    contains proposals[r0] into r11;
    not r11 into r12;
    assert.eq r12 true;
    get.or_use oracle_u64[1u8] 600u64 into r13;
    cast block.timestamp into r14 as u64;
    add r14 r13 into r15;
    cast r0 r1 r15 false r2 into r16 as ResolutionProposal;
    set r16 into proposals[r0];
    add r7 r5 into r17;
    set r17 into oracle_locked_stake[r2];
    set r5 into proposal_locked_bond[r0];

function dispute_resolution:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_build_v11.aleo r2 into r3 r4;
    async dispute_resolution r1 self.caller r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_build_v11.aleo/dispute_resolution.future;

finalize dispute_resolution:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_private_to_public.future;
    get.or_use oracle_u8[1u8] 0u8 into r4;
    is.eq r4 0u8 into r5;
    assert.eq r5 true;
    await r3;
    get.or_use oracle_u64[0u8] 20000000u64 into r6;
    gte r2 r6 into r7;
    assert.eq r7 true;
    get proposals[r0] into r8;
    not r8.is_disputed into r9;
    assert.eq r9 true;
    cast block.timestamp into r10 as u64;
    lt r10 r8.challenge_deadline into r11;
    assert.eq r11 true;
    cast r8.market_id r8.proposed_outcome r8.challenge_deadline true r8.proposer into r12 as ResolutionProposal;
    set r12 into proposals[r0];
    cast r1 r2 r8.proposed_outcome into r13 as Dispute;
    set r13 into disputes[r0];

function submit_quorum_vote:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    lte r2 7u8 into r3;
    assert.eq r3 true;
    assert.eq r0.owner self.caller;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async submit_quorum_vote r1 r2 self.caller into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_build_v11.aleo/submit_quorum_vote.future;

finalize submit_quorum_vote:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get proposals[r0] into r5;
    assert.eq r5.is_disputed true;
    cast r2 into r6 as field;
    add r0 r6 into r7;
    hash.bhp256 r7 into r8 as field;
    get.or_use vote_receipts[r8] false into r9;
    not r9 into r10;
    assert.eq r10 true;
    set true into vote_receipts[r8];
    get.or_use oracle_u64[0u8] 20000000u64 into r11;
    get active_oracles[r2] into r12;
    gte r12 r11 into r13;
    assert.eq r13 true;
    cast r1 into r14 as field;
    add r0 r14 into r15;
    hash.bhp256 r15 into r16 as field;
    get.or_use votes[r16] 0u64 into r17;
    add r17 r12 into r18;
    set r18 into votes[r16];
    get.or_use vote_weight_totals[r0] 0u64 into r19;
    add r19 r12 into r20;
    set r20 into vote_weight_totals[r0];
    get.or_use disputed_voter_counts[r0] 0u64 into r21;
    add r21 1u64 into r22;
    set r22 into disputed_voter_counts[r0];
    set r1 into vote_outcomes[r8];
    set r12 into vote_weights[r8];
    set false into vote_reward_claimed[r8];

function vote_on_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    lte r2 7u8 into r3;
    assert.eq r3 true;
    assert.eq r0.owner self.caller;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async vote_on_resolution r1 r2 self.caller into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_build_v11.aleo/vote_on_resolution.future;

finalize vote_on_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get proposals[r0] into r5;
    assert.eq r5.is_disputed true;
    cast r2 into r6 as field;
    add r0 r6 into r7;
    hash.bhp256 r7 into r8 as field;
    get.or_use vote_receipts[r8] false into r9;
    not r9 into r10;
    assert.eq r10 true;
    set true into vote_receipts[r8];
    get.or_use oracle_u64[0u8] 20000000u64 into r11;
    get active_oracles[r2] into r12;
    gte r12 r11 into r13;
    assert.eq r13 true;
    cast r1 into r14 as field;
    add r0 r14 into r15;
    hash.bhp256 r15 into r16 as field;
    get.or_use votes[r16] 0u64 into r17;
    add r17 r12 into r18;
    set r18 into votes[r16];
    get.or_use vote_weight_totals[r0] 0u64 into r19;
    add r19 r12 into r20;
    set r20 into vote_weight_totals[r0];
    get.or_use disputed_voter_counts[r0] 0u64 into r21;
    add r21 1u64 into r22;
    set r22 into disputed_voter_counts[r0];
    set r1 into vote_outcomes[r8];
    set r12 into vote_weights[r8];
    set false into vote_reward_claimed[r8];

function execute_quorum_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 7u8 into r2;
    assert.eq r2 true;
    call veilmarkets_core_build_v11.aleo/resolve_market r0 r1 veilmarkets_oracle_build_v11.aleo into r3;
    async execute_quorum_resolution r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_build_v11.aleo/execute_quorum_resolution.future;

finalize execute_quorum_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_core_build_v11.aleo/resolve_market.future;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get proposals[r0] into r5;
    get.or_use proposal_locked_bond[r0] 0u64 into r6;
    gt r6 0u64 into r7;
    assert.eq r7 true;
    get.or_use oracle_locked_stake[r5.proposer] 0u64 into r8;
    gte r8 r6 into r9;
    assert.eq r9 true;
    branch.eq r5.is_disputed false to end_then_0_0;
    cast r1 into r10 as field;
    add r0 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    get.or_use votes[r12] 0u64 into r13;
    get.or_use vote_weight_totals[r0] 0u64 into r14;
    get.or_use oracle_u8[0u8] 2u8 into r15;
    get.or_use oracle_u64[0u8] 20000000u64 into r16;
    cast r15 into r17 as u64;
    mul r16 r17 into r18;
    get.or_use disputed_voter_counts[r0] 0u64 into r19;
    cast block.timestamp into r20 as u64;
    add r5.challenge_deadline 1800u64 into r21;
    gte r20 r21 into r22;
    cast r15 into r23 as u64;
    gte r19 r23 into r24;
    gte r14 r18 into r25;
    and r24 r25 into r26;
    gt r13 0u64 into r27;
    and r26 r27 into r28;
    not r28 into r29;
    branch.eq r29 false to end_then_1_2;
    assert.eq r22 true;
    assert.eq r1 r5.proposed_outcome;
    branch.eq true true to end_otherwise_1_3;
    position end_then_1_2;
    position end_otherwise_1_3;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    cast block.timestamp into r30 as u64;
    gte r30 r5.challenge_deadline into r31;
    assert.eq r31 true;
    assert.eq r1 r5.proposed_outcome;
    position end_otherwise_0_1;
    await r2;
    set r1 into resolved_outcomes[r0];
    branch.eq r5.is_disputed false to end_then_0_4;
    get disputes[r0] into r32;
    cast r1 into r33 as field;
    add r0 r33 into r34;
    hash.bhp256 r34 into r35 as field;
    get.or_use votes[r35] 0u64 into r36;
    gt r36 0u64 into r37;
    not r37 into r38;
    branch.eq r38 false to end_then_1_6;
    div r32.stake 10u64 into r39;
    sub r32.stake r39 into r40;
    get active_oracles[r5.proposer] into r41;
    add r41 r40 into r42;
    set r42 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r43;
    add r43 r39 into r44;
    set r44 into platform_fee_pool[0u8];
    set 0u64 into market_voter_reward_pool[r0];
    set 0u64 into market_winning_vote_weight[r0];
    branch.eq true true to end_otherwise_1_7;
    position end_then_1_6;
    is.neq r1 r5.proposed_outcome into r45;
    branch.eq r45 false to end_then_2_8;
    get active_oracles[r5.proposer] into r46;
    gte r46 r6 into r47;
    assert.eq r47 true;
    sub r46 r6 into r48;
    set r48 into active_oracles[r5.proposer];
    div r6 10u64 into r49;
    div r6 5u64 into r50;
    sub r6 r49 into r51;
    sub r51 r50 into r52;
    get.or_use active_oracles[r32.challenger] 0u64 into r53;
    add r53 r32.stake into r54;
    add r54 r52 into r55;
    set r55 into active_oracles[r32.challenger];
    get.or_use platform_fee_pool[0u8] 0u64 into r56;
    add r56 r49 into r57;
    set r57 into platform_fee_pool[0u8];
    set r50 into market_voter_reward_pool[r0];
    set r36 into market_winning_vote_weight[r0];
    branch.eq true true to end_otherwise_2_9;
    position end_then_2_8;
    div r32.stake 10u64 into r58;
    div r32.stake 5u64 into r59;
    sub r32.stake r58 into r60;
    sub r60 r59 into r61;
    get active_oracles[r5.proposer] into r62;
    add r62 r61 into r63;
    set r63 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r64;
    add r64 r58 into r65;
    set r65 into platform_fee_pool[0u8];
    set r59 into market_voter_reward_pool[r0];
    set r36 into market_winning_vote_weight[r0];
    position end_otherwise_2_9;
    position end_otherwise_1_7;
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    set 0u64 into market_voter_reward_pool[r0];
    set 0u64 into market_winning_vote_weight[r0];
    position end_otherwise_0_5;
    sub r8 r6 into r66;
    set r66 into oracle_locked_stake[r5.proposer];
    set 0u64 into proposal_locked_bond[r0];

function resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 7u8 into r2;
    assert.eq r2 true;
    call veilmarkets_core_build_v11.aleo/resolve_market r0 r1 veilmarkets_oracle_build_v11.aleo into r3;
    async resolve_on_core r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_build_v11.aleo/resolve_on_core.future;

finalize resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_core_build_v11.aleo/resolve_market.future;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get proposals[r0] into r5;
    get.or_use proposal_locked_bond[r0] 0u64 into r6;
    gt r6 0u64 into r7;
    assert.eq r7 true;
    get.or_use oracle_locked_stake[r5.proposer] 0u64 into r8;
    gte r8 r6 into r9;
    assert.eq r9 true;
    branch.eq r5.is_disputed false to end_then_0_10;
    cast r1 into r10 as field;
    add r0 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    get.or_use votes[r12] 0u64 into r13;
    get.or_use vote_weight_totals[r0] 0u64 into r14;
    get.or_use oracle_u8[0u8] 2u8 into r15;
    get.or_use oracle_u64[0u8] 20000000u64 into r16;
    cast r15 into r17 as u64;
    mul r16 r17 into r18;
    get.or_use disputed_voter_counts[r0] 0u64 into r19;
    cast block.timestamp into r20 as u64;
    add r5.challenge_deadline 1800u64 into r21;
    gte r20 r21 into r22;
    cast r15 into r23 as u64;
    gte r19 r23 into r24;
    gte r14 r18 into r25;
    and r24 r25 into r26;
    gt r13 0u64 into r27;
    and r26 r27 into r28;
    not r28 into r29;
    branch.eq r29 false to end_then_1_12;
    assert.eq r22 true;
    assert.eq r1 r5.proposed_outcome;
    branch.eq true true to end_otherwise_1_13;
    position end_then_1_12;
    position end_otherwise_1_13;
    branch.eq true true to end_otherwise_0_11;
    position end_then_0_10;
    cast block.timestamp into r30 as u64;
    gte r30 r5.challenge_deadline into r31;
    assert.eq r31 true;
    assert.eq r1 r5.proposed_outcome;
    position end_otherwise_0_11;
    await r2;
    set r1 into resolved_outcomes[r0];
    branch.eq r5.is_disputed false to end_then_0_14;
    get disputes[r0] into r32;
    cast r1 into r33 as field;
    add r0 r33 into r34;
    hash.bhp256 r34 into r35 as field;
    get.or_use votes[r35] 0u64 into r36;
    gt r36 0u64 into r37;
    not r37 into r38;
    branch.eq r38 false to end_then_1_16;
    div r32.stake 10u64 into r39;
    sub r32.stake r39 into r40;
    get active_oracles[r5.proposer] into r41;
    add r41 r40 into r42;
    set r42 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r43;
    add r43 r39 into r44;
    set r44 into platform_fee_pool[0u8];
    set 0u64 into market_voter_reward_pool[r0];
    set 0u64 into market_winning_vote_weight[r0];
    branch.eq true true to end_otherwise_1_17;
    position end_then_1_16;
    is.neq r1 r5.proposed_outcome into r45;
    branch.eq r45 false to end_then_2_18;
    get active_oracles[r5.proposer] into r46;
    gte r46 r6 into r47;
    assert.eq r47 true;
    sub r46 r6 into r48;
    set r48 into active_oracles[r5.proposer];
    div r6 10u64 into r49;
    div r6 5u64 into r50;
    sub r6 r49 into r51;
    sub r51 r50 into r52;
    get.or_use active_oracles[r32.challenger] 0u64 into r53;
    add r53 r32.stake into r54;
    add r54 r52 into r55;
    set r55 into active_oracles[r32.challenger];
    get.or_use platform_fee_pool[0u8] 0u64 into r56;
    add r56 r49 into r57;
    set r57 into platform_fee_pool[0u8];
    set r50 into market_voter_reward_pool[r0];
    set r36 into market_winning_vote_weight[r0];
    branch.eq true true to end_otherwise_2_19;
    position end_then_2_18;
    div r32.stake 10u64 into r58;
    div r32.stake 5u64 into r59;
    sub r32.stake r58 into r60;
    sub r60 r59 into r61;
    get active_oracles[r5.proposer] into r62;
    add r62 r61 into r63;
    set r63 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r64;
    add r64 r58 into r65;
    set r65 into platform_fee_pool[0u8];
    set r59 into market_voter_reward_pool[r0];
    set r36 into market_winning_vote_weight[r0];
    position end_otherwise_2_19;
    position end_otherwise_1_17;
    branch.eq true true to end_otherwise_0_15;
    position end_then_0_14;
    set 0u64 into market_voter_reward_pool[r0];
    set 0u64 into market_winning_vote_weight[r0];
    position end_otherwise_0_15;
    sub r8 r6 into r66;
    set r66 into oracle_locked_stake[r5.proposer];
    set 0u64 into proposal_locked_bond[r0];

function unstake_credits:
    input r0 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r0 into r1 r2;
    async unstake_credits self.caller r0 r2 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_oracle_build_v11.aleo/unstake_credits.future;

finalize unstake_credits:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_public_to_private.future;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    await r2;
    get active_oracles[r0] into r5;
    get.or_use oracle_locked_stake[r0] 0u64 into r6;
    gte r5 r6 into r7;
    assert.eq r7 true;
    assert.eq r6 0u64;
    gte r5 r1 into r8;
    assert.eq r8 true;
    sub r5 r1 into r9;
    gte r9 r6 into r10;
    assert.eq r10 true;
    set r9 into active_oracles[r0];

function claim_vote_reward:
    input r0 as field.public;
    async claim_vote_reward r0 self.caller into r1;
    output r1 as veilmarkets_oracle_build_v11.aleo/claim_vote_reward.future;

finalize claim_vote_reward:
    input r0 as field.public;
    input r1 as address.public;
    get.or_use proposal_locked_bond[r0] 0u64 into r2;
    assert.eq r2 0u64;
    get.or_use market_voter_reward_pool[r0] 0u64 into r3;
    gt r3 0u64 into r4;
    assert.eq r4 true;
    get.or_use market_winning_vote_weight[r0] 0u64 into r5;
    gt r5 0u64 into r6;
    assert.eq r6 true;
    get proposals[r0] into r7;
    assert.eq r7.is_disputed true;
    get resolved_outcomes[r0] into r8;
    cast r1 into r9 as field;
    add r0 r9 into r10;
    hash.bhp256 r10 into r11 as field;
    get.or_use vote_receipts[r11] false into r12;
    assert.eq r12 true;
    get.or_use vote_reward_claimed[r11] false into r13;
    not r13 into r14;
    assert.eq r14 true;
    get.or_use vote_outcomes[r11] 255u8 into r15;
    assert.eq r15 r8;
    get.or_use vote_weights[r11] 0u64 into r16;
    gt r16 0u64 into r17;
    assert.eq r17 true;
    gte r5 r16 into r18;
    assert.eq r18 true;
    assert.eq r6 true;
    cast r16 into r19 as u128;
    cast r3 into r20 as u128;
    cast r5 into r21 as u128;
    mul r19 r20 into r22;
    div r22 r21 into r23;
    cast r23 into r24 as u64;
    sub r3 r24 into r25;
    sub r5 r16 into r26;
    set r25 into market_voter_reward_pool[r0];
    set r26 into market_winning_vote_weight[r0];
    set true into vote_reward_claimed[r11];
    gt r24 0u64 into r27;
    branch.eq r27 false to end_then_0_20;
    get.or_use active_oracles[r1] 0u64 into r28;
    add r28 r24 into r29;
    set r29 into active_oracles[r1];
    branch.eq true true to end_otherwise_0_21;
    position end_then_0_20;
    position end_otherwise_0_21;

function withdraw_platform_fees:
    input r0 as u64.public;
    input r1 as address.public;
    call veilmarkets_factory_build_v11.aleo/verify_is_registered 4u8 self.caller into r2;
    call credits.aleo/transfer_public_to_private r1 r0 into r3 r4;
    async withdraw_platform_fees r0 r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_build_v11.aleo/withdraw_platform_fees.future;

finalize withdraw_platform_fees:
    input r0 as u64.public;
    input r1 as veilmarkets_factory_build_v11.aleo/verify_is_registered.future;
    input r2 as credits.aleo/transfer_public_to_private.future;
    await r1;
    gt r0 0u64 into r3;
    assert.eq r3 true;
    get.or_use platform_fee_pool[0u8] 0u64 into r4;
    gte r4 r0 into r5;
    assert.eq r5 true;
    sub r4 r0 into r6;
    set r6 into platform_fee_pool[0u8];
    await r2;

function admin_set_pause:
    input r0 as boolean.public;
    async admin_set_pause r0 self.caller into r1;
    output r1 as veilmarkets_oracle_build_v11.aleo/admin_set_pause.future;

finalize admin_set_pause:
    input r0 as boolean.public;
    input r1 as address.public;
    assert.eq r1 aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
    ternary r0 1u8 0u8 into r2;
    set r2 into oracle_u8[1u8];

function set_protocol_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    call veilmarkets_gov_build_v11.aleo/consume_oracle_u64 r0 r1 r2 into r3;
    async set_protocol_u64 r1 r2 r3 into r4;
    output r4 as veilmarkets_oracle_build_v11.aleo/set_protocol_u64.future;

finalize set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    input r2 as veilmarkets_gov_build_v11.aleo/consume_oracle_u64.future;
    await r2;
    is.eq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_22;
    gt r1 0u64 into r4;
    assert.eq r4 true;
    branch.eq true true to end_otherwise_0_23;
    position end_then_0_22;
    position end_otherwise_0_23;
    is.eq r0 1u8 into r5;
    branch.eq r5 false to end_then_0_24;
    gte r1 60u64 into r6;
    assert.eq r6 true;
    branch.eq true true to end_otherwise_0_25;
    position end_then_0_24;
    position end_otherwise_0_25;
    set r1 into oracle_u64[r0];

function set_protocol_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    call veilmarkets_gov_build_v11.aleo/consume_oracle_u8 r0 r1 r2 into r3;
    async set_protocol_u8 r1 r2 r3 into r4;
    output r4 as veilmarkets_oracle_build_v11.aleo/set_protocol_u8.future;

finalize set_protocol_u8:
    input r0 as u8.public;
    input r1 as u8.public;
    input r2 as veilmarkets_gov_build_v11.aleo/consume_oracle_u8.future;
    await r2;
    is.eq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_26;
    gte r1 2u8 into r4;
    assert.eq r4 true;
    lte r1 8u8 into r5;
    assert.eq r5 true;
    branch.eq true true to end_otherwise_0_27;
    position end_then_0_26;
    position end_otherwise_0_27;
    is.eq r0 1u8 into r6;
    branch.eq r6 false to end_then_0_28;
    lte r1 1u8 into r7;
    assert.eq r7 true;
    branch.eq true true to end_otherwise_0_29;
    position end_then_0_28;
    position end_otherwise_0_29;
    set r1 into oracle_u8[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
