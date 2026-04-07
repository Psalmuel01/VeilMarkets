import veilmarkets_factory_v8.aleo;
program veilmarkets_v8.aleo;

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
    market_type as u8;
    outcome_count as u8;
    close_time as u64;
    resolution_time as u64;
    is_resolved as boolean;
    winning_outcome as u8;
    resolved_by_oracle as boolean;
    token_id as address;

struct PoolState:
    total_outcome_0 as u64;
    total_outcome_1 as u64;
    total_outcome_2 as u64;
    total_outcome_3 as u64;
    participant_count as u64;
    locked as boolean;
    escrowed_amount as u64;

struct PayoutClaim:
    amount as u64;
    token_id as address;

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
    value as PayoutClaim.public;

function create_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as u8.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as address.public;
    call veilmarkets_factory_v8.aleo/verify_is_registered 1u8 r6 into r7;
    cast self.caller into r8 as field;
    add r0 r8 into r9;
    hash.bhp256 r9 into r10 as field;
    async create_market r10 self.caller r0 r1 r2 r3 r4 r5 r6 r7 into r11;
    output r11 as veilmarkets_v8.aleo/create_market.future;

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
    input r9 as veilmarkets_factory_v8.aleo/verify_is_registered.future;
    await r9;
    contains markets[r0] into r10;
    not r10 into r11;
    assert.eq r11 true;
    lte r3 6u8 into r12;
    assert.eq r12 true;
    lte r4 1u8 into r13;
    assert.eq r13 true;
    is.eq r4 0u8 into r14;
    branch.eq r14 false to end_then_0_0;
    is.eq r5 2u8 into r15;
    assert.eq r15 true;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    gte r5 2u8 into r16;
    assert.eq r16 true;
    lte r5 4u8 into r17;
    assert.eq r17 true;
    position end_otherwise_0_1;
    cast r1 r2 r3 r4 r5 r6 r7 false 254u8 false r8 into r18 as MarketInfo;
    cast block.timestamp into r19 as u64;
    gt r6 r19 into r20;
    assert.eq r20 true;
    gt r7 r6 into r21;
    assert.eq r21 true;
    cast 0u64 0u64 0u64 0u64 0u64 false 0u64 into r22 as PoolState;
    set r18 into markets[r0];
    set r22 into pools[r0];

function place_bet:
    input r0 as field.private;
    input r1 as u8.private;
    input r2 as u64.private;
    input r3 as field.private;
    lte r1 3u8 into r4;
    assert.eq r4 true;
    gt r2 0u64 into r5;
    assert.eq r5 true;
    cast r1 into r6 as field;
    add r0 r6 into r7;
    cast r2 into r8 as field;
    add r7 r8 into r9;
    add r9 r3 into r10;
    hash.bhp256 r10 into r11 as field;
    async place_bet r0 r1 r2 r3 r11 self.caller into r12;
    output r12 as veilmarkets_v8.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as address.public;
    get markets[r0] into r6;
    assert.eq r6.token_id r5;
    cast block.timestamp into r7 as u64;
    lt r7 r6.close_time into r8;
    assert.eq r8 true;
    not r6.is_resolved into r9;
    assert.eq r9 true;
    lt r1 r6.outcome_count into r10;
    assert.eq r10 true;
    get pools[r0] into r11;
    not r11.locked into r12;
    assert.eq r12 true;
    is.eq r1 0u8 into r13;
    add r11.total_outcome_0 r2 into r14;
    ternary r13 r14 r11.total_outcome_0 into r15;
    is.eq r1 1u8 into r16;
    add r11.total_outcome_1 r2 into r17;
    ternary r16 r17 r11.total_outcome_1 into r18;
    is.eq r1 2u8 into r19;
    add r11.total_outcome_2 r2 into r20;
    ternary r19 r20 r11.total_outcome_2 into r21;
    is.eq r1 3u8 into r22;
    add r11.total_outcome_3 r2 into r23;
    ternary r22 r23 r11.total_outcome_3 into r24;
    add r11.participant_count 1u64 into r25;
    add r11.escrowed_amount r2 into r26;
    cast r15 r18 r21 r24 r25 r11.locked r26 into r27 as PoolState;
    set r27 into pools[r0];
    set r3 into position_to_escrow[r4];

function mint_position_record:
    input r0 as field.private;
    input r1 as u8.private;
    input r2 as u64.private;
    input r3 as field.private;
    hash.bhp256 self.signer into r4 as field;
    add r4 r3 into r5;
    hash.bhp256 r5 into r6 as field;
    hash.bhp256 r6 into r7 as group;
    cast self.signer r0 r1 r2 r3 r7 into r8 as BetPosition.record;
    output r8 as BetPosition.record;

function resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    call veilmarkets_factory_v8.aleo/verify_is_registered 2u8 self.caller into r3;
    async resolve_market r0 r1 r3 into r4;
    output r4 as veilmarkets_v8.aleo/resolve_market.future;

finalize resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_factory_v8.aleo/verify_is_registered.future;
    await r2;
    get markets[r0] into r3;
    lt r1 r3.outcome_count into r4;
    assert.eq r4 true;
    cast block.timestamp into r5 as u64;
    gte r5 r3.resolution_time into r6;
    assert.eq r6 true;
    not r3.is_resolved into r7;
    assert.eq r7 true;
    cast r3.creator r3.title_hash r3.category r3.market_type r3.outcome_count r3.close_time r3.resolution_time true r1 true r3.token_id into r8 as MarketInfo;
    set r8 into markets[r0];
    get pools[r0] into r9;
    cast r9.total_outcome_0 r9.total_outcome_1 r9.total_outcome_2 r9.total_outcome_3 r9.participant_count true r9.escrowed_amount into r10 as PoolState;
    set r10 into pools[r0];

function claim_winnings:
    input r0 as BetPosition.record;
    cast r0.outcome into r1 as field;
    add r0.market_id r1 into r2;
    cast r0.amount into r3 as field;
    add r2 r3 into r4;
    add r4 r0.escrow_id into r5;
    hash.bhp256 r5 into r6 as field;
    hash.bhp256 r0.owner into r7 as field;
    cast r0.amount into r8 as field;
    add r7 r0.market_id into r9;
    add r9 r8 into r10;
    cast r0.outcome into r11 as field;
    add r10 r11 into r12;
    add r12 r0.escrow_id into r13;
    hash.bhp256 r13 into r14 as field;
    async claim_winnings r0.market_id r0.outcome r0.amount r0.escrow_id r14 r6 into r15;
    hash.bhp256 r14 into r16 as group;
    cast r0.owner r0.market_id 0u64 r14 r16 into r17 as WinningsClaim.record;
    output r17 as WinningsClaim.record;
    output r15 as veilmarkets_v8.aleo/claim_winnings.future;

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
    is.neq r9.winning_outcome 255u8 into r10;
    assert.eq r10 true;
    assert.eq r1 r9.winning_outcome;
    get pools[r0] into r11;
    is.eq r9.winning_outcome 0u8 into r12;
    is.eq r9.winning_outcome 1u8 into r13;
    is.eq r9.winning_outcome 2u8 into r14;
    ternary r14 r11.total_outcome_2 r11.total_outcome_3 into r15;
    ternary r13 r11.total_outcome_1 r15 into r16;
    ternary r12 r11.total_outcome_0 r16 into r17;
    add r11.total_outcome_0 r11.total_outcome_1 into r18;
    add r18 r11.total_outcome_2 into r19;
    add r19 r11.total_outcome_3 into r20;
    gt r17 0u64 into r21;
    assert.eq r21 true;
    mul r2 r20 into r22;
    div r22 r17 into r23;
    gt r23 0u64 into r24;
    assert.eq r24 true;
    cast r23 r9.token_id into r25 as PayoutClaim;
    set r25 into pending_payouts[r4];

function verify_claim:
    input r0 as field.public;
    input r1 as u64.public;
    async verify_claim r0 r1 self.caller into r2;
    output r2 as veilmarkets_v8.aleo/verify_claim.future;

finalize verify_claim:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    get pending_payouts[r0] into r3;
    assert.eq r3.amount r1;
    assert.eq r3.token_id r2;
    cast 0u64 r2 into r4 as PayoutClaim;
    set r4 into pending_payouts[r0];

function cancel_market:
    input r0 as field.public;
    async cancel_market r0 self.caller into r1;
    output r1 as veilmarkets_v8.aleo/cancel_market.future;

finalize cancel_market:
    input r0 as field.public;
    input r1 as address.public;
    get markets[r0] into r2;
    assert.eq r1 r2.creator;
    cast block.timestamp into r3 as u64;
    lt r3 r2.close_time into r4;
    assert.eq r4 true;
    not r2.is_resolved into r5;
    assert.eq r5 true;
    cast r2.creator r2.title_hash r2.category r2.market_type r2.outcome_count r2.close_time r2.resolution_time true 255u8 r2.resolved_by_oracle r2.token_id into r6 as MarketInfo;
    set r6 into markets[r0];
    get pools[r0] into r7;
    cast r7.total_outcome_0 r7.total_outcome_1 r7.total_outcome_2 r7.total_outcome_3 r7.participant_count true r7.escrowed_amount into r8 as PoolState;
    set r8 into pools[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
