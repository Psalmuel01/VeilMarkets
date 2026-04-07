import veilmarkets_factory_v9.aleo;
import veilmarkets_v9.aleo;
import credits.aleo;
program veilmarkets_oracle_v9.aleo;

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

mapping vote_weight_totals:
    key as field.public;
    value as u64.public;

mapping disputes:
    key as field.public;
    value as Dispute.public;

mapping oracle_u64:
    key as u8.public;
    value as u64.public;

mapping oracle_u8:
    key as u8.public;
    value as u8.public;

function register_oracle:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.public;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v9.aleo r1 into r2 r3;
    cast self.signer into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast self.signer r1 100u64 r5 into r6 as OracleCredential.record;
    async register_oracle self.caller r1 r3 into r7;
    output r2 as credits.aleo/credits.record;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v9.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_private_to_public.future;
    await r2;
    get.or_use oracle_u64[0u8] 30000000u64 into r3;
    gte r1 r3 into r4;
    assert.eq r4 true;
    get.or_use active_oracles[r0] 0u64 into r5;
    add r5 r1 into r6;
    set r6 into active_oracles[r0];

function propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 31u8 into r2;
    assert.eq r2 true;
    async propose_resolution r0 r1 self.caller into r3;
    output r3 as veilmarkets_oracle_v9.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get.or_use oracle_u64[0u8] 30000000u64 into r3;
    get active_oracles[r2] into r4;
    gte r4 r3 into r5;
    assert.eq r5 true;
    contains proposals[r0] into r6;
    not r6 into r7;
    assert.eq r7 true;
    get.or_use oracle_u64[1u8] 10800u64 into r8;
    cast block.timestamp into r9 as u64;
    add r9 r8 into r10;
    cast r0 r1 r10 false r2 into r11 as ResolutionProposal;
    set r11 into proposals[r0];

function dispute_resolution:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v9.aleo r2 into r3 r4;
    async dispute_resolution r1 self.caller r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_oracle_v9.aleo/dispute_resolution.future;

finalize dispute_resolution:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_private_to_public.future;
    await r3;
    get.or_use oracle_u64[0u8] 30000000u64 into r4;
    gte r2 r4 into r5;
    assert.eq r5 true;
    get proposals[r0] into r6;
    not r6.is_disputed into r7;
    assert.eq r7 true;
    cast block.timestamp into r8 as u64;
    lt r8 r6.challenge_deadline into r9;
    assert.eq r9 true;
    cast r6.market_id r6.proposed_outcome r6.challenge_deadline true r6.proposer into r10 as ResolutionProposal;
    set r10 into proposals[r0];
    cast r1 r2 r6.proposed_outcome into r11 as Dispute;
    set r11 into disputes[r0];

function vote_on_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    lte r2 31u8 into r3;
    assert.eq r3 true;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async vote_on_resolution r1 r2 r0.staked_amount into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v9.aleo/vote_on_resolution.future;

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
    get.or_use vote_weight_totals[r0] 0u64 into r9;
    add r9 r2 into r10;
    set r10 into vote_weight_totals[r0];

function submit_quorum_vote:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    lte r2 31u8 into r3;
    assert.eq r3 true;
    cast r0.nonce into r4 as field;
    hash.bhp256 r4 into r5 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r5 into r6 as OracleCredential.record;
    async submit_quorum_vote r1 r2 r0.staked_amount into r7;
    output r6 as OracleCredential.record;
    output r7 as veilmarkets_oracle_v9.aleo/submit_quorum_vote.future;

finalize submit_quorum_vote:
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
    get.or_use vote_weight_totals[r0] 0u64 into r9;
    add r9 r2 into r10;
    set r10 into vote_weight_totals[r0];

function resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 31u8 into r2;
    assert.eq r2 true;
    call veilmarkets_v9.aleo/resolve_market r0 r1 veilmarkets_oracle_v9.aleo into r3;
    async resolve_on_core r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_v9.aleo/resolve_on_core.future;

finalize resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_v9.aleo/resolve_market.future;
    get proposals[r0] into r3;
    branch.eq r3.is_disputed false to end_then_0_10;
    cast r1 into r4 as field;
    add r0 r4 into r5;
    hash.bhp256 r5 into r6 as field;
    get.or_use votes[r6] 0u64 into r7;
    get.or_use vote_weight_totals[r0] 0u64 into r8;
    get.or_use oracle_u8[0u8] 3u8 into r9;
    get.or_use oracle_u64[0u8] 30000000u64 into r10;
    cast r9 into r11 as u64;
    mul r10 r11 into r12;
    gte r8 r12 into r13;
    assert.eq r13 true;
    gt r7 0u64 into r14;
    assert.eq r14 true;
    branch.eq true true to end_otherwise_0_11;
    position end_then_0_10;
    cast block.timestamp into r15 as u64;
    gte r15 r3.challenge_deadline into r16;
    assert.eq r16 true;
    assert.eq r1 r3.proposed_outcome;
    position end_otherwise_0_11;
    await r2;
    branch.eq r3.is_disputed false to end_then_0_12;
    get disputes[r0] into r17;
    get.or_use oracle_u64[0u8] 30000000u64 into r18;
    is.neq r1 r3.proposed_outcome into r19;
    branch.eq r19 false to end_then_1_14;
    get active_oracles[r3.proposer] into r20;
    gte r20 r18 into r21;
    ternary r21 r18 r20 into r22;
    sub r20 r22 into r23;
    set r23 into active_oracles[r3.proposer];
    div r22 10u64 into r24;
    sub r22 r24 into r25;
    get.or_use active_oracles[r17.challenger] 0u64 into r26;
    add r26 r17.stake into r27;
    add r27 r25 into r28;
    set r28 into active_oracles[r17.challenger];
    get.or_use active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n] 0u64 into r29;
    add r29 r24 into r30;
    set r30 into active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n];
    branch.eq true true to end_otherwise_1_15;
    position end_then_1_14;
    div r17.stake 10u64 into r31;
    sub r17.stake r31 into r32;
    get active_oracles[r3.proposer] into r33;
    add r33 r32 into r34;
    set r34 into active_oracles[r3.proposer];
    get.or_use active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n] 0u64 into r35;
    add r35 r31 into r36;
    set r36 into active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n];
    position end_otherwise_1_15;
    branch.eq true true to end_otherwise_0_13;
    position end_then_0_12;
    position end_otherwise_0_13;

function execute_quorum_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    lte r1 31u8 into r2;
    assert.eq r2 true;
    call veilmarkets_v9.aleo/resolve_market r0 r1 veilmarkets_oracle_v9.aleo into r3;
    async execute_quorum_resolution r0 r1 r3 into r4;
    output r4 as veilmarkets_oracle_v9.aleo/execute_quorum_resolution.future;

finalize execute_quorum_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_v9.aleo/resolve_market.future;
    get proposals[r0] into r3;
    branch.eq r3.is_disputed false to end_then_0_16;
    cast r1 into r4 as field;
    add r0 r4 into r5;
    hash.bhp256 r5 into r6 as field;
    get.or_use votes[r6] 0u64 into r7;
    get.or_use vote_weight_totals[r0] 0u64 into r8;
    get.or_use oracle_u8[0u8] 3u8 into r9;
    get.or_use oracle_u64[0u8] 30000000u64 into r10;
    cast r9 into r11 as u64;
    mul r10 r11 into r12;
    gte r8 r12 into r13;
    assert.eq r13 true;
    gt r7 0u64 into r14;
    assert.eq r14 true;
    branch.eq true true to end_otherwise_0_17;
    position end_then_0_16;
    cast block.timestamp into r15 as u64;
    gte r15 r3.challenge_deadline into r16;
    assert.eq r16 true;
    assert.eq r1 r3.proposed_outcome;
    position end_otherwise_0_17;
    await r2;
    branch.eq r3.is_disputed false to end_then_0_18;
    get disputes[r0] into r17;
    get.or_use oracle_u64[0u8] 30000000u64 into r18;
    is.neq r1 r3.proposed_outcome into r19;
    branch.eq r19 false to end_then_1_20;
    get active_oracles[r3.proposer] into r20;
    gte r20 r18 into r21;
    ternary r21 r18 r20 into r22;
    sub r20 r22 into r23;
    set r23 into active_oracles[r3.proposer];
    div r22 10u64 into r24;
    sub r22 r24 into r25;
    get.or_use active_oracles[r17.challenger] 0u64 into r26;
    add r26 r17.stake into r27;
    add r27 r25 into r28;
    set r28 into active_oracles[r17.challenger];
    get.or_use active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n] 0u64 into r29;
    add r29 r24 into r30;
    set r30 into active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n];
    branch.eq true true to end_otherwise_1_21;
    position end_then_1_20;
    div r17.stake 10u64 into r31;
    sub r17.stake r31 into r32;
    get active_oracles[r3.proposer] into r33;
    add r33 r32 into r34;
    set r34 into active_oracles[r3.proposer];
    get.or_use active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n] 0u64 into r35;
    add r35 r31 into r36;
    set r36 into active_oracles[aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n];
    position end_otherwise_1_21;
    branch.eq true true to end_otherwise_0_19;
    position end_then_0_18;
    position end_otherwise_0_19;

function unstake_credits:
    input r0 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r0 into r1 r2;
    async unstake_credits self.caller r0 r2 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_oracle_v9.aleo/unstake_credits.future;

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

function set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    call veilmarkets_factory_v9.aleo/verify_is_registered 4u8 self.caller into r2;
    async set_protocol_u64 r0 r1 r2 into r3;
    output r3 as veilmarkets_oracle_v9.aleo/set_protocol_u64.future;

finalize set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    input r2 as veilmarkets_factory_v9.aleo/verify_is_registered.future;
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
    input r0 as u8.public;
    input r1 as u8.public;
    call veilmarkets_factory_v9.aleo/verify_is_registered 4u8 self.caller into r2;
    async set_protocol_u8 r0 r1 r2 into r3;
    output r3 as veilmarkets_oracle_v9.aleo/set_protocol_u8.future;

finalize set_protocol_u8:
    input r0 as u8.public;
    input r1 as u8.public;
    input r2 as veilmarkets_factory_v9.aleo/verify_is_registered.future;
    await r2;
    is.eq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_26;
    gte r1 3u8 into r4;
    assert.eq r4 true;
    lte r1 32u8 into r5;
    assert.eq r5 true;
    branch.eq true true to end_otherwise_0_27;
    position end_then_0_26;
    position end_otherwise_0_27;
    set r1 into oracle_u8[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
