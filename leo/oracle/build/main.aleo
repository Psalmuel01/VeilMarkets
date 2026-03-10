import veilmarkets_factory_v3.aleo;
import veilmarkets_v3.aleo;
import credits.aleo;
program veilmarkets_oracle_v3.aleo;

record OracleCredential:
    owner as address.private;
    oracle_id as field.private;
    reputation_score as u64.private;
    staked_amount as u64.private;
    active as boolean.private;

record Dispute:
    owner as address.private;
    market_id as field.private;
    disputed_outcome as u8.private;
    evidence_hash as field.private;
    stake_amount as u64.private;
    filed_at as u64.private;
    nonce as group.private;

struct ResolutionProposal:
    market_id as field;
    proposed_outcome as u8;
    proposer as address;
    timestamp as u64;
    votes_for as u64;
    votes_against as u64;
    total_stake_for as u64;
    resolved as boolean;

struct DisputeInfo:
    holder as address;
    market_id as field;
    disputed_outcome as u8;
    evidence_hash as field;
    stake_amount as u64;
    filed_at as u64;

mapping oracles:
    key as address.public;
    value as boolean.public;

mapping oracle_stakes:
    key as address.public;
    value as u64.public;

mapping proposals:
    key as field.public;
    value as ResolutionProposal.public;

mapping dispute_deadlines:
    key as field.public;
    value as u64.public;

mapping disputes:
    key as field.public;
    value as DisputeInfo.public;

mapping resolution_outcomes:
    key as field.public;
    value as u8.public;

function register_oracle:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.private;
    gte r1 100000000000u64 into r2;
    assert.eq r2 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v3.aleo r1 into r3 r4;
    hash.bhp256 self.caller into r5 as field;
    cast self.caller r5 100u64 r1 true into r6 as OracleCredential.record;
    async register_oracle self.caller r1 r4 into r7;
    output r6 as OracleCredential.record;
    output r3 as credits.aleo/credits.record;
    output r7 as veilmarkets_oracle_v3.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_private_to_public.future;
    await r2;
    set true into oracles[r0];
    set r1 into oracle_stakes[r0];

function propose_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as field.public;
    assert.eq r0.active true;
    gte r0.staked_amount 100000000000u64 into r4;
    assert.eq r4 true;
    is.eq r2 0u8 into r5;
    is.eq r2 1u8 into r6;
    or r5 r6 into r7;
    assert.eq r7 true;
    async propose_resolution r1 r2 r0.owner r3 into r8;
    cast r0.owner r0.oracle_id r0.reputation_score r0.staked_amount r0.active into r9 as OracleCredential.record;
    output r9 as OracleCredential.record;
    output r8 as veilmarkets_oracle_v3.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    input r3 as field.public;
    get.or_use oracles[r2] false into r4;
    assert.eq r4 true;
    cast block.height into r5 as u64;
    get oracle_stakes[r2] into r6;
    cast r0 r1 r2 r5 1u64 0u64 r6 false into r7 as ResolutionProposal;
    set r7 into proposals[r0];
    cast block.height into r8 as u64;
    add r8 14400u64 into r9;
    set r9 into dispute_deadlines[r0];

function vote_on_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as boolean.public;
    assert.eq r0.active true;
    async vote_on_resolution r1 r2 r0.owner r0.staked_amount into r3;
    cast r0.owner r0.oracle_id r0.reputation_score r0.staked_amount r0.active into r4 as OracleCredential.record;
    output r4 as OracleCredential.record;
    output r3 as veilmarkets_oracle_v3.aleo/vote_on_resolution.future;

finalize vote_on_resolution:
    input r0 as field.public;
    input r1 as boolean.public;
    input r2 as address.public;
    input r3 as u64.public;
    get.or_use oracles[r2] false into r4;
    assert.eq r4 true;
    get proposals[r0] into r5;
    not r5.resolved into r6;
    assert.eq r6 true;
    get dispute_deadlines[r0] into r7;
    cast block.height into r8 as u64;
    lt r8 r7 into r9;
    assert.eq r9 true;
    add r5.votes_for 1u64 into r10;
    ternary r1 r10 r5.votes_for into r11;
    add r5.votes_against 1u64 into r12;
    ternary r1 r5.votes_against r12 into r13;
    add r5.total_stake_for r3 into r14;
    ternary r1 r14 r5.total_stake_for into r15;
    cast r5.market_id r5.proposed_outcome r5.proposer r5.timestamp r11 r13 r15 r5.resolved into r16 as ResolutionProposal;
    set r16 into proposals[r0];

function finalize_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    call veilmarkets_v3.aleo/resolve_market r0 r1 self.caller into r2;
    async finalize_resolution r0 r1 r2 into r3;
    output r3 as veilmarkets_oracle_v3.aleo/finalize_resolution.future;

finalize finalize_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_v3.aleo/resolve_market.future;
    get proposals[r0] into r3;
    not r3.resolved into r4;
    assert.eq r4 true;
    assert.eq r3.proposed_outcome r1;
    get dispute_deadlines[r0] into r5;
    cast block.height into r6 as u64;
    gte r6 r5 into r7;
    assert.eq r7 true;
    contains disputes[r0] into r8;
    not r8 into r9;
    assert.eq r9 true;
    add r3.votes_for r3.votes_against into r10;
    gte r10 3u64 into r11;
    assert.eq r11 true;
    mul r10 2u64 into r12;
    div r12 3u64 into r13;
    gte r3.votes_for r13 into r14;
    assert.eq r14 true;
    cast r3.market_id r3.proposed_outcome r3.proposer r3.timestamp r3.votes_for r3.votes_against r3.total_stake_for true into r15 as ResolutionProposal;
    set r15 into proposals[r0];
    set r1 into resolution_outcomes[r0];
    await r2;

function file_dispute:
    input r0 as credits.aleo/credits.record;
    input r1 as u64.private;
    input r2 as field.public;
    input r3 as u8.public;
    input r4 as field.public;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v3.aleo r1 into r5 r6;
    hash.bhp256 r4 into r7 as group;
    cast self.caller r2 r3 r4 r1 0u64 r7 into r8 as Dispute.record;
    async file_dispute r2 self.caller r3 r4 r1 r6 into r9;
    output r5 as credits.aleo/credits.record;
    output r8 as Dispute.record;
    output r9 as veilmarkets_oracle_v3.aleo/file_dispute.future;

finalize file_dispute:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as u64.public;
    input r5 as credits.aleo/transfer_private_to_public.future;
    await r5;
    get dispute_deadlines[r0] into r6;
    cast block.height into r7 as u64;
    lt r7 r6 into r8;
    assert.eq r8 true;
    cast block.height into r9 as u64;
    cast r1 r0 r2 r3 r4 r9 into r10 as DisputeInfo;
    set r10 into disputes[r0];
    cast block.height into r11 as u64;
    add r11 14400u64 into r12;
    set r12 into dispute_deadlines[r0];

function resolve_dispute:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as boolean.public;
    input r3 as u8.public;
    assert.eq r0.active true;
    gte r0.reputation_score 500u64 into r4;
    assert.eq r4 true;
    ternary r2 50u64 0u64 into r5;
    add r0.reputation_score r5 into r6;
    cast r0.owner r0.oracle_id r6 r0.staked_amount r0.active into r7 as OracleCredential.record;
    async resolve_dispute r1 r2 r3 r0.owner into r8;
    output r7 as OracleCredential.record;
    output r8 as veilmarkets_oracle_v3.aleo/resolve_dispute.future;

finalize resolve_dispute:
    input r0 as field.public;
    input r1 as boolean.public;
    input r2 as u8.public;
    input r3 as address.public;
    get disputes[r0] into r4;
    remove disputes[r0];
    branch.eq r1 false to end_then_0_0;
    get proposals[r0] into r5;
    cast block.height into r6 as u64;
    get oracle_stakes[r3] into r7;
    cast r0 r2 r3 r6 1u64 0u64 r7 false into r8 as ResolutionProposal;
    set r8 into proposals[r0];
    cast block.height into r9 as u64;
    add r9 14400u64 into r10;
    set r10 into dispute_deadlines[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function unregister_oracle:
    input r0 as OracleCredential.record;
    assert.eq r0.active true;
    call credits.aleo/transfer_public_to_private self.caller r0.staked_amount into r1 r2;
    async unregister_oracle r0.owner r2 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_oracle_v3.aleo/unregister_oracle.future;

finalize unregister_oracle:
    input r0 as address.public;
    input r1 as credits.aleo/transfer_public_to_private.future;
    await r1;
    set false into oracles[r0];
    set 0u64 into oracle_stakes[r0];

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
