import credits.aleo;
import veilmarkets_factory_v12.aleo;
import veilmarkets_core_v12.aleo;
import veilmarkets_governance_v12.aleo;
program veilmarkets_oracle_v12.aleo;

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
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v12.aleo r1 into r2 r3;
    cast self.signer into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast self.signer r1 100u64 r5 into r6 as OracleCredential.record;
    async register_oracle r3 self.caller r1 into r7;
    output r2 as credits.aleo/credits.record;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v12.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as address.public;
    input r2 as u64.public;
    await r0;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get.or_use oracle_u64[0u8] 20000000u64 into r5;
    gte r2 r5 into r6;
    assert.eq r6 true;
    get.or_use active_oracles[r1] 0u64 into r7;
    add r7 r2 into r8;
    set r8 into active_oracles[r1];

function propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 7u8 into r2;
    assert.eq r2 true;
    async propose_resolution r0 r1 self.caller into r3;
    output r3 as veilmarkets_oracle_v12.aleo/propose_resolution.future;

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
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v12.aleo r2 into r3 r4;
    async dispute_resolution r4 r1 self.caller r2 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_v12.aleo/dispute_resolution.future;

finalize dispute_resolution:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as field.public;
    input r2 as address.public;
    input r3 as u64.public;
    await r0;
    get.or_use oracle_u8[1u8] 0u8 into r4;
    is.eq r4 0u8 into r5;
    assert.eq r5 true;
    get.or_use oracle_u64[0u8] 20000000u64 into r6;
    gte r3 r6 into r7;
    assert.eq r7 true;
    get proposals[r1] into r8;
    not r8.is_disputed into r9;
    assert.eq r9 true;
    cast block.timestamp into r10 as u64;
    lt r10 r8.challenge_deadline into r11;
    assert.eq r11 true;
    cast r8.market_id r8.proposed_outcome r8.challenge_deadline true r8.proposer into r12 as ResolutionProposal;
    set r12 into proposals[r1];
    cast r2 r3 r8.proposed_outcome into r13 as Dispute;
    set r13 into disputes[r1];

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
    output r7 as veilmarkets_oracle_v12.aleo/submit_quorum_vote.future;

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
    output r7 as veilmarkets_oracle_v12.aleo/vote_on_resolution.future;

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

function resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 7u8 into r2;
    assert.eq r2 true;
    call veilmarkets_core_v12.aleo/resolve_market r0 r1 veilmarkets_oracle_v12.aleo into r3;
    async resolve_on_core r3 r0 r1 into r4;
    output r4 as veilmarkets_oracle_v12.aleo/resolve_on_core.future;

finalize resolve_on_core:
    input r0 as veilmarkets_core_v12.aleo/resolve_market.future;
    input r1 as field.public;
    input r2 as u8.public;
    await r0;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get proposals[r1] into r5;
    get.or_use proposal_locked_bond[r1] 0u64 into r6;
    gt r6 0u64 into r7;
    assert.eq r7 true;
    get.or_use oracle_locked_stake[r5.proposer] 0u64 into r8;
    gte r8 r6 into r9;
    assert.eq r9 true;
    branch.eq r5.is_disputed false to end_then_0_0;
    get.or_use oracle_u8[0u8] 2u8 into r10;
    get.or_use disputed_voter_counts[r1] 0u64 into r11;
    cast r10 into r12 as u64;
    gte r11 r12 into r13;
    cast r2 into r14 as field;
    add r1 r14 into r15;
    hash.bhp256 r15 into r16 as field;
    get.or_use votes[r16] 0u64 into r17;
    gt r17 0u64 into r18;
    and r13 r18 into r19;
    not r19 into r20;
    branch.eq r20 false to end_then_1_2;
    cast block.timestamp into r21 as u64;
    add r5.challenge_deadline 1800u64 into r22;
    gte r21 r22 into r23;
    assert.eq r23 true;
    assert.eq r2 r5.proposed_outcome;
    branch.eq true true to end_otherwise_1_3;
    position end_then_1_2;
    get.or_use oracle_u64[0u8] 20000000u64 into r24;
    get.or_use vote_weight_totals[r1] 0u64 into r25;
    cast r10 into r26 as u64;
    mul r24 r26 into r27;
    lt r25 r27 into r28;
    branch.eq r28 false to end_then_2_4;
    cast block.timestamp into r29 as u64;
    add r5.challenge_deadline 1800u64 into r30;
    gte r29 r30 into r31;
    assert.eq r31 true;
    assert.eq r2 r5.proposed_outcome;
    branch.eq true true to end_otherwise_2_5;
    position end_then_2_4;
    position end_otherwise_2_5;
    position end_otherwise_1_3;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    cast block.timestamp into r32 as u64;
    gte r32 r5.challenge_deadline into r33;
    assert.eq r33 true;
    assert.eq r2 r5.proposed_outcome;
    position end_otherwise_0_1;
    set r2 into resolved_outcomes[r1];
    branch.eq r5.is_disputed false to end_then_0_6;
    get disputes[r1] into r34;
    cast r2 into r35 as field;
    add r1 r35 into r36;
    hash.bhp256 r36 into r37 as field;
    get.or_use votes[r37] 0u64 into r38;
    is.eq r38 0u64 into r39;
    branch.eq r39 false to end_then_1_8;
    div r34.stake 10u64 into r40;
    sub r34.stake r40 into r41;
    get active_oracles[r5.proposer] into r42;
    add r42 r41 into r43;
    set r43 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r44;
    add r44 r40 into r45;
    set r45 into platform_fee_pool[0u8];
    set 0u64 into market_voter_reward_pool[r1];
    set 0u64 into market_winning_vote_weight[r1];
    branch.eq true true to end_otherwise_1_9;
    position end_then_1_8;
    is.neq r2 r5.proposed_outcome into r46;
    branch.eq r46 false to end_then_2_10;
    get active_oracles[r5.proposer] into r47;
    gte r47 r6 into r48;
    assert.eq r48 true;
    sub r47 r6 into r49;
    set r49 into active_oracles[r5.proposer];
    div r6 10u64 into r50;
    div r6 5u64 into r51;
    sub r6 r50 into r52;
    sub r52 r51 into r53;
    get.or_use active_oracles[r34.challenger] 0u64 into r54;
    add r54 r34.stake into r55;
    add r55 r53 into r56;
    set r56 into active_oracles[r34.challenger];
    get.or_use platform_fee_pool[0u8] 0u64 into r57;
    add r57 r50 into r58;
    set r58 into platform_fee_pool[0u8];
    set r51 into market_voter_reward_pool[r1];
    set r38 into market_winning_vote_weight[r1];
    branch.eq true true to end_otherwise_2_11;
    position end_then_2_10;
    div r34.stake 10u64 into r59;
    div r34.stake 5u64 into r60;
    sub r34.stake r59 into r61;
    sub r61 r60 into r62;
    get active_oracles[r5.proposer] into r63;
    add r63 r62 into r64;
    set r64 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r65;
    add r65 r59 into r66;
    set r66 into platform_fee_pool[0u8];
    set r60 into market_voter_reward_pool[r1];
    set r38 into market_winning_vote_weight[r1];
    position end_otherwise_2_11;
    position end_otherwise_1_9;
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    set 0u64 into market_voter_reward_pool[r1];
    set 0u64 into market_winning_vote_weight[r1];
    position end_otherwise_0_7;
    sub r8 r6 into r67;
    set r67 into oracle_locked_stake[r5.proposer];
    set 0u64 into proposal_locked_bond[r1];

function unstake_credits:
    input r0 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r0 into r1 r2;
    async unstake_credits r2 self.caller r0 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_oracle_v12.aleo/unstake_credits.future;

finalize unstake_credits:
    input r0 as credits.aleo/transfer_public_to_private.future;
    input r1 as address.public;
    input r2 as u64.public;
    await r0;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get active_oracles[r1] into r5;
    get.or_use oracle_locked_stake[r1] 0u64 into r6;
    gte r5 r6 into r7;
    assert.eq r7 true;
    assert.eq r6 0u64;
    gte r5 r2 into r8;
    assert.eq r8 true;
    sub r5 r2 into r9;
    gte r9 r6 into r10;
    assert.eq r10 true;
    set r9 into active_oracles[r1];

function claim_vote_reward:
    input r0 as field.public;
    async claim_vote_reward r0 self.caller into r1;
    output r1 as veilmarkets_oracle_v12.aleo/claim_vote_reward.future;

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
    branch.eq r27 false to end_then_0_12;
    get.or_use active_oracles[r1] 0u64 into r28;
    add r28 r24 into r29;
    set r29 into active_oracles[r1];
    branch.eq true true to end_otherwise_0_13;
    position end_then_0_12;
    position end_otherwise_0_13;

function withdraw_platform_fees:
    input r0 as u64.public;
    input r1 as address.public;
    call veilmarkets_factory_v12.aleo/verify_is_registered 4u8 self.caller into r2;
    call credits.aleo/transfer_public_to_private r1 r0 into r3 r4;
    async withdraw_platform_fees r2 r4 r0 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_v12.aleo/withdraw_platform_fees.future;

finalize withdraw_platform_fees:
    input r0 as veilmarkets_factory_v12.aleo/verify_is_registered.future;
    input r1 as credits.aleo/transfer_public_to_private.future;
    input r2 as u64.public;
    await r0;
    await r1;
    gt r2 0u64 into r3;
    assert.eq r3 true;
    get.or_use platform_fee_pool[0u8] 0u64 into r4;
    gte r4 r2 into r5;
    assert.eq r5 true;
    sub r4 r2 into r6;
    set r6 into platform_fee_pool[0u8];

function admin_set_pause:
    input r0 as boolean.public;
    async admin_set_pause r0 self.caller into r1;
    output r1 as veilmarkets_oracle_v12.aleo/admin_set_pause.future;

finalize admin_set_pause:
    input r0 as boolean.public;
    input r1 as address.public;
    assert.eq r1 aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
    ternary r0 1u8 0u8 into r2;
    set r2 into oracle_u8[1u8];

function set_protocol_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    call veilmarkets_governance_v12.aleo/consume_oracle_u64 r0 r1 r2 into r3;
    async set_protocol_u64 r3 r1 r2 into r4;
    output r4 as veilmarkets_oracle_v12.aleo/set_protocol_u64.future;

finalize set_protocol_u64:
    input r0 as veilmarkets_governance_v12.aleo/consume_oracle_u64.future;
    input r1 as u8.public;
    input r2 as u64.public;
    await r0;
    is.eq r1 0u8 into r3;
    branch.eq r3 false to end_then_0_14;
    gt r2 0u64 into r4;
    assert.eq r4 true;
    branch.eq true true to end_otherwise_0_15;
    position end_then_0_14;
    position end_otherwise_0_15;
    is.eq r1 1u8 into r5;
    branch.eq r5 false to end_then_0_16;
    gte r2 60u64 into r6;
    assert.eq r6 true;
    branch.eq true true to end_otherwise_0_17;
    position end_then_0_16;
    position end_otherwise_0_17;
    set r2 into oracle_u64[r1];

function set_protocol_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    call veilmarkets_governance_v12.aleo/consume_oracle_u8 r0 r1 r2 into r3;
    async set_protocol_u8 r3 r1 r2 into r4;
    output r4 as veilmarkets_oracle_v12.aleo/set_protocol_u8.future;

finalize set_protocol_u8:
    input r0 as veilmarkets_governance_v12.aleo/consume_oracle_u8.future;
    input r1 as u8.public;
    input r2 as u8.public;
    await r0;
    is.eq r1 0u8 into r3;
    branch.eq r3 false to end_then_0_18;
    gte r2 2u8 into r4;
    assert.eq r4 true;
    lte r2 8u8 into r5;
    assert.eq r5 true;
    branch.eq true true to end_otherwise_0_19;
    position end_then_0_18;
    position end_otherwise_0_19;
    is.eq r1 1u8 into r6;
    branch.eq r6 false to end_then_0_20;
    lte r2 1u8 into r7;
    assert.eq r7 true;
    branch.eq true true to end_otherwise_0_21;
    position end_then_0_20;
    position end_otherwise_0_21;
    set r2 into oracle_u8[r1];

constructor:
    assert.eq program_owner aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
