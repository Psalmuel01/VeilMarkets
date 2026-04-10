import veilmarkets_factory_v10.aleo;
import veilmarkets_core_v10.aleo;
import credits.aleo;
program veilmarkets_oracle_v10.aleo;

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

function register_oracle:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.public;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v10.aleo r1 into r2 r3;
    cast self.signer into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast self.signer r1 100u64 r5 into r6 as OracleCredential.record;
    async register_oracle self.caller r1 r3 into r7;
    output r2 as credits.aleo/credits.record;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v10.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_private_to_public.future;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    await r2;
    get.or_use oracle_u64[0u8] 30000000u64 into r5;
    gte r1 r5 into r6;
    assert.eq r6 true;
    get.or_use active_oracles[r0] 0u64 into r7;
    add r7 r1 into r8;
    set r8 into active_oracles[r0];

function propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 31u8 into r2;
    assert.eq r2 true;
    async propose_resolution r0 r1 self.caller into r3;
    output r3 as veilmarkets_oracle_v10.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get.or_use oracle_u8[1u8] 0u8 into r3;
    is.eq r3 0u8 into r4;
    assert.eq r4 true;
    get.or_use oracle_u64[0u8] 30000000u64 into r5;
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
    get.or_use oracle_u64[1u8] 10800u64 into r13;
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
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v10.aleo r2 into r3 r4;
    async dispute_resolution r1 self.caller r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_v10.aleo/dispute_resolution.future;

finalize dispute_resolution:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_private_to_public.future;
    get.or_use oracle_u8[1u8] 0u8 into r4;
    is.eq r4 0u8 into r5;
    assert.eq r5 true;
    await r3;
    get.or_use oracle_u64[0u8] 30000000u64 into r6;
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
    lte r2 31u8 into r3;
    assert.eq r3 true;
    assert.eq r0.owner self.caller;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async submit_quorum_vote r1 r2 self.caller into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v10.aleo/submit_quorum_vote.future;

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
    get.or_use oracle_u64[0u8] 30000000u64 into r11;
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

function vote_on_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    lte r2 31u8 into r3;
    assert.eq r3 true;
    assert.eq r0.owner self.caller;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async vote_on_resolution r1 r2 self.caller into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v10.aleo/vote_on_resolution.future;

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
    get.or_use oracle_u64[0u8] 30000000u64 into r11;
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

function execute_quorum_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 31u8 into r2;
    assert.eq r2 true;
    call veilmarkets_core_v10.aleo/resolve_market r0 r1 veilmarkets_oracle_v10.aleo into r3;
    async execute_quorum_resolution r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_v10.aleo/execute_quorum_resolution.future;

finalize execute_quorum_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_core_v10.aleo/resolve_market.future;
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
    branch.eq r5.is_disputed false to end_then_0_18;
    cast r1 into r10 as field;
    add r0 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    get.or_use votes[r12] 0u64 into r13;
    get.or_use vote_weight_totals[r0] 0u64 into r14;
    get.or_use oracle_u8[0u8] 3u8 into r15;
    get.or_use oracle_u64[0u8] 30000000u64 into r16;
    cast r15 into r17 as u64;
    mul r16 r17 into r18;
    get.or_use disputed_voter_counts[r0] 0u64 into r19;
    cast r15 into r20 as u64;
    gte r19 r20 into r21;
    assert.eq r21 true;
    gte r14 r18 into r22;
    assert.eq r22 true;
    gt r13 0u64 into r23;
    assert.eq r23 true;
    branch.eq true true to end_otherwise_0_19;
    position end_then_0_18;
    cast block.timestamp into r24 as u64;
    gte r24 r5.challenge_deadline into r25;
    assert.eq r25 true;
    assert.eq r1 r5.proposed_outcome;
    position end_otherwise_0_19;
    await r2;
    branch.eq r5.is_disputed false to end_then_0_20;
    get disputes[r0] into r26;
    is.neq r1 r5.proposed_outcome into r27;
    branch.eq r27 false to end_then_1_22;
    get active_oracles[r5.proposer] into r28;
    gte r28 r6 into r29;
    assert.eq r29 true;
    sub r28 r6 into r30;
    set r30 into active_oracles[r5.proposer];
    div r6 10u64 into r31;
    sub r6 r31 into r32;
    get.or_use active_oracles[r26.challenger] 0u64 into r33;
    add r33 r26.stake into r34;
    add r34 r32 into r35;
    set r35 into active_oracles[r26.challenger];
    get.or_use platform_fee_pool[0u8] 0u64 into r36;
    add r36 r31 into r37;
    set r37 into platform_fee_pool[0u8];
    branch.eq true true to end_otherwise_1_23;
    position end_then_1_22;
    div r26.stake 10u64 into r38;
    sub r26.stake r38 into r39;
    get active_oracles[r5.proposer] into r40;
    add r40 r39 into r41;
    set r41 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r42;
    add r42 r38 into r43;
    set r43 into platform_fee_pool[0u8];
    position end_otherwise_1_23;
    branch.eq true true to end_otherwise_0_21;
    position end_then_0_20;
    position end_otherwise_0_21;
    sub r8 r6 into r44;
    set r44 into oracle_locked_stake[r5.proposer];
    set 0u64 into proposal_locked_bond[r0];

function resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 31u8 into r2;
    assert.eq r2 true;
    call veilmarkets_core_v10.aleo/resolve_market r0 r1 veilmarkets_oracle_v10.aleo into r3;
    async resolve_on_core r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_v10.aleo/resolve_on_core.future;

finalize resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_core_v10.aleo/resolve_market.future;
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
    branch.eq r5.is_disputed false to end_then_0_24;
    cast r1 into r10 as field;
    add r0 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    get.or_use votes[r12] 0u64 into r13;
    get.or_use vote_weight_totals[r0] 0u64 into r14;
    get.or_use oracle_u8[0u8] 3u8 into r15;
    get.or_use oracle_u64[0u8] 30000000u64 into r16;
    cast r15 into r17 as u64;
    mul r16 r17 into r18;
    get.or_use disputed_voter_counts[r0] 0u64 into r19;
    cast r15 into r20 as u64;
    gte r19 r20 into r21;
    assert.eq r21 true;
    gte r14 r18 into r22;
    assert.eq r22 true;
    gt r13 0u64 into r23;
    assert.eq r23 true;
    branch.eq true true to end_otherwise_0_25;
    position end_then_0_24;
    cast block.timestamp into r24 as u64;
    gte r24 r5.challenge_deadline into r25;
    assert.eq r25 true;
    assert.eq r1 r5.proposed_outcome;
    position end_otherwise_0_25;
    await r2;
    branch.eq r5.is_disputed false to end_then_0_26;
    get disputes[r0] into r26;
    is.neq r1 r5.proposed_outcome into r27;
    branch.eq r27 false to end_then_1_28;
    get active_oracles[r5.proposer] into r28;
    gte r28 r6 into r29;
    assert.eq r29 true;
    sub r28 r6 into r30;
    set r30 into active_oracles[r5.proposer];
    div r6 10u64 into r31;
    sub r6 r31 into r32;
    get.or_use active_oracles[r26.challenger] 0u64 into r33;
    add r33 r26.stake into r34;
    add r34 r32 into r35;
    set r35 into active_oracles[r26.challenger];
    get.or_use platform_fee_pool[0u8] 0u64 into r36;
    add r36 r31 into r37;
    set r37 into platform_fee_pool[0u8];
    branch.eq true true to end_otherwise_1_29;
    position end_then_1_28;
    div r26.stake 10u64 into r38;
    sub r26.stake r38 into r39;
    get active_oracles[r5.proposer] into r40;
    add r40 r39 into r41;
    set r41 into active_oracles[r5.proposer];
    get.or_use platform_fee_pool[0u8] 0u64 into r42;
    add r42 r38 into r43;
    set r43 into platform_fee_pool[0u8];
    position end_otherwise_1_29;
    branch.eq true true to end_otherwise_0_27;
    position end_then_0_26;
    position end_otherwise_0_27;
    sub r8 r6 into r44;
    set r44 into oracle_locked_stake[r5.proposer];
    set 0u64 into proposal_locked_bond[r0];

function unstake_credits:
    input r0 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r0 into r1 r2;
    async unstake_credits self.caller r0 r2 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_oracle_v10.aleo/unstake_credits.future;

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
    gte r5 r1 into r8;
    assert.eq r8 true;
    sub r5 r1 into r9;
    gte r9 r6 into r10;
    assert.eq r10 true;
    set r9 into active_oracles[r0];

function withdraw_platform_fees:
    input r0 as u64.public;
    input r1 as address.public;
    call veilmarkets_factory_v10.aleo/verify_is_registered 4u8 self.caller into r2;
    call credits.aleo/transfer_public_to_private r1 r0 into r3 r4;
    async withdraw_platform_fees r0 r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_v10.aleo/withdraw_platform_fees.future;

finalize withdraw_platform_fees:
    input r0 as u64.public;
    input r1 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
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
    output r1 as veilmarkets_oracle_v10.aleo/admin_set_pause.future;

finalize admin_set_pause:
    input r0 as boolean.public;
    input r1 as address.public;
    assert.eq r1 aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
    ternary r0 1u8 0u8 into r2;
    set r2 into oracle_u8[1u8];

function set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    call veilmarkets_factory_v10.aleo/verify_is_registered 4u8 self.caller into r2;
    async set_protocol_u64 r0 r1 r2 into r3;
    output r3 as veilmarkets_oracle_v10.aleo/set_protocol_u64.future;

finalize set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    input r2 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
    await r2;
    is.eq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_30;
    gt r1 0u64 into r4;
    assert.eq r4 true;
    branch.eq true true to end_otherwise_0_31;
    position end_then_0_30;
    position end_otherwise_0_31;
    is.eq r0 1u8 into r5;
    branch.eq r5 false to end_then_0_32;
    gte r1 60u64 into r6;
    assert.eq r6 true;
    branch.eq true true to end_otherwise_0_33;
    position end_then_0_32;
    position end_otherwise_0_33;
    set r1 into oracle_u64[r0];

function set_protocol_u8:
    input r0 as u8.public;
    input r1 as u8.public;
    call veilmarkets_factory_v10.aleo/verify_is_registered 4u8 self.caller into r2;
    async set_protocol_u8 r0 r1 r2 into r3;
    output r3 as veilmarkets_oracle_v10.aleo/set_protocol_u8.future;

finalize set_protocol_u8:
    input r0 as u8.public;
    input r1 as u8.public;
    input r2 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
    await r2;
    is.eq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_34;
    gte r1 3u8 into r4;
    assert.eq r4 true;
    lte r1 32u8 into r5;
    assert.eq r5 true;
    branch.eq true true to end_otherwise_0_35;
    position end_then_0_34;
    position end_otherwise_0_35;
    is.eq r0 1u8 into r6;
    branch.eq r6 false to end_then_0_36;
    lte r1 1u8 into r7;
    assert.eq r7 true;
    branch.eq true true to end_otherwise_0_37;
    position end_then_0_36;
    position end_otherwise_0_37;
    set r1 into oracle_u8[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
