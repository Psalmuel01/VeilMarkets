import veilmarkets_factory_v9.aleo;
program veilmarkets_v9.aleo;

record BetPosition:
    owner as address.private;
    position_id as field.private;
    market_id as field.private;
    outcome as u8.private;
    amount as u64.private;
    escrow_id as field.private;
    shares as u64.private;
    collateral_in as u64.private;
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
    total_outcome_4 as u64;
    total_outcome_5 as u64;
    total_outcome_6 as u64;
    total_outcome_7 as u64;
    participant_count as u64;
    locked as boolean;
    total_collateral as u64;
    total_shares as u64;
    lp_supply as u64;

struct PositionState:
    holder as address;
    market_id as field;
    outcome as u8;
    shares as u64;
    collateral_in as u64;
    token_id as address;
    is_closed as boolean;

struct PayoutClaim:
    amount as u64;
    token_id as address;

mapping markets:
    key as field.public;
    value as MarketInfo.public;

mapping pools:
    key as field.public;
    value as PoolState.public;

mapping outcome_exposure:
    key as field.public;
    value as u64.public;

mapping outcome_share_supply:
    key as field.public;
    value as u64.public;

mapping position_to_escrow:
    key as field.public;
    value as field.public;

mapping position_owner_commitments:
    key as field.public;
    value as field.public;

mapping minted_positions:
    key as field.public;
    value as boolean.public;

mapping positions:
    key as field.public;
    value as PositionState.public;

mapping pending_position_market:
    key as field.public;
    value as field.public;

mapping pending_position_outcome:
    key as field.public;
    value as u8.public;

mapping pending_position_collateral:
    key as field.public;
    value as u64.public;

mapping pending_position_shares:
    key as field.public;
    value as u64.public;

mapping spent_nullifiers:
    key as field.public;
    value as boolean.public;

mapping pending_payouts:
    key as field.public;
    value as PayoutClaim.public;

mapping protocol_u8:
    key as u8.public;
    value as u8.public;

mapping protocol_u64:
    key as u8.public;
    value as u64.public;

mapping protocol_fees:
    key as u8.public;
    value as u64.public;

function create_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as u8.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as address.public;
    call veilmarkets_factory_v9.aleo/verify_is_registered 1u8 r6 into r7;
    cast self.caller into r8 as field;
    add r0 r8 into r9;
    hash.bhp256 r9 into r10 as field;
    async create_market r10 self.caller r0 r1 r2 r3 r4 r5 r6 r7 into r11;
    output r11 as veilmarkets_v9.aleo/create_market.future;

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
    input r9 as veilmarkets_factory_v9.aleo/verify_is_registered.future;
    await r9;
    contains markets[r0] into r10;
    not r10 into r11;
    assert.eq r11 true;
    lte r3 6u8 into r12;
    assert.eq r12 true;
    lte r4 1u8 into r13;
    assert.eq r13 true;
    get.or_use protocol_u8[0u8] 32u8 into r14;
    gte r14 2u8 into r15;
    assert.eq r15 true;
    lte r14 32u8 into r16;
    assert.eq r16 true;
    gte r5 2u8 into r17;
    assert.eq r17 true;
    lte r5 r14 into r18;
    assert.eq r18 true;
    is.eq r4 0u8 into r19;
    branch.eq r19 false to end_then_0_0;
    assert.eq r5 2u8;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;
    cast block.timestamp into r20 as u64;
    gt r6 r20 into r21;
    assert.eq r21 true;
    gt r7 r6 into r22;
    assert.eq r22 true;
    cast r1 r2 r3 r4 r5 r6 r7 false 254u8 false r8 into r23 as MarketInfo;
    cast 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 0u64 false 0u64 0u64 0u64 into r24 as PoolState;
    set r23 into markets[r0];
    set r24 into pools[r0];

function place_bet:
    input r0 as field.private;
    input r1 as u8.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as field.private;
    async place_bet r0 r1 r2 1u64 r3 r4 self.caller into r5;
    output r5 as veilmarkets_v9.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as u64.public;
    input r4 as field.public;
    input r5 as field.public;
    input r6 as address.public;
    get markets[r0] into r7;
    assert.eq r7.token_id r6;
    not r7.is_resolved into r8;
    assert.eq r8 true;
    cast block.timestamp into r9 as u64;
    lt r9 r7.close_time into r10;
    assert.eq r10 true;
    lt r1 r7.outcome_count into r11;
    assert.eq r11 true;
    get.or_use protocol_u64[2u8] 1000000u64 into r12;
    gte r2 r12 into r13;
    assert.eq r13 true;
    get.or_use protocol_u64[1u8] 100u64 into r14;
    lte r14 10000u64 into r15;
    assert.eq r15 true;
    assert.eq true true;
    cast r2 into r16 as u128;
    cast r14 into r17 as u128;
    cast 10000u64 into r18 as u128;
    mul r16 r17 into r19;
    div r19 r18 into r20;
    cast r20 into r21 as u64;
    sub r2 r21 into r22;
    gt r22 0u64 into r23;
    assert.eq r23 true;
    get pools[r0] into r24;
    not r24.locked into r25;
    assert.eq r25 true;
    cast r1 into r26 as field;
    add r0 r26 into r27;
    get.or_use outcome_exposure[r27] 0u64 into r28;
    get.or_use outcome_share_supply[r27] 0u64 into r29;
    get.or_use protocol_u64[4u8] 10000000u64 into r30;
    gt r30 0u64 into r31;
    assert.eq r31 true;
    cast r7.outcome_count into r32 as u64;
    mul r30 r32 into r33;
    add r24.total_collateral r33 into r34;
    cast r7.outcome_count into r35 as u64;
    div r24.total_collateral r35 into r36;
    add r36 r30 into r37;
    add r37 r28 into r38;
    gt r38 0u64 into r39;
    assert.eq r39 true;
    cast r22 into r40 as u128;
    cast r34 into r41 as u128;
    cast r38 into r42 as u128;
    mul r40 r41 into r43;
    div r43 r42 into r44;
    cast r44 into r45 as u64;
    is.eq r45 0u64 into r46;
    ternary r46 1u64 r45 into r47;
    gte r47 r3 into r48;
    assert.eq r48 true;
    contains position_to_escrow[r4] into r49;
    not r49 into r50;
    assert.eq r50 true;
    get.or_use minted_positions[r4] false into r51;
    not r51 into r52;
    assert.eq r52 true;
    add r28 r22 into r53;
    add r29 r47 into r54;
    set r53 into outcome_exposure[r27];
    set r54 into outcome_share_supply[r27];
    is.eq r1 0u8 into r55;
    ternary r55 r53 r24.total_outcome_0 into r56;
    is.eq r1 1u8 into r57;
    ternary r57 r53 r24.total_outcome_1 into r58;
    is.eq r1 2u8 into r59;
    ternary r59 r53 r24.total_outcome_2 into r60;
    is.eq r1 3u8 into r61;
    ternary r61 r53 r24.total_outcome_3 into r62;
    is.eq r1 4u8 into r63;
    ternary r63 r53 r24.total_outcome_4 into r64;
    is.eq r1 5u8 into r65;
    ternary r65 r53 r24.total_outcome_5 into r66;
    is.eq r1 6u8 into r67;
    ternary r67 r53 r24.total_outcome_6 into r68;
    is.eq r1 7u8 into r69;
    ternary r69 r53 r24.total_outcome_7 into r70;
    add r24.participant_count 1u64 into r71;
    add r24.total_collateral r22 into r72;
    add r24.total_shares r47 into r73;
    cast r56 r58 r60 r62 r64 r66 r68 r70 r71 r24.locked r72 r73 r24.lp_supply into r74 as PoolState;
    set r74 into pools[r0];
    get.or_use protocol_fees[0u8] 0u64 into r75;
    add r75 r21 into r76;
    set r76 into protocol_fees[0u8];
    set r4 into position_to_escrow[r4];
    set r5 into position_owner_commitments[r4];
    set r0 into pending_position_market[r4];
    set r1 into pending_position_outcome[r4];
    set r2 into pending_position_collateral[r4];
    set r47 into pending_position_shares[r4];

function buy_shares:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as u64.public;
    input r4 as field.public;
    input r5 as field.public;
    async buy_shares r0 r1 r2 r3 r4 r5 self.caller into r6;
    output r6 as veilmarkets_v9.aleo/buy_shares.future;

finalize buy_shares:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as u64.public;
    input r4 as field.public;
    input r5 as field.public;
    input r6 as address.public;
    get markets[r0] into r7;
    assert.eq r7.token_id r6;
    not r7.is_resolved into r8;
    assert.eq r8 true;
    cast block.timestamp into r9 as u64;
    lt r9 r7.close_time into r10;
    assert.eq r10 true;
    lt r1 r7.outcome_count into r11;
    assert.eq r11 true;
    get.or_use protocol_u64[2u8] 1000000u64 into r12;
    gte r2 r12 into r13;
    assert.eq r13 true;
    get.or_use protocol_u64[1u8] 100u64 into r14;
    lte r14 10000u64 into r15;
    assert.eq r15 true;
    assert.eq true true;
    cast r2 into r16 as u128;
    cast r14 into r17 as u128;
    cast 10000u64 into r18 as u128;
    mul r16 r17 into r19;
    div r19 r18 into r20;
    cast r20 into r21 as u64;
    sub r2 r21 into r22;
    gt r22 0u64 into r23;
    assert.eq r23 true;
    get pools[r0] into r24;
    not r24.locked into r25;
    assert.eq r25 true;
    cast r1 into r26 as field;
    add r0 r26 into r27;
    get.or_use outcome_exposure[r27] 0u64 into r28;
    get.or_use outcome_share_supply[r27] 0u64 into r29;
    get.or_use protocol_u64[4u8] 10000000u64 into r30;
    gt r30 0u64 into r31;
    assert.eq r31 true;
    cast r7.outcome_count into r32 as u64;
    mul r30 r32 into r33;
    add r24.total_collateral r33 into r34;
    cast r7.outcome_count into r35 as u64;
    div r24.total_collateral r35 into r36;
    add r36 r30 into r37;
    add r37 r28 into r38;
    gt r38 0u64 into r39;
    assert.eq r39 true;
    cast r22 into r40 as u128;
    cast r34 into r41 as u128;
    cast r38 into r42 as u128;
    mul r40 r41 into r43;
    div r43 r42 into r44;
    cast r44 into r45 as u64;
    is.eq r45 0u64 into r46;
    ternary r46 1u64 r45 into r47;
    gte r47 r3 into r48;
    assert.eq r48 true;
    contains position_to_escrow[r4] into r49;
    not r49 into r50;
    assert.eq r50 true;
    get.or_use minted_positions[r4] false into r51;
    not r51 into r52;
    assert.eq r52 true;
    add r28 r22 into r53;
    add r29 r47 into r54;
    set r53 into outcome_exposure[r27];
    set r54 into outcome_share_supply[r27];
    is.eq r1 0u8 into r55;
    ternary r55 r53 r24.total_outcome_0 into r56;
    is.eq r1 1u8 into r57;
    ternary r57 r53 r24.total_outcome_1 into r58;
    is.eq r1 2u8 into r59;
    ternary r59 r53 r24.total_outcome_2 into r60;
    is.eq r1 3u8 into r61;
    ternary r61 r53 r24.total_outcome_3 into r62;
    is.eq r1 4u8 into r63;
    ternary r63 r53 r24.total_outcome_4 into r64;
    is.eq r1 5u8 into r65;
    ternary r65 r53 r24.total_outcome_5 into r66;
    is.eq r1 6u8 into r67;
    ternary r67 r53 r24.total_outcome_6 into r68;
    is.eq r1 7u8 into r69;
    ternary r69 r53 r24.total_outcome_7 into r70;
    add r24.participant_count 1u64 into r71;
    add r24.total_collateral r22 into r72;
    add r24.total_shares r47 into r73;
    cast r56 r58 r60 r62 r64 r66 r68 r70 r71 r24.locked r72 r73 r24.lp_supply into r74 as PoolState;
    set r74 into pools[r0];
    get.or_use protocol_fees[0u8] 0u64 into r75;
    add r75 r21 into r76;
    set r76 into protocol_fees[0u8];
    set r4 into position_to_escrow[r4];
    set r5 into position_owner_commitments[r4];
    set r0 into pending_position_market[r4];
    set r1 into pending_position_outcome[r4];
    set r2 into pending_position_collateral[r4];
    set r47 into pending_position_shares[r4];

function fund_pool:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as field.public;
    input r3 as field.public;
    async fund_pool r0 r1 r2 r3 self.caller into r4;
    output r4 as veilmarkets_v9.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as field.public;
    input r3 as field.public;
    input r4 as address.public;
    get markets[r0] into r5;
    assert.eq r5.token_id r4;
    not r5.is_resolved into r6;
    assert.eq r6 true;
    cast block.timestamp into r7 as u64;
    lt r7 r5.close_time into r8;
    assert.eq r8 true;
    get.or_use protocol_u64[3u8] 1000000u64 into r9;
    gte r1 r9 into r10;
    assert.eq r10 true;
    get.or_use minted_positions[r2] false into r11;
    not r11 into r12;
    assert.eq r12 true;
    contains position_to_escrow[r2] into r13;
    not r13 into r14;
    assert.eq r14 true;
    get pools[r0] into r15;
    not r15.locked into r16;
    assert.eq r16 true;
    add r15.participant_count 1u64 into r17;
    add r15.total_collateral r1 into r18;
    add r15.lp_supply r1 into r19;
    cast r15.total_outcome_0 r15.total_outcome_1 r15.total_outcome_2 r15.total_outcome_3 r15.total_outcome_4 r15.total_outcome_5 r15.total_outcome_6 r15.total_outcome_7 r17 r15.locked r18 r15.total_shares r19 into r20 as PoolState;
    set r20 into pools[r0];
    set r2 into position_to_escrow[r2];
    set r3 into position_owner_commitments[r2];
    set r0 into pending_position_market[r2];
    set 255u8 into pending_position_outcome[r2];
    set r1 into pending_position_collateral[r2];
    set r1 into pending_position_shares[r2];

function mint_position_record:
    input r0 as field.private;
    input r1 as u8.private;
    input r2 as u64.private;
    input r3 as field.private;
    hash.bhp256 r3 into r4 as group;
    cast self.signer r3 r0 r1 r2 r3 r2 r2 r4 into r5 as BetPosition.record;
    async mint_position_record r3 r0 r1 r2 self.caller into r6;
    output r5 as BetPosition.record;
    output r6 as veilmarkets_v9.aleo/mint_position_record.future;

finalize mint_position_record:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as address.public;
    get position_to_escrow[r0] into r5;
    assert.eq r5 r0;
    get position_owner_commitments[r0] into r6;
    cast r4 into r7 as field;
    add r7 r0 into r8;
    hash.bhp256 r8 into r9 as field;
    assert.eq r6 r9;
    get pending_position_market[r0] into r10;
    get pending_position_outcome[r0] into r11;
    get pending_position_collateral[r0] into r12;
    get pending_position_shares[r0] into r13;
    assert.eq r10 r1;
    assert.eq r11 r2;
    assert.eq r12 r3;
    get markets[r1] into r14;
    lt r2 r14.outcome_count into r15;
    is.eq r2 255u8 into r16;
    or r15 r16 into r17;
    assert.eq r17 true;
    get.or_use minted_positions[r0] false into r18;
    not r18 into r19;
    assert.eq r19 true;
    set true into minted_positions[r0];
    cast r4 r1 r2 r13 r12 r14.token_id false into r20 as PositionState;
    set r20 into positions[r0];

function mint_share_record:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    hash.bhp256 r0 into r4 as group;
    cast self.signer r0 r1 r2 r3 r0 r3 r3 r4 into r5 as BetPosition.record;
    async mint_share_record r0 r1 r2 r3 self.caller into r6;
    output r5 as BetPosition.record;
    output r6 as veilmarkets_v9.aleo/mint_share_record.future;

finalize mint_share_record:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as address.public;
    get position_to_escrow[r0] into r5;
    assert.eq r5 r0;
    get position_owner_commitments[r0] into r6;
    cast r4 into r7 as field;
    add r7 r0 into r8;
    hash.bhp256 r8 into r9 as field;
    assert.eq r6 r9;
    get pending_position_market[r0] into r10;
    get pending_position_outcome[r0] into r11;
    get pending_position_collateral[r0] into r12;
    get pending_position_shares[r0] into r13;
    assert.eq r10 r1;
    assert.eq r11 r2;
    assert.eq r12 r3;
    get markets[r1] into r14;
    lt r2 r14.outcome_count into r15;
    is.eq r2 255u8 into r16;
    or r15 r16 into r17;
    assert.eq r17 true;
    get.or_use minted_positions[r0] false into r18;
    not r18 into r19;
    assert.eq r19 true;
    set true into minted_positions[r0];
    cast r4 r1 r2 r13 r12 r14.token_id false into r20 as PositionState;
    set r20 into positions[r0];

function sell_shares:
    input r0 as BetPosition.record;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as field.public;
    gt r1 0u64 into r4;
    assert.eq r4 true;
    add r0.escrow_id r3 into r5;
    hash.bhp256 r5 into r6 as group;
    cast r0.owner r0.position_id r0.market_id r0.outcome r0.collateral_in r0.escrow_id r0.shares r0.collateral_in r6 into r7 as BetPosition.record;
    cast r1 into r8 as field;
    add r0.position_id r8 into r9;
    add r9 r3 into r10;
    hash.bhp256 r10 into r11 as field;
    hash.bhp256 r11 into r12 as group;
    cast r0.owner r0.market_id 0u64 r11 r12 into r13 as WinningsClaim.record;
    async sell_shares r0.position_id r0.market_id r0.outcome r0.shares r0.collateral_in r1 r2 r0.shares r0.collateral_in r11 self.caller into r14;
    output r7 as BetPosition.record;
    output r13 as WinningsClaim.record;
    output r14 as veilmarkets_v9.aleo/sell_shares.future;

finalize sell_shares:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as u64.public;
    input r7 as u64.public;
    input r8 as u64.public;
    input r9 as field.public;
    input r10 as address.public;
    get.or_use spent_nullifiers[r9] false into r11;
    not r11 into r12;
    assert.eq r12 true;
    set true into spent_nullifiers[r9];
    get positions[r0] into r13;
    not r13.is_closed into r14;
    assert.eq r14 true;
    assert.eq r13.holder r10;
    assert.eq r13.market_id r1;
    assert.eq r13.outcome r2;
    gte r13.shares r5 into r15;
    assert.eq r15 true;
    get markets[r1] into r16;
    not r16.is_resolved into r17;
    assert.eq r17 true;
    cast block.timestamp into r18 as u64;
    lt r18 r16.close_time into r19;
    assert.eq r19 true;
    get pools[r1] into r20;
    not r20.locked into r21;
    assert.eq r21 true;
    cast r2 into r22 as field;
    add r1 r22 into r23;
    get.or_use outcome_exposure[r23] 0u64 into r24;
    get.or_use outcome_share_supply[r23] 0u64 into r25;
    gte r25 r5 into r26;
    assert.eq r26 true;
    get.or_use protocol_u64[4u8] 10000000u64 into r27;
    gt r27 0u64 into r28;
    assert.eq r28 true;
    cast r16.outcome_count into r29 as u64;
    mul r27 r29 into r30;
    add r20.total_collateral r30 into r31;
    cast r16.outcome_count into r32 as u64;
    div r20.total_collateral r32 into r33;
    add r33 r27 into r34;
    add r34 r24 into r35;
    gt r31 0u64 into r36;
    assert.eq r36 true;
    cast r5 into r37 as u128;
    cast r35 into r38 as u128;
    cast r31 into r39 as u128;
    mul r37 r38 into r40;
    div r40 r39 into r41;
    cast r41 into r42 as u64;
    get.or_use protocol_u64[1u8] 100u64 into r43;
    lte r43 10000u64 into r44;
    assert.eq r44 true;
    assert.eq true true;
    cast r42 into r45 as u128;
    cast r43 into r46 as u128;
    cast 10000u64 into r47 as u128;
    mul r45 r46 into r48;
    div r48 r47 into r49;
    cast r49 into r50 as u64;
    sub r42 r50 into r51;
    gte r51 r6 into r52;
    assert.eq r52 true;
    gte r24 r42 into r53;
    assert.eq r53 true;
    gte r20.total_collateral r42 into r54;
    assert.eq r54 true;
    gte r20.total_shares r5 into r55;
    assert.eq r55 true;
    sub r24 r42 into r56;
    sub r25 r5 into r57;
    set r56 into outcome_exposure[r23];
    set r57 into outcome_share_supply[r23];
    is.eq r2 0u8 into r58;
    ternary r58 r56 r20.total_outcome_0 into r59;
    is.eq r2 1u8 into r60;
    ternary r60 r56 r20.total_outcome_1 into r61;
    is.eq r2 2u8 into r62;
    ternary r62 r56 r20.total_outcome_2 into r63;
    is.eq r2 3u8 into r64;
    ternary r64 r56 r20.total_outcome_3 into r65;
    is.eq r2 4u8 into r66;
    ternary r66 r56 r20.total_outcome_4 into r67;
    is.eq r2 5u8 into r68;
    ternary r68 r56 r20.total_outcome_5 into r69;
    is.eq r2 6u8 into r70;
    ternary r70 r56 r20.total_outcome_6 into r71;
    is.eq r2 7u8 into r72;
    ternary r72 r56 r20.total_outcome_7 into r73;
    sub r20.total_collateral r42 into r74;
    sub r20.total_shares r5 into r75;
    cast r59 r61 r63 r65 r67 r69 r71 r73 r20.participant_count r20.locked r74 r75 r20.lp_supply into r76 as PoolState;
    set r76 into pools[r1];
    get.or_use protocol_fees[0u8] 0u64 into r77;
    add r77 r50 into r78;
    set r78 into protocol_fees[0u8];
    gt r13.shares 0u64 into r79;
    assert.eq r79 true;
    cast r13.collateral_in into r80 as u128;
    cast r5 into r81 as u128;
    cast r13.shares into r82 as u128;
    mul r80 r81 into r83;
    div r83 r82 into r84;
    cast r84 into r85 as u64;
    sub r13.shares r5 into r86;
    sub r13.collateral_in r85 into r87;
    is.eq r86 0u64 into r88;
    cast r13.holder r13.market_id r13.outcome r86 r87 r13.token_id r88 into r89 as PositionState;
    set r89 into positions[r0];
    cast r51 r16.token_id into r90 as PayoutClaim;
    set r90 into pending_payouts[r9];

function claim_winnings:
    input r0 as BetPosition.record;
    hash.bhp256 r0.owner into r1 as field;
    add r1 r0.position_id into r2;
    cast r0.shares into r3 as field;
    add r2 r3 into r4;
    hash.bhp256 r4 into r5 as field;
    hash.bhp256 r5 into r6 as group;
    cast r0.owner r0.market_id 0u64 r5 r6 into r7 as WinningsClaim.record;
    async claim_winnings r0.position_id r0.market_id r0.outcome r0.shares r0.collateral_in r5 self.caller into r8;
    output r7 as WinningsClaim.record;
    output r8 as veilmarkets_v9.aleo/claim_winnings.future;

finalize claim_winnings:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as field.public;
    input r6 as address.public;
    get.or_use spent_nullifiers[r5] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    set true into spent_nullifiers[r5];
    get positions[r0] into r9;
    not r9.is_closed into r10;
    assert.eq r10 true;
    assert.eq r9.holder r6;
    assert.eq r9.market_id r1;
    assert.eq r9.outcome r2;
    gt r9.shares 0u64 into r11;
    assert.eq r11 true;
    get markets[r1] into r12;
    assert.eq r12.is_resolved true;
    get pools[r1] into r13;
    is.eq r12.winning_outcome 255u8 into r14;
    cast r12.winning_outcome into r15 as field;
    add r1 r15 into r16;
    get.or_use outcome_share_supply[r16] 0u64 into r17;
    is.eq r2 r12.winning_outcome into r18;
    or r14 r18 into r19;
    assert.eq r19 true;
    gt r17 0u64 into r20;
    or r14 r20 into r21;
    assert.eq r21 true;
    ternary r14 1u64 r17 into r22;
    gt r22 0u64 into r23;
    assert.eq r23 true;
    cast r9.shares into r24 as u128;
    cast r13.total_collateral into r25 as u128;
    cast r22 into r26 as u128;
    mul r24 r25 into r27;
    div r27 r26 into r28;
    cast r28 into r29 as u64;
    ternary r14 r9.collateral_in r29 into r30;
    gt r30 0u64 into r31;
    assert.eq r31 true;
    cast r30 r12.token_id into r32 as PayoutClaim;
    set r32 into pending_payouts[r5];
    cast r9.holder r9.market_id r9.outcome 0u64 0u64 r9.token_id true into r33 as PositionState;
    set r33 into positions[r0];

function verify_claim:
    input r0 as field.public;
    input r1 as u64.public;
    async verify_claim r0 r1 self.caller into r2;
    output r2 as veilmarkets_v9.aleo/verify_claim.future;

finalize verify_claim:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    get pending_payouts[r0] into r3;
    assert.eq r3.amount r1;
    assert.eq r3.token_id r2;
    cast 0u64 r2 into r4 as PayoutClaim;
    set r4 into pending_payouts[r0];

function resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as address.public;
    is.neq r2 veilmarkets_v9.aleo into r3;
    assert.eq r3 true;
    call veilmarkets_factory_v9.aleo/verify_is_registered 2u8 self.caller into r4;
    async resolve_market r0 r1 r4 into r5;
    output r5 as veilmarkets_v9.aleo/resolve_market.future;

finalize resolve_market:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as veilmarkets_factory_v9.aleo/verify_is_registered.future;
    await r2;
    get markets[r0] into r3;
    not r3.is_resolved into r4;
    assert.eq r4 true;
    cast block.timestamp into r5 as u64;
    gte r5 r3.resolution_time into r6;
    assert.eq r6 true;
    lt r1 r3.outcome_count into r7;
    assert.eq r7 true;
    cast r3.creator r3.title_hash r3.category r3.market_type r3.outcome_count r3.close_time r3.resolution_time true r1 true r3.token_id into r8 as MarketInfo;
    set r8 into markets[r0];
    get pools[r0] into r9;
    cast r9.total_outcome_0 r9.total_outcome_1 r9.total_outcome_2 r9.total_outcome_3 r9.total_outcome_4 r9.total_outcome_5 r9.total_outcome_6 r9.total_outcome_7 r9.participant_count true r9.total_collateral r9.total_shares r9.lp_supply into r10 as PoolState;
    set r10 into pools[r0];

function cancel_market:
    input r0 as field.public;
    async cancel_market r0 self.caller into r1;
    output r1 as veilmarkets_v9.aleo/cancel_market.future;

finalize cancel_market:
    input r0 as field.public;
    input r1 as address.public;
    get markets[r0] into r2;
    assert.eq r2.creator r1;
    not r2.is_resolved into r3;
    assert.eq r3 true;
    cast block.timestamp into r4 as u64;
    lt r4 r2.close_time into r5;
    assert.eq r5 true;
    cast r2.creator r2.title_hash r2.category r2.market_type r2.outcome_count r2.close_time r2.resolution_time true 255u8 false r2.token_id into r6 as MarketInfo;
    set r6 into markets[r0];
    get pools[r0] into r7;
    cast r7.total_outcome_0 r7.total_outcome_1 r7.total_outcome_2 r7.total_outcome_3 r7.total_outcome_4 r7.total_outcome_5 r7.total_outcome_6 r7.total_outcome_7 r7.participant_count true r7.total_collateral r7.total_shares r7.lp_supply into r8 as PoolState;
    set r8 into pools[r0];

function set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    call veilmarkets_factory_v9.aleo/verify_is_registered 4u8 self.caller into r2;
    async set_protocol_u64 r0 r1 r2 into r3;
    output r3 as veilmarkets_v9.aleo/set_protocol_u64.future;

finalize set_protocol_u64:
    input r0 as u8.public;
    input r1 as u64.public;
    input r2 as veilmarkets_factory_v9.aleo/verify_is_registered.future;
    await r2;
    is.eq r0 1u8 into r3;
    branch.eq r3 false to end_then_0_2;
    lte r1 2000u64 into r4;
    assert.eq r4 true;
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    position end_otherwise_0_3;
    is.eq r0 2u8 into r5;
    is.eq r0 3u8 into r6;
    or r5 r6 into r7;
    branch.eq r7 false to end_then_0_4;
    gte r1 1u64 into r8;
    assert.eq r8 true;
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    position end_otherwise_0_5;
    is.eq r0 4u8 into r9;
    branch.eq r9 false to end_then_0_6;
    gt r1 0u64 into r10;
    assert.eq r10 true;
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    position end_otherwise_0_7;
    set r1 into protocol_u64[r0];

function set_protocol_u8:
    input r0 as u8.public;
    input r1 as u8.public;
    call veilmarkets_factory_v9.aleo/verify_is_registered 4u8 self.caller into r2;
    async set_protocol_u8 r0 r1 r2 into r3;
    output r3 as veilmarkets_v9.aleo/set_protocol_u8.future;

finalize set_protocol_u8:
    input r0 as u8.public;
    input r1 as u8.public;
    input r2 as veilmarkets_factory_v9.aleo/verify_is_registered.future;
    await r2;
    is.eq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_8;
    gte r1 2u8 into r4;
    assert.eq r4 true;
    lte r1 32u8 into r5;
    assert.eq r5 true;
    branch.eq true true to end_otherwise_0_9;
    position end_then_0_8;
    position end_otherwise_0_9;
    set r1 into protocol_u8[r0];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
