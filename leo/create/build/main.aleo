program veilmarkets_create_v1.aleo;

struct MarketInfo:
    creator as address;
    title_hash as field;
    category as u8;
    market_type as u8;
    outcome_count as u8;
    close_time as u64;
    resolution_time as u64;
    is_resolved as boolean;
    winning_outcome as u8;
    resolved_by_oracle as boolean;
    token_id as address;

mapping markets:
    key as field.public;
    value as MarketInfo.public;

function create_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as u8.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as address.public;
    cast self.caller into r7 as field;
    add r0 r7 into r8;
    hash.bhp256 r8 into r9 as field;
    async create_market r9 self.caller r0 r1 r2 r3 r4 r5 r6 into r10;
    output r10 as veilmarkets_create_v1.aleo/create_market.future;

finalize create_market:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as field.public;
    input r3 as u8.public;
    input r4 as u8.public;
    input r5 as u8.public;
    input r6 as u64.public;
    input r7 as u64.public;
    input r8 as address.public;
    lte r3 6u8 into r9;
    assert.eq r9 true;
    lte r4 1u8 into r10;
    assert.eq r10 true;
    gte r5 2u8 into r11;
    assert.eq r11 true;
    lte r5 8u8 into r12;
    assert.eq r12 true;
    is.eq r4 0u8 into r13;
    branch.eq r13 false to end_then_0_0;
    is.eq r5 2u8 into r14;
    assert.eq r14 true;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;
    cast block.timestamp into r15 as u64;
    gt r6 r15 into r16;
    assert.eq r16 true;
    gte r7 r6 into r17;
    assert.eq r17 true;
    contains markets[r0] into r18;
    not r18 into r19;
    assert.eq r19 true;
    cast r1 r2 r3 r4 r5 r6 r7 false 254u8 false r8 into r20 as MarketInfo;
    set r20 into markets[r0];

constructor:
    assert.eq program_owner aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
