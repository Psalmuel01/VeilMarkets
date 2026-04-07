import veilmarkets_factory_v8.aleo;
import veilmarkets_v8.aleo;
import credits.aleo;
program veilmarkets_oracle_v8.aleo;

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

mapping votes:
    key as field.public;
    value as u64.public;

mapping disputes:
    key as field.public;
    value as Dispute.public;

function register_oracle:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.public;
    gte r1 30000000u64 into r2;
    assert.eq r2 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v8.aleo r1 into r3 r4;
    cast self.signer into r5 as field;
    hash.bhp256 r5 into r6 as group;
    cast self.signer r1 100u64 r6 into r7 as OracleCredential.record;
    async register_oracle self.caller r1 r4 into r8;
    output r3 as credits.aleo/credits.record;
    output r7 as OracleCredential.record;
    output r8 as veilmarkets_oracle_v8.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_private_to_public.future;
    await r2;
    get.or_use active_oracles[r0] 0u64 into r3;
    add r3 r1 into r4;
    set r4 into active_oracles[r0];

function propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    async propose_resolution r0 r1 self.caller into r2;
    output r2 as veilmarkets_oracle_v8.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    lte r1 7u8 into r3;
    assert.eq r3 true;
    get active_oracles[r2] into r4;
    gte r4 30000000u64 into r5;
    assert.eq r5 true;
    contains proposals[r0] into r6;
    not r6 into r7;
    assert.eq r7 true;
    cast block.timestamp into r8 as u64;
    add r8 300u64 into r9;
    cast r0 r1 r9 false r2 into r10 as ResolutionProposal;
    set r10 into proposals[r0];

function dispute_resolution:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    gte r2 30000000u64 into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v8.aleo r2 into r4 r5;
    async dispute_resolution r1 self.caller r2 r5 into r6;
    output r4 as credits.aleo/credits.record;
    output r6 as veilmarkets_oracle_v8.aleo/dispute_resolution.future;

finalize dispute_resolution:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_private_to_public.future;
    await r3;
    get proposals[r0] into r4;
    not r4.is_disputed into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    lt r6 r4.challenge_deadline into r7;
    assert.eq r7 true;
    cast r4.market_id r4.proposed_outcome r4.challenge_deadline true r4.proposer into r8 as ResolutionProposal;
    set r8 into proposals[r0];
    cast r1 r2 r4.proposed_outcome into r9 as Dispute;
    set r9 into disputes[r0];

function vote_on_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    lte r2 7u8 into r3;
    assert.eq r3 true;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async vote_on_resolution r1 r2 r0.staked_amount into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v8.aleo/vote_on_resolution.future;

finalize vote_on_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    get proposals[r0] into r3;
    assert.eq r3.is_disputed true;
    cast r1 into r4 as field;
    add r0 r4 into r5;
    hash.bhp256 r5 into r6 as field;
    get.or_use votes[r6] 0u64 into r7;
    add r7 r2 into r8;
    set r8 into votes[r6];

function resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    assert.eq self.caller aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
    lte r1 7u8 into r2;
    assert.eq r2 true;
    call veilmarkets_v8.aleo/resolve_market r0 r1 veilmarkets_oracle_v8.aleo into r3;
    async resolve_on_core r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_v8.aleo/resolve_on_core.future;

finalize resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_v8.aleo/resolve_market.future;
    await r2;
    get proposals[r0] into r3;
    branch.eq r3.is_disputed false to end_then_0_2;
    add r0 0field into r4;
    hash.bhp256 r4 into r5 as field;
    get.or_use votes[r5] 0u64 into r6;
    add r0 1field into r7;
    hash.bhp256 r7 into r8 as field;
    get.or_use votes[r8] 0u64 into r9;
    add r0 2field into r10;
    hash.bhp256 r10 into r11 as field;
    get.or_use votes[r11] 0u64 into r12;
    add r0 3field into r13;
    hash.bhp256 r13 into r14 as field;
    get.or_use votes[r14] 0u64 into r15;
    add r0 4field into r16;
    hash.bhp256 r16 into r17 as field;
    get.or_use votes[r17] 0u64 into r18;
    add r0 5field into r19;
    hash.bhp256 r19 into r20 as field;
    get.or_use votes[r20] 0u64 into r21;
    add r0 6field into r22;
    hash.bhp256 r22 into r23 as field;
    get.or_use votes[r23] 0u64 into r24;
    add r0 7field into r25;
    hash.bhp256 r25 into r26 as field;
    get.or_use votes[r26] 0u64 into r27;
    gt r9 r6 into r28;
    ternary r28 1u8 0u8 into r29;
    ternary r28 r9 r6 into r30;
    gt r15 r12 into r31;
    ternary r31 3u8 2u8 into r32;
    ternary r31 r15 r12 into r33;
    gt r21 r18 into r34;
    ternary r34 5u8 4u8 into r35;
    ternary r34 r21 r18 into r36;
    gt r27 r24 into r37;
    ternary r37 7u8 6u8 into r38;
    ternary r37 r27 r24 into r39;
    gt r33 r30 into r40;
    ternary r40 r32 r29 into r41;
    ternary r40 r33 r30 into r42;
    gt r39 r36 into r43;
    ternary r43 r38 r35 into r44;
    ternary r43 r39 r36 into r45;
    gt r45 r42 into r46;
    ternary r46 r44 r41 into r47;
    assert.eq r1 r47;
    get disputes[r0] into r48;
    is.neq r47 r3.proposed_outcome into r49;
    branch.eq r49 false to end_then_1_4;
    get active_oracles[r3.proposer] into r50;
    sub r50 30000000u64 into r51;
    set r51 into active_oracles[r3.proposer];
    get.or_use active_oracles[r48.challenger] 0u64 into r52;
    add r52 r48.stake into r53;
    add r53 27000000u64 into r54;
    set r54 into active_oracles[r48.challenger];
    get.or_use active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n] 0u64 into r55;
    add r55 3000000u64 into r56;
    set r56 into active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n];
    branch.eq true true to end_otherwise_1_5;
    position end_then_1_4;
    div r48.stake 10u64 into r57;
    sub r48.stake r57 into r58;
    get active_oracles[r3.proposer] into r59;
    add r59 r58 into r60;
    set r60 into active_oracles[r3.proposer];
    get.or_use active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n] 0u64 into r61;
    add r61 r57 into r62;
    set r62 into active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n];
    position end_otherwise_1_5;
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    cast block.timestamp into r63 as u64;
    gte r63 r3.challenge_deadline into r64;
    assert.eq r64 true;
    assert.eq r1 r3.proposed_outcome;
    position end_otherwise_0_3;

function unstake_credits:
    input r0 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r0 into r1 r2;
    async unstake_credits self.caller r0 r2 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_oracle_v8.aleo/unstake_credits.future;

finalize unstake_credits:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_public_to_private.future;
    await r2;
    get active_oracles[r0] into r3;
    gte r3 r1 into r4;
    assert.eq r4 true;
    sub r3 r1 into r5;
    set r5 into active_oracles[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
