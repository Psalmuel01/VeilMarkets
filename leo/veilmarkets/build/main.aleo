program veilmarkets.aleo;

record BetPosition:
    owner as address.private;
    market_id as field.private;
    outcome as u8.private;
    amount as u64.private;
    nonce as group.private;

record WinningsClaim:
    owner as address.private;
    market_id as field.private;
    payout_amount as u64.private;
    nonce as group.private;

struct MarketInfo:
    creator as address;
    title_hash as field;
    category as u8;
    close_block as u64;
    resolution_block as u64;
    is_resolved as boolean;
    winning_outcome as u8;

struct PoolState:
    total_no as u64;
    total_yes as u64;
    participant_count as u64;
    locked as boolean;

mapping markets:
    key as field.public;
    value as MarketInfo.public;

mapping pools:
    key as field.public;
    value as PoolState.public;

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
    cast r1 r2 r3 r4 r5 false 2u8 into r8 as MarketInfo;
    cast 0u64 0u64 0u64 false into r9 as PoolState;
    set r8 into markets[r0];
    set r9 into pools[r0];

function place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    is.eq r1 0u8 into r3;
    is.eq r1 1u8 into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    hash.bhp256 r2 into r6 as group;
    cast self.caller r0 r1 r2 r6 into r7 as BetPosition.record;
    async place_bet r0 r1 r2 into r8;
    output r7 as BetPosition.record;
    output r8 as veilmarkets.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    get markets[r0] into r3;
    cast block.height into r4 as u64;
    lt r4 r3.close_block into r5;
    assert.eq r5 true;
    not r3.is_resolved into r6;
    assert.eq r6 true;
    get pools[r0] into r7;
    not r7.locked into r8;
    assert.eq r8 true;
    is.eq r1 0u8 into r9;
    add r7.total_no r2 into r10;
    ternary r9 r10 r7.total_no into r11;
    is.eq r1 1u8 into r12;
    add r7.total_yes r2 into r13;
    ternary r12 r13 r7.total_yes into r14;
    add r7.participant_count 1u64 into r15;
    cast r11 r14 r15 r7.locked into r16 as PoolState;
    set r16 into pools[r0];

function resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    is.eq r1 0u8 into r2;
    is.eq r1 1u8 into r3;
    or r2 r3 into r4;
    assert.eq r4 true;
    async resolve_market r0 r1 self.caller into r5;
    output r5 as veilmarkets.aleo/resolve_market.future;

finalize resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    get markets[r0] into r3;
    assert.eq r2 r3.creator;
    cast block.height into r4 as u64;
    gte r4 r3.resolution_block into r5;
    assert.eq r5 true;
    not r3.is_resolved into r6;
    assert.eq r6 true;
    cast r3.creator r3.title_hash r3.category r3.close_block r3.resolution_block true r1 into r7 as MarketInfo;
    set r7 into markets[r0];
    get pools[r0] into r8;
    cast r8.total_no r8.total_yes r8.participant_count true into r9 as PoolState;
    set r9 into pools[r0];

function claim_winnings:
    input r0 as BetPosition.record;
    input r1 as field.public;
    assert.eq r0.market_id r1;
    hash.bhp256 r0.amount into r2 as group;
    cast r0.owner r1 0u64 r2 into r3 as WinningsClaim.record;
    async claim_winnings r1 r0.outcome r0.amount into r4;
    output r3 as WinningsClaim.record;
    output r4 as veilmarkets.aleo/claim_winnings.future;

finalize claim_winnings:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    get markets[r0] into r3;
    assert.eq r3.is_resolved true;
    assert.eq r1 r3.winning_outcome;
    get pools[r0] into r4;
    is.eq r3.winning_outcome 0u8 into r5;
    ternary r5 r4.total_no r4.total_yes into r6;
    add r4.total_no r4.total_yes into r7;
    mul r2 r7 into r8;
    div r8 r6 into r9;
    gt r9 0u64 into r10;
    assert.eq r10 true;

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
