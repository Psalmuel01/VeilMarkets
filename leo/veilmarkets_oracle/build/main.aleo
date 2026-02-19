program veilmarkets_oracle.aleo;

record OracleCredential:
    owner as address.private;
    oracle_id as field.private;
    reputation_score as u64.private;
    active as boolean.private;

record Dispute:
    owner as address.private;
    market_id as field.private;
    disputed_outcome as u8.private;
    evidence_hash as field.private;
    stake_amount as u64.private;

record Credits:
    owner as address.private;
    amount as u64.private;

struct ResolutionProposal:
    market_id as field;
    proposed_outcome as u8;
    proposer as address;
    timestamp as u64;
    votes_for as u64;
    votes_against as u64;

mapping oracles:
    key as address.public;
    value as boolean.public;

mapping proposals:
    key as field.public;
    value as ResolutionProposal.public;

mapping dispute_deadlines:
    key as field.public;
    value as u64.public;

mapping oracle_reputation:
    key as address.public;
    value as u64.public;

function register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    hash.bhp256 r0 into r2 as field;
    cast r0 r2 r1 true into r3 as OracleCredential.record;
    async register_oracle r0 r1 into r4;
    output r3 as OracleCredential.record;
    output r4 as veilmarkets_oracle.aleo/register_oracle.future;

finalize register_oracle:
    input r0 as address.public;
    input r1 as u64.public;
    set true into oracles[r0];
    set r1 into oracle_reputation[r0];

function revoke_oracle:
    input r0 as OracleCredential.record;
    input r1 as address.public;
    assert.eq r0.owner r1;
    async revoke_oracle r1 into r2;
    output r2 as veilmarkets_oracle.aleo/revoke_oracle.future;

finalize revoke_oracle:
    input r0 as address.public;
    set false into oracles[r0];

function propose_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as field.public;
    assert.eq r0.active true;
    async propose_resolution r1 r2 r0.owner r3 into r4;
    cast r0.owner r0.oracle_id r0.reputation_score r0.active into r5 as OracleCredential.record;
    output r5 as OracleCredential.record;
    output r4 as veilmarkets_oracle.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    input r3 as field.public;
    get oracles[r2] into r4;
    assert.eq r4 true;
    cast block.height into r5 as u64;
    cast r0 r1 r2 r5 1u64 0u64 into r6 as ResolutionProposal;
    set r6 into proposals[r0];
    cast block.height into r7 as u64;
    add r7 14400u64 into r8;
    set r8 into dispute_deadlines[r0];

function vote_on_resolution:
    input r0 as OracleCredential.record;
    input r1 as field.public;
    input r2 as boolean.public;
    assert.eq r0.active true;
    async vote_on_resolution r1 r2 r0.owner into r3;
    cast r0.owner r0.oracle_id r0.reputation_score r0.active into r4 as OracleCredential.record;
    output r4 as OracleCredential.record;
    output r3 as veilmarkets_oracle.aleo/vote_on_resolution.future;

finalize vote_on_resolution:
    input r0 as field.public;
    input r1 as boolean.public;
    input r2 as address.public;
    get oracles[r2] into r3;
    assert.eq r3 true;
    get proposals[r0] into r4;
    get dispute_deadlines[r0] into r5;
    cast block.height into r6 as u64;
    lt r6 r5 into r7;
    assert.eq r7 true;
    add r4.votes_for 1u64 into r8;
    ternary r1 r8 r4.votes_for into r9;
    add r4.votes_against 1u64 into r10;
    ternary r1 r4.votes_against r10 into r11;
    cast r4.market_id r4.proposed_outcome r4.proposer r4.timestamp r9 r11 into r12 as ResolutionProposal;
    set r12 into proposals[r0];

function finalize_resolution:
    input r0 as field.public;
    async finalize_resolution r0 into r1;
    output r1 as veilmarkets_oracle.aleo/finalize_resolution.future;

finalize finalize_resolution:
    input r0 as field.public;
    get proposals[r0] into r1;
    get dispute_deadlines[r0] into r2;
    cast block.height into r3 as u64;
    gte r3 r2 into r4;
    assert.eq r4 true;
    add r1.votes_for r1.votes_against into r5;
    mul r5 2u64 into r6;
    div r6 3u64 into r7;
    gte r1.votes_for r7 into r8;
    assert.eq r8 true;

function file_dispute:
    input r0 as Credits.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as u64.public;
    gte r0.amount r4 into r5;
    assert.eq r5 true;
    cast self.caller r1 r2 r3 r4 into r6 as Dispute.record;
    sub r0.amount r4 into r7;
    cast self.caller r7 into r8 as Credits.record;
    async file_dispute r1 into r9;
    output r8 as Credits.record;
    output r6 as Dispute.record;
    output r9 as veilmarkets_oracle.aleo/file_dispute.future;

finalize file_dispute:
    input r0 as field.public;
    get dispute_deadlines[r0] into r1;
    cast block.height into r2 as u64;
    lt r2 r1 into r3;
    assert.eq r3 true;
    cast block.height into r4 as u64;
    add r4 28800u64 into r5;
    set r5 into dispute_deadlines[r0];

function resolve_dispute:
    input r0 as Dispute.record;
    input r1 as field.public;
    input r2 as boolean.public;
    assert.eq r0.market_id r1;
    mul r0.stake_amount 2u64 into r3;
    ternary r2 r3 0u64 into r4;
    cast r0.owner r4 into r5 as Credits.record;
    async resolve_dispute r1 r2 into r6;
    output r5 as Credits.record;
    output r6 as veilmarkets_oracle.aleo/resolve_dispute.future;

finalize resolve_dispute:
    input r0 as field.public;
    input r1 as boolean.public;
    branch.eq r1 false to end_then_0_0;
    get proposals[r0] into r2;
    cast r2.market_id r2.proposed_outcome r2.proposer r2.timestamp r2.votes_for 999u64 into r3 as ResolutionProposal;
    set r3 into proposals[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
