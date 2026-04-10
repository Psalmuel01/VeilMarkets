import veilmarkets_factory_v10.aleo;
import veilmarkets_core_v10.aleo;
program veilmarkets_governance_v10.aleo;

struct Proposal:
    proposer as address;
    target as u8;
    param_key as u8;
    param_value as u64;
    as_u8 as boolean;
    end_time as u64;
    execute_after as u64;
    yes_votes as u64;
    no_votes as u64;
    executed as boolean;

mapping proposals:
    key as field.public;
    value as Proposal.public;

mapping vote_receipts:
    key as field.public;
    value as boolean.public;

mapping voter_weights:
    key as address.public;
    value as u64.public;

function create_proposal:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as boolean.public;
    input r5 as u64.public;
    async create_proposal r0 r1 r2 r3 r4 r5 self.caller into r6;
    output r6 as veilmarkets_governance_v10.aleo/create_proposal.future;

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
    branch.eq r4 false to end_then_0_36;
    lte r3 255u64 into r11;
    assert.eq r11 true;
    branch.eq true true to end_otherwise_0_37;
    position end_then_0_36;
    position end_otherwise_0_37;
    contains proposals[r0] into r12;
    not r12 into r13;
    assert.eq r13 true;
    cast block.timestamp into r14 as u64;
    add r14 r5 into r15;
    add r15 86400u64 into r16;
    cast r6 r1 r2 r3 r4 r15 r16 0u64 0u64 false into r17 as Proposal;
    set r17 into proposals[r0];

function admin_set_voter_weight:
    input r0 as address.public;
    input r1 as u64.public;
    async admin_set_voter_weight r0 r1 self.caller into r2;
    output r2 as veilmarkets_governance_v10.aleo/admin_set_voter_weight.future;

finalize admin_set_voter_weight:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as address.public;
    assert.eq r2 aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
    set r1 into voter_weights[r0];

function cast_vote:
    input r0 as field.public;
    input r1 as boolean.public;
    async cast_vote r0 r1 self.caller into r2;
    output r2 as veilmarkets_governance_v10.aleo/cast_vote.future;

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
    get.or_use voter_weights[r2] 0u64 into r7;
    gt r7 0u64 into r8;
    assert.eq r8 true;
    cast r2 into r9 as field;
    add r0 r9 into r10;
    hash.bhp256 r10 into r11 as field;
    get.or_use vote_receipts[r11] false into r12;
    not r12 into r13;
    assert.eq r13 true;
    set true into vote_receipts[r11];
    add r3.yes_votes r7 into r14;
    ternary r1 r14 r3.yes_votes into r15;
    add r3.no_votes r7 into r16;
    ternary r1 r3.no_votes r16 into r17;
    cast r3.proposer r3.target r3.param_key r3.param_value r3.as_u8 r3.end_time r3.execute_after r15 r17 r3.executed into r18 as Proposal;
    set r18 into proposals[r0];

function execute_core_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    call veilmarkets_core_v10.aleo/set_protocol_u64 r1 r2 into r3;
    async execute_core_u64 r0 r1 r2 r3 into r4;
    output r4 as veilmarkets_governance_v10.aleo/execute_core_u64.future;

finalize execute_core_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as veilmarkets_core_v10.aleo/set_protocol_u64.future;
    get proposals[r0] into r4;
    not r4.executed into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    gte r6 r4.end_time into r7;
    assert.eq r7 true;
    cast block.timestamp into r8 as u64;
    gte r8 r4.execute_after into r9;
    assert.eq r9 true;
    gt r4.yes_votes r4.no_votes into r10;
    assert.eq r10 true;
    assert.eq r4.target 0u8;
    assert.eq r4.param_key r1;
    assert.eq r4.param_value r2;
    assert.eq r4.as_u8 false;
    await r3;
    cast r4.proposer r4.target r4.param_key r4.param_value r4.as_u8 r4.end_time r4.execute_after r4.yes_votes r4.no_votes true into r11 as Proposal;
    set r11 into proposals[r0];

function execute_core_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    call veilmarkets_core_v10.aleo/set_protocol_u8 r1 r2 into r3;
    async execute_core_u8 r0 r1 r2 r3 into r4;
    output r4 as veilmarkets_governance_v10.aleo/execute_core_u8.future;

finalize execute_core_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as veilmarkets_core_v10.aleo/set_protocol_u8.future;
    cast r2 into r4 as u64;
    get proposals[r0] into r5;
    not r5.executed into r6;
    assert.eq r6 true;
    cast block.timestamp into r7 as u64;
    gte r7 r5.end_time into r8;
    assert.eq r8 true;
    cast block.timestamp into r9 as u64;
    gte r9 r5.execute_after into r10;
    assert.eq r10 true;
    gt r5.yes_votes r5.no_votes into r11;
    assert.eq r11 true;
    assert.eq r5.target 0u8;
    assert.eq r5.param_key r1;
    assert.eq r5.param_value r4;
    assert.eq r5.as_u8 true;
    await r3;
    cast r5.proposer r5.target r5.param_key r5.param_value r5.as_u8 r5.end_time r5.execute_after r5.yes_votes r5.no_votes true into r12 as Proposal;
    set r12 into proposals[r0];

function consume_oracle_u64:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    call veilmarkets_factory_v10.aleo/verify_is_registered 2u8 self.caller into r3;
    async consume_oracle_u64 r3 r0 r1 r2 into r4;
    output r4 as veilmarkets_governance_v10.aleo/consume_oracle_u64.future;

finalize consume_oracle_u64:
    input r0 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    await r0;
    get proposals[r1] into r4;
    not r4.executed into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    gte r6 r4.end_time into r7;
    assert.eq r7 true;
    cast block.timestamp into r8 as u64;
    gte r8 r4.execute_after into r9;
    assert.eq r9 true;
    gt r4.yes_votes r4.no_votes into r10;
    assert.eq r10 true;
    assert.eq r4.target 1u8;
    assert.eq r4.param_key r2;
    assert.eq r4.param_value r3;
    assert.eq r4.as_u8 false;
    cast r4.proposer r4.target r4.param_key r4.param_value r4.as_u8 r4.end_time r4.execute_after r4.yes_votes r4.no_votes true into r11 as Proposal;
    set r11 into proposals[r1];

function consume_oracle_u8:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    call veilmarkets_factory_v10.aleo/verify_is_registered 2u8 self.caller into r3;
    async consume_oracle_u8 r3 r0 r1 r2 into r4;
    output r4 as veilmarkets_governance_v10.aleo/consume_oracle_u8.future;

finalize consume_oracle_u8:
    input r0 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u8.public;
    await r0;
    cast r3 into r4 as u64;
    get proposals[r1] into r5;
    not r5.executed into r6;
    assert.eq r6 true;
    cast block.timestamp into r7 as u64;
    gte r7 r5.end_time into r8;
    assert.eq r8 true;
    cast block.timestamp into r9 as u64;
    gte r9 r5.execute_after into r10;
    assert.eq r10 true;
    gt r5.yes_votes r5.no_votes into r11;
    assert.eq r11 true;
    assert.eq r5.target 1u8;
    assert.eq r5.param_key r2;
    assert.eq r5.param_value r4;
    assert.eq r5.as_u8 true;
    cast r5.proposer r5.target r5.param_key r5.param_value r5.as_u8 r5.end_time r5.execute_after r5.yes_votes r5.no_votes true into r12 as Proposal;
    set r12 into proposals[r1];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
