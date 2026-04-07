import veilmarkets_factory_v9.aleo;
import veilmarkets_core_v9.aleo;
program veilmarkets_governance_v9.aleo;

struct Proposal:
    proposer as address;
    target as u8;
    param_key as u8;
    param_value as u64;
    as_u8 as boolean;
    end_time as u64;
    yes_votes as u64;
    no_votes as u64;
    executed as boolean;

mapping proposals:
    key as field.public;
    value as Proposal.public;

mapping vote_receipts:
    key as field.public;
    value as boolean.public;

function create_proposal:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as boolean.public;
    input r5 as u64.public;
    async create_proposal r0 r1 r2 r3 r4 r5 self.caller into r6;
    output r6 as veilmarkets_governance_v9.aleo/create_proposal.future;

finalize create_proposal:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as boolean.public;
    input r5 as u64.public;
    input r6 as address.public;
    is.eq r1 0u8 into r7;
    is.eq r1 1u8 into r8;
    or r7 r8 into r9;
    assert.eq r9 true;
    gte r5 60u64 into r10;
    assert.eq r10 true;
    branch.eq r4 false to end_then_0_10;
    lte r3 255u64 into r11;
    assert.eq r11 true;
    branch.eq true true to end_otherwise_0_11;
    position end_then_0_10;
    position end_otherwise_0_11;
    contains proposals[r0] into r12;
    not r12 into r13;
    assert.eq r13 true;
    cast block.timestamp into r14 as u64;
    add r14 r5 into r15;
    cast r6 r1 r2 r3 r4 r15 0u64 0u64 false into r16 as Proposal;
    set r16 into proposals[r0];

function cast_vote:
    input r0 as field.public;
    input r1 as boolean.public;
    async cast_vote r0 r1 self.caller into r2;
    output r2 as veilmarkets_governance_v9.aleo/cast_vote.future;

finalize cast_vote:
    input r0 as field.public;
    input r1 as boolean.public;
    input r2 as address.public;
    get proposals[r0] into r3;
    not r3.executed into r4;
    assert.eq r4 true;
    cast block.timestamp into r5 as u64;
    lt r5 r3.end_time into r6;
    assert.eq r6 true;
    cast r2 into r7 as field;
    add r0 r7 into r8;
    hash.bhp256 r8 into r9 as field;
    get.or_use vote_receipts[r9] false into r10;
    not r10 into r11;
    assert.eq r11 true;
    set true into vote_receipts[r9];
    add r3.yes_votes 1u64 into r12;
    ternary r1 r12 r3.yes_votes into r13;
    add r3.no_votes 1u64 into r14;
    ternary r1 r3.no_votes r14 into r15;
    cast r3.proposer r3.target r3.param_key r3.param_value r3.as_u8 r3.end_time r13 r15 r3.executed into r16 as Proposal;
    set r16 into proposals[r0];

function execute_core_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    call veilmarkets_core_v9.aleo/set_protocol_u64 r1 r2 into r3;
    async execute_core_u64 r0 r1 r2 r3 into r4;
    output r4 as veilmarkets_governance_v9.aleo/execute_core_u64.future;

finalize execute_core_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as veilmarkets_core_v9.aleo/set_protocol_u64.future;
    get proposals[r0] into r4;
    not r4.executed into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    gte r6 r4.end_time into r7;
    assert.eq r7 true;
    gt r4.yes_votes r4.no_votes into r8;
    assert.eq r8 true;
    assert.eq r4.target 0u8;
    assert.eq r4.param_key r1;
    assert.eq r4.param_value r2;
    assert.eq r4.as_u8 false;
    await r3;
    cast r4.proposer r4.target r4.param_key r4.param_value r4.as_u8 r4.end_time r4.yes_votes r4.no_votes true into r9 as Proposal;
    set r9 into proposals[r0];

function execute_core_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    call veilmarkets_core_v9.aleo/set_protocol_u8 r1 r2 into r3;
    async execute_core_u8 r0 r1 r2 r3 into r4;
    output r4 as veilmarkets_governance_v9.aleo/execute_core_u8.future;

finalize execute_core_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as veilmarkets_core_v9.aleo/set_protocol_u8.future;
    cast r2 into r4 as u64;
    get proposals[r0] into r5;
    not r5.executed into r6;
    assert.eq r6 true;
    cast block.timestamp into r7 as u64;
    gte r7 r5.end_time into r8;
    assert.eq r8 true;
    gt r5.yes_votes r5.no_votes into r9;
    assert.eq r9 true;
    assert.eq r5.target 0u8;
    assert.eq r5.param_key r1;
    assert.eq r5.param_value r4;
    assert.eq r5.as_u8 true;
    await r3;
    cast r5.proposer r5.target r5.param_key r5.param_value r5.as_u8 r5.end_time r5.yes_votes r5.no_votes true into r10 as Proposal;
    set r10 into proposals[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
