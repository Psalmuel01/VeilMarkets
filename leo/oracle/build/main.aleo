import veilmarkets_factory_v3.aleo;
import veilmarkets_v3.aleo;
import credits.aleo;
program veilmarkets_oracle_v3.aleo;

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
    gte r1 100000000u64 into r2;
    assert.eq r2 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v3.aleo r1 into r3 r4;
    cast self.caller into r5 as field;
    hash.bhp256 r5 into r6 as group;
    cast self.caller r1 100u64 r6 into r7 as OracleCredential.record;
    async register_oracle self.caller r1 r4 into r8;
    output r3 as credits.aleo/credits.record;
    output r7 as OracleCredential.record;
    output r8 as veilmarkets_oracle_v3.aleo/register_oracle.future;

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
    output r2 as veilmarkets_oracle_v3.aleo/propose_resolution.future;

finalize propose_resolution:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get active_oracles[r2] into r3;
    gte r3 100000000u64 into r4;
    assert.eq r4 true;
    contains proposals[r0] into r5;
    not r5 into r6;
    assert.eq r6 true;
    cast block.height into r7 as u64;
    add r7 14400u64 into r8;
    cast r0 r1 r8 false r2 into r9 as ResolutionProposal;
    set r9 into proposals[r0];

function dispute_resolution:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    gte r2 100000000u64 into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_oracle_v3.aleo r2 into r4 r5;
    async dispute_resolution r1 self.caller r2 r5 into r6;
    output r4 as credits.aleo/credits.record;
    output r6 as veilmarkets_oracle_v3.aleo/dispute_resolution.future;

finalize dispute_resolution:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_private_to_public.future;
    await r3;
    get proposals[r0] into r4;
    not r4.is_disputed into r5;
    assert.eq r5 true;
    cast block.height into r6 as u64;
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
    is.eq r2 0u8 into r3;
    is.eq r2 1u8 into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    cast r0.nonce into r6 as field;
    hash.bhp256 r6 into r7 as group;
    cast r0.owner r0.staked_amount r0.reputation_score r7 into r8 as OracleCredential.record;
    async vote_on_resolution r1 r2 r0.staked_amount into r9;
    output r8 as OracleCredential.record;
    output r9 as veilmarkets_oracle_v3.aleo/vote_on_resolution.future;

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
    call veilmarkets_v3.aleo/resolve_market r0 r1 veilmarkets_oracle_v3.aleo into r2;
    async resolve_on_core r0 r1 r2 into r3;
    output r3 as veilmarkets_oracle_v3.aleo/resolve_on_core.future;

finalize resolve_on_core:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_v3.aleo/resolve_market.future;
    await r2;
    get proposals[r0] into r3;
    branch.eq r3.is_disputed false to end_then_0_0;
    add r0 0field into r4;
    hash.bhp256 r4 into r5 as field;
    get.or_use votes[r5] 0u64 into r6;
    add r0 1field into r7;
    hash.bhp256 r7 into r8 as field;
    get.or_use votes[r8] 0u64 into r9;
    gt r9 r6 into r10;
    ternary r10 1u8 0u8 into r11;
    assert.eq r1 r11;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    cast block.height into r12 as u64;
    gte r12 r3.challenge_deadline into r13;
    assert.eq r13 true;
    assert.eq r1 r3.proposed_outcome;
    position end_otherwise_0_1;

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
