import veilmarkets_factory.aleo;
program veilmarkets.aleo;

record BetPosition:
    owner as address.private;
    market_id as field.private;
    outcome as u8.private;
    amount as u64.private;
    escrow_id as field.private;
    nonce as group.private;

record WinningsClaim:
    owner as address.private;
    market_id as field.private;
    payout_amount as u64.private;
    nullifier as field.private;
    nonce as group.private;

struct MarketInfo:
    creator as address;
    title_hash as field;
    category as u8;
    close_block as u64;
    resolution_block as u64;
    is_resolved as boolean;
    winning_outcome as u8;
    resolved_by_oracle as boolean;

struct PoolState:
    total_no as u64;
    total_yes as u64;
    participant_count as u64;
    locked as boolean;
    escrowed_amount as u64;

mapping markets:
    key as field.public;
    value as MarketInfo.public;

mapping pools:
    key as field.public;
    value as PoolState.public;

mapping spent_nullifiers:
    key as field.public;
    value as boolean.public;

mapping position_to_escrow:
    key as field.public;
    value as field.public;

mapping pending_payouts:
    key as field.public;
    value as u64.public;

function create_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as u64.public;
    hash.bhp256 self.caller into r4 as field;
    add r4 r0 into r5;
    hash.bhp256 r5 into r6 as field;
    async create_market r6 self.caller r0 r1 r2 r3 into r7;
    output r6 as field.private;
    output r7 as veilmarkets.aleo/create_market.future;

finalize create_market:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as field.public;
    input r3 as u8.public;
    input r4 as u64.public;
    input r5 as u64.public;
    contains markets[r0] into r6;
    not r6 into r7;
    assert.eq r7 true;
    cast r1 r2 r3 r4 r5 false 2u8 false into r8 as MarketInfo;
    cast block.height into r9 as u64;
    gt r4 r9 into r10;
    assert.eq r10 true;
    gt r5 r4 into r11;
    assert.eq r11 true;
    cast 0u64 0u64 0u64 false 0u64 into r12 as PoolState;
    set r8 into markets[r0];
    set r12 into pools[r0];

function place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as address.public;
    assert.eq self.caller aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
    is.eq r1 0u8 into r5;
    is.eq r1 1u8 into r6;
    or r5 r6 into r7;
    assert.eq r7 true;
    gt r2 0u64 into r8;
    assert.eq r8 true;
    hash.bhp256 r4 into r9 as field;
    add r9 r0 into r10;
    add r10 r3 into r11;
    hash.bhp256 r11 into r12 as field;
    async place_bet r0 r1 r2 r3 r12 into r13;
    output r13 as veilmarkets.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as field.public;
    get markets[r0] into r5;
    cast block.height into r6 as u64;
    lt r6 r5.close_block into r7;
    assert.eq r7 true;
    not r5.is_resolved into r8;
    assert.eq r8 true;
    get pools[r0] into r9;
    not r9.locked into r10;
    assert.eq r10 true;
    is.eq r1 0u8 into r11;
    add r9.total_no r2 into r12;
    ternary r11 r12 r9.total_no into r13;
    is.eq r1 1u8 into r14;
    add r9.total_yes r2 into r15;
    ternary r14 r15 r9.total_yes into r16;
    add r9.participant_count 1u64 into r17;
    add r9.escrowed_amount r2 into r18;
    cast r13 r16 r17 r9.locked r18 into r19 as PoolState;
    set r19 into pools[r0];
    set r3 into position_to_escrow[r4];

function mint_position_record:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    hash.bhp256 self.caller into r4 as field;
    add r4 r3 into r5;
    hash.bhp256 r5 into r6 as field;
    hash.bhp256 r6 into r7 as group;
    cast self.caller r0 r1 r2 r3 r7 into r8 as BetPosition.record;
    output r8 as BetPosition.record;

function resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    assert.eq self.caller aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
    is.eq r1 0u8 into r3;
    is.eq r1 1u8 into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    async resolve_market r0 r1 into r6;
    output r6 as veilmarkets.aleo/resolve_market.future;

finalize resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    get markets[r0] into r2;
    cast block.height into r3 as u64;
    gte r3 r2.resolution_block into r4;
    assert.eq r4 true;
    not r2.is_resolved into r5;
    assert.eq r5 true;
    cast r2.creator r2.title_hash r2.category r2.close_block r2.resolution_block true r1 true into r6 as MarketInfo;
    set r6 into markets[r0];
    get pools[r0] into r7;
    cast r7.total_no r7.total_yes r7.participant_count true r7.escrowed_amount into r8 as PoolState;
    set r8 into pools[r0];

function claim_winnings:
    input r0 as BetPosition.record;
    hash.bhp256 r0.owner into r1 as field;
    add r1 r0.market_id into r2;
    add r2 r0.escrow_id into r3;
    hash.bhp256 r3 into r4 as field;
    cast r0.amount into r5 as field;
    add r1 r0.market_id into r6;
    add r6 r5 into r7;
    cast r0.outcome into r8 as field;
    add r7 r8 into r9;
    add r9 r0.escrow_id into r10;
    hash.bhp256 r10 into r11 as field;
    async claim_winnings r0.market_id r0.outcome r0.amount r0.escrow_id r11 r4 into r12;
    hash.bhp256 r11 into r13 as group;
    cast r0.owner r0.market_id 0u64 r11 r13 into r14 as WinningsClaim.record;
    output r14 as WinningsClaim.record;
    output r12 as veilmarkets.aleo/claim_winnings.future;

finalize claim_winnings:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as field.public;
    get.or_use spent_nullifiers[r4] false into r6;
    not r6 into r7;
    assert.eq r7 true;
    set true into spent_nullifiers[r4];
    get position_to_escrow[r5] into r8;
    assert.eq r8 r3;
    get markets[r0] into r9;
    assert.eq r9.is_resolved true;
    assert.eq r1 r9.winning_outcome;
    get pools[r0] into r10;
    is.eq r9.winning_outcome 0u8 into r11;
    ternary r11 r10.total_no r10.total_yes into r12;
    add r10.total_no r10.total_yes into r13;
    mul r2 r13 into r14;
    div r14 r12 into r15;
    gt r15 0u64 into r16;
    assert.eq r16 true;
    set r15 into pending_payouts[r4];

function verify_claim:
    input r0 as field.public;
    input r1 as u64.public;
    async verify_claim r0 r1 into r2;
    output r2 as veilmarkets.aleo/verify_claim.future;

finalize verify_claim:
    input r0 as field.public;
    input r1 as u64.public;
    get pending_payouts[r0] into r2;
    assert.eq r2 r1;

function cancel_market:
    input r0 as field.public;
    async cancel_market r0 self.caller into r1;
    output r1 as veilmarkets.aleo/cancel_market.future;

finalize cancel_market:
    input r0 as field.public;
    input r1 as address.public;
    get markets[r0] into r2;
    assert.eq r1 r2.creator;
    cast block.height into r3 as u64;
    lt r3 r2.close_block into r4;
    assert.eq r4 true;
    not r2.is_resolved into r5;
    assert.eq r5 true;
    cast r2.creator r2.title_hash r2.category r2.close_block r2.resolution_block true 3u8 r2.resolved_by_oracle into r6 as MarketInfo;
    set r6 into markets[r0];
    get pools[r0] into r7;
    cast r7.total_no r7.total_yes r7.participant_count true r7.escrowed_amount into r8 as PoolState;
    set r8 into pools[r0];

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
