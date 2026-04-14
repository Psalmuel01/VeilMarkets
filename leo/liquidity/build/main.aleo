import credits.aleo;
program veilmarkets_liquidity_v4.aleo;

struct MarketConfig:
    creator as address;
    outcome_count as u8;
    close_time as u64;
    is_resolved as boolean;
    token_id as address;

struct PoolState:
    total_outcome_0 as u64;
    total_outcome_1 as u64;
    total_outcome_2 as u64;
    total_outcome_3 as u64;
    total_outcome_4 as u64;
    total_outcome_5 as u64;
    total_outcome_6 as u64;
    total_outcome_7 as u64;
    outcome_supply as u64;
    trader_count as u64;
    lp_count as u64;
    locked as boolean;
    total_collateral as u64;
    lp_collateral as u64;
    lp_supply as u64;
    cumulative_volume as u64;

mapping markets:
    key as field.public;
    value as MarketConfig.public;

mapping pools:
    key as field.public;
    value as PoolState.public;

mapping lp_balances:
    key as field.public;
    value as u64.public;

mapping ping_last_seen:
    key as address.public;
    value as field.public;

function register_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as address.public;
    async register_market r0 r1 r2 r3 self.caller into r4;
    output r4 as veilmarkets_liquidity_v4.aleo/register_market.future;

finalize register_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as address.public;
    input r4 as address.public;
    gte r1 2u8 into r5;
    assert.eq r5 true;
    lte r1 8u8 into r6;
    assert.eq r6 true;
    cast block.timestamp into r7 as u64;
    gt r2 r7 into r8;
    assert.eq r8 true;
    contains markets[r0] into r9;
    branch.eq r9 false to end_then_0_0;
    get markets[r0] into r10;
    assert.eq r10.creator r4;
    assert.eq r10.outcome_count r1;
    assert.eq r10.close_time r2;
    assert.eq r10.token_id r3;
    contains pools[r0] into r11;
    not r11 into r12;
    branch.eq r12 false to end_then_1_2;
    cast 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 false 0u64 0u64 0u64 0u64 into r13 as PoolState;
    set r13 into pools[r0];
    branch.eq true true to end_otherwise_1_3;
    position end_then_1_2;
    position end_otherwise_1_3;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;
    cast r4 r1 r2 false r3 into r14 as MarketConfig;
    cast 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 false 0u64 0u64 0u64 0u64 into r15 as PoolState;
    set r14 into markets[r0];
    set r15 into pools[r0];

function fund_pool:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    gte r0.microcredits r2 into r3;
    assert.eq r3 true;
    gte r2 1000000u64 into r4;
    assert.eq r4 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_liquidity_v4.aleo r2 into r5 r6;
    cast self.signer into r7 as field;
    add r1 r7 into r8;
    hash.bhp256 r8 into r9 as field;
    async fund_pool r6 r1 r2 r9 into r10;
    output r5 as credits.aleo/credits.record;
    output r10 as veilmarkets_liquidity_v4.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as field.public;
    await r0;
    get markets[r1] into r4;
    not r4.is_resolved into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    lt r6 r4.close_time into r7;
    assert.eq r7 true;
    get pools[r1] into r8;
    not r8.locked into r9;
    assert.eq r9 true;
    cast r4.outcome_count into r10 as u64;
    div r2 r10 into r11;
    gt r11 0u64 into r12;
    assert.eq r12 true;
    gt r4.outcome_count 0u8 into r13;
    ternary r13 r11 0u64 into r14;
    add r8.total_outcome_0 r14 into r15;
    gt r4.outcome_count 1u8 into r16;
    ternary r16 r11 0u64 into r17;
    add r8.total_outcome_1 r17 into r18;
    gt r4.outcome_count 2u8 into r19;
    ternary r19 r11 0u64 into r20;
    add r8.total_outcome_2 r20 into r21;
    gt r4.outcome_count 3u8 into r22;
    ternary r22 r11 0u64 into r23;
    add r8.total_outcome_3 r23 into r24;
    gt r4.outcome_count 4u8 into r25;
    ternary r25 r11 0u64 into r26;
    add r8.total_outcome_4 r26 into r27;
    gt r4.outcome_count 5u8 into r28;
    ternary r28 r11 0u64 into r29;
    add r8.total_outcome_5 r29 into r30;
    gt r4.outcome_count 6u8 into r31;
    ternary r31 r11 0u64 into r32;
    add r8.total_outcome_6 r32 into r33;
    gt r4.outcome_count 7u8 into r34;
    ternary r34 r11 0u64 into r35;
    add r8.total_outcome_7 r35 into r36;
    add r8.outcome_supply r11 into r37;
    add r8.lp_count 1u64 into r38;
    add r8.total_collateral r2 into r39;
    add r8.lp_collateral r2 into r40;
    add r8.lp_supply r2 into r41;
    cast r15 r18 r21 r24 r27 r30 r33 r36 r37 r8.trader_count r38 false r39 r40 r41 r8.cumulative_volume into r42 as PoolState;
    set r42 into pools[r1];
    add r1 r3 into r43;
    hash.bhp256 r43 into r44 as field;
    get.or_use lp_balances[r44] 0u64 into r45;
    add r45 r2 into r46;
    set r46 into lp_balances[r44];

function ping:
    input r0 as field.public;
    async ping self.caller r0 into r1;
    output r1 as veilmarkets_liquidity_v4.aleo/ping.future;

finalize ping:
    input r0 as address.public;
    input r1 as field.public;
    set r1 into ping_last_seen[r0];

constructor:
    assert.eq program_owner aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
