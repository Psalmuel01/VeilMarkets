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
    holder_commitment as field;
    market_id as field;
    outcome as u8;
    shares as u64;
    collateral_in as u64;
    token_id as address;
    is_closed as boolean;

struct PayoutClaim:
    amount as u64;
    token_id as address;

struct BuyQuoteComputation:
    fee as u64;
    net_collateral_in as u64;
    shares_out as u64;

struct SellQuoteComputation:
    fee as u64;
    gross_payout as u64;
    net_payout as u64;

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

mapping quote_buy_shares_out:
    key as field.public;
    value as u64.public;

mapping quote_buy_fee:
    key as field.public;
    value as u64.public;

mapping quote_buy_net_collateral:
    key as field.public;
    value as u64.public;

mapping quote_sell_gross_payout:
    key as field.public;
    value as u64.public;

mapping quote_sell_fee:
    key as field.public;
    value as u64.public;

mapping quote_sell_net_payout:
    key as field.public;
    value as u64.public;

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

function quote_buy:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    async quote_buy r0 r1 r2 r3 into r4;
    output r4 as veilmarkets_v9.aleo/quote_buy.future;

finalize quote_buy:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    get markets[r1] into r4;
    not r4.is_resolved into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    lt r6 r4.close_time into r7;
    assert.eq r7 true;
    lt r2 r4.outcome_count into r8;
    assert.eq r8 true;
    get.or_use protocol_u64[2u8] 1000000u64 into r9;
    gte r3 r9 into r10;
    assert.eq r10 true;
    get pools[r1] into r11;
    not r11.locked into r12;
    assert.eq r12 true;
    cast r2 into r13 as field;
    add r1 r13 into r14;
    get.or_use outcome_exposure[r14] 0u64 into r15;
    get.or_use protocol_u64[4u8] 10000000u64 into r16;
    gt r16 0u64 into r17;
    assert.eq r17 true;
    get.or_use protocol_u64[1u8] 100u64 into r18;
    lte r18 10000u64 into r19;
    assert.eq r19 true;
    assert.eq true true;
    cast r3 into r20 as u128;
    cast r18 into r21 as u128;
    cast 10000u64 into r22 as u128;
    mul r20 r21 into r23;
    div r23 r22 into r24;
    cast r24 into r25 as u64;
    sub r3 r25 into r26;
    gt r26 0u64 into r27;
    assert.eq r27 true;
    cast r4.outcome_count into r28 as u64;
    mul r16 r28 into r29;
    add r11.total_collateral r29 into r30;
    cast r4.outcome_count into r31 as u64;
    div r11.total_collateral r31 into r32;
    add r32 r16 into r33;
    add r33 r15 into r34;
    gt r34 0u64 into r35;
    assert.eq r35 true;
    cast r26 into r36 as u128;
    cast r30 into r37 as u128;
    cast r34 into r38 as u128;
    mul r36 r37 into r39;
    div r39 r38 into r40;
    cast r40 into r41 as u64;
    is.eq r41 0u64 into r42;
    ternary r42 1u64 r41 into r43;
    cast r25 r26 r43 into r44 as BuyQuoteComputation;
    set r44.shares_out into quote_buy_shares_out[r0];
    set r44.fee into quote_buy_fee[r0];
    set r44.net_collateral_in into quote_buy_net_collateral[r0];

function quote_sell:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    async quote_sell r0 r1 r2 r3 into r4;
    output r4 as veilmarkets_v9.aleo/quote_sell.future;

finalize quote_sell:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    gt r3 0u64 into r4;
    assert.eq r4 true;
    get markets[r1] into r5;
    not r5.is_resolved into r6;
    assert.eq r6 true;
    cast block.timestamp into r7 as u64;
    lt r7 r5.close_time into r8;
    assert.eq r8 true;
    lt r2 r5.outcome_count into r9;
    assert.eq r9 true;
    get pools[r1] into r10;
    not r10.locked into r11;
    assert.eq r11 true;
    cast r2 into r12 as field;
    add r1 r12 into r13;
    get.or_use outcome_exposure[r13] 0u64 into r14;
    get.or_use outcome_share_supply[r13] 0u64 into r15;
    gte r15 r3 into r16;
    assert.eq r16 true;
    get.or_use protocol_u64[4u8] 10000000u64 into r17;
    gt r17 0u64 into r18;
    assert.eq r18 true;
    get.or_use protocol_u64[1u8] 100u64 into r19;
    lte r19 10000u64 into r20;
    assert.eq r20 true;
    cast r5.outcome_count into r21 as u64;
    mul r17 r21 into r22;
    add r10.total_collateral r22 into r23;
    cast r5.outcome_count into r24 as u64;
    div r10.total_collateral r24 into r25;
    add r25 r17 into r26;
    add r26 r14 into r27;
    gt r23 0u64 into r28;
    assert.eq r28 true;
    cast r3 into r29 as u128;
    cast r27 into r30 as u128;
    cast r23 into r31 as u128;
    mul r29 r30 into r32;
    div r32 r31 into r33;
    cast r33 into r34 as u64;
    assert.eq true true;
    cast r34 into r35 as u128;
    cast r19 into r36 as u128;
    cast 10000u64 into r37 as u128;
    mul r35 r36 into r38;
    div r38 r37 into r39;
    cast r39 into r40 as u64;
    sub r34 r40 into r41;
    cast r40 r34 r41 into r42 as SellQuoteComputation;
    gt r42.gross_payout 0u64 into r43;
    assert.eq r43 true;
    gte r14 r42.gross_payout into r44;
    assert.eq r44 true;
    gte r10.total_collateral r42.gross_payout into r45;
    assert.eq r45 true;
    set r42.gross_payout into quote_sell_gross_payout[r0];
    set r42.fee into quote_sell_fee[r0];
    set r42.net_payout into quote_sell_net_payout[r0];

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
    get pools[r0] into r14;
    not r14.locked into r15;
    assert.eq r15 true;
    cast r1 into r16 as field;
    add r0 r16 into r17;
    get.or_use outcome_exposure[r17] 0u64 into r18;
    get.or_use outcome_share_supply[r17] 0u64 into r19;
    get.or_use protocol_u64[4u8] 10000000u64 into r20;
    gt r20 0u64 into r21;
    assert.eq r21 true;
    get.or_use protocol_u64[1u8] 100u64 into r22;
    lte r22 10000u64 into r23;
    assert.eq r23 true;
    assert.eq true true;
    cast r2 into r24 as u128;
    cast r22 into r25 as u128;
    cast 10000u64 into r26 as u128;
    mul r24 r25 into r27;
    div r27 r26 into r28;
    cast r28 into r29 as u64;
    sub r2 r29 into r30;
    gt r30 0u64 into r31;
    assert.eq r31 true;
    cast r7.outcome_count into r32 as u64;
    mul r20 r32 into r33;
    add r14.total_collateral r33 into r34;
    cast r7.outcome_count into r35 as u64;
    div r14.total_collateral r35 into r36;
    add r36 r20 into r37;
    add r37 r18 into r38;
    gt r38 0u64 into r39;
    assert.eq r39 true;
    cast r30 into r40 as u128;
    cast r34 into r41 as u128;
    cast r38 into r42 as u128;
    mul r40 r41 into r43;
    div r43 r42 into r44;
    cast r44 into r45 as u64;
    is.eq r45 0u64 into r46;
    ternary r46 1u64 r45 into r47;
    cast r29 r30 r47 into r48 as BuyQuoteComputation;
    gte r48.shares_out r3 into r49;
    assert.eq r49 true;
    contains position_to_escrow[r4] into r50;
    not r50 into r51;
    assert.eq r51 true;
    get.or_use minted_positions[r4] false into r52;
    not r52 into r53;
    assert.eq r53 true;
    add r18 r48.net_collateral_in into r54;
    add r19 r48.shares_out into r55;
    set r54 into outcome_exposure[r17];
    set r55 into outcome_share_supply[r17];
    is.eq r1 0u8 into r56;
    ternary r56 r54 r14.total_outcome_0 into r57;
    is.eq r1 1u8 into r58;
    ternary r58 r54 r14.total_outcome_1 into r59;
    is.eq r1 2u8 into r60;
    ternary r60 r54 r14.total_outcome_2 into r61;
    is.eq r1 3u8 into r62;
    ternary r62 r54 r14.total_outcome_3 into r63;
    is.eq r1 4u8 into r64;
    ternary r64 r54 r14.total_outcome_4 into r65;
    is.eq r1 5u8 into r66;
    ternary r66 r54 r14.total_outcome_5 into r67;
    is.eq r1 6u8 into r68;
    ternary r68 r54 r14.total_outcome_6 into r69;
    is.eq r1 7u8 into r70;
    ternary r70 r54 r14.total_outcome_7 into r71;
    add r14.participant_count 1u64 into r72;
    add r14.total_collateral r48.net_collateral_in into r73;
    add r14.total_shares r48.shares_out into r74;
    cast r57 r59 r61 r63 r65 r67 r69 r71 r72 r14.locked r73 r74 r14.lp_supply into r75 as PoolState;
    set r75 into pools[r0];
    get.or_use protocol_fees[0u8] 0u64 into r76;
    add r76 r48.fee into r77;
    set r77 into protocol_fees[0u8];
    set r4 into position_to_escrow[r4];
    set r5 into position_owner_commitments[r4];
    set r0 into pending_position_market[r4];
    set r1 into pending_position_outcome[r4];
    set r2 into pending_position_collateral[r4];
    set r48.shares_out into pending_position_shares[r4];

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
    get pools[r0] into r14;
    not r14.locked into r15;
    assert.eq r15 true;
    cast r1 into r16 as field;
    add r0 r16 into r17;
    get.or_use outcome_exposure[r17] 0u64 into r18;
    get.or_use outcome_share_supply[r17] 0u64 into r19;
    get.or_use protocol_u64[4u8] 10000000u64 into r20;
    gt r20 0u64 into r21;
    assert.eq r21 true;
    get.or_use protocol_u64[1u8] 100u64 into r22;
    lte r22 10000u64 into r23;
    assert.eq r23 true;
    assert.eq true true;
    cast r2 into r24 as u128;
    cast r22 into r25 as u128;
    cast 10000u64 into r26 as u128;
    mul r24 r25 into r27;
    div r27 r26 into r28;
    cast r28 into r29 as u64;
    sub r2 r29 into r30;
    gt r30 0u64 into r31;
    assert.eq r31 true;
    cast r7.outcome_count into r32 as u64;
    mul r20 r32 into r33;
    add r14.total_collateral r33 into r34;
    cast r7.outcome_count into r35 as u64;
    div r14.total_collateral r35 into r36;
    add r36 r20 into r37;
    add r37 r18 into r38;
    gt r38 0u64 into r39;
    assert.eq r39 true;
    cast r30 into r40 as u128;
    cast r34 into r41 as u128;
    cast r38 into r42 as u128;
    mul r40 r41 into r43;
    div r43 r42 into r44;
    cast r44 into r45 as u64;
    is.eq r45 0u64 into r46;
    ternary r46 1u64 r45 into r47;
    cast r29 r30 r47 into r48 as BuyQuoteComputation;
    gte r48.shares_out r3 into r49;
    assert.eq r49 true;
    contains position_to_escrow[r4] into r50;
    not r50 into r51;
    assert.eq r51 true;
    get.or_use minted_positions[r4] false into r52;
    not r52 into r53;
    assert.eq r53 true;
    add r18 r48.net_collateral_in into r54;
    add r19 r48.shares_out into r55;
    set r54 into outcome_exposure[r17];
    set r55 into outcome_share_supply[r17];
    is.eq r1 0u8 into r56;
    ternary r56 r54 r14.total_outcome_0 into r57;
    is.eq r1 1u8 into r58;
    ternary r58 r54 r14.total_outcome_1 into r59;
    is.eq r1 2u8 into r60;
    ternary r60 r54 r14.total_outcome_2 into r61;
    is.eq r1 3u8 into r62;
    ternary r62 r54 r14.total_outcome_3 into r63;
    is.eq r1 4u8 into r64;
    ternary r64 r54 r14.total_outcome_4 into r65;
    is.eq r1 5u8 into r66;
    ternary r66 r54 r14.total_outcome_5 into r67;
    is.eq r1 6u8 into r68;
    ternary r68 r54 r14.total_outcome_6 into r69;
    is.eq r1 7u8 into r70;
    ternary r70 r54 r14.total_outcome_7 into r71;
    add r14.participant_count 1u64 into r72;
    add r14.total_collateral r48.net_collateral_in into r73;
    add r14.total_shares r48.shares_out into r74;
    cast r57 r59 r61 r63 r65 r67 r69 r71 r72 r14.locked r73 r74 r14.lp_supply into r75 as PoolState;
    set r75 into pools[r0];
    get.or_use protocol_fees[0u8] 0u64 into r76;
    add r76 r48.fee into r77;
    set r77 into protocol_fees[0u8];
    set r4 into position_to_escrow[r4];
    set r5 into position_owner_commitments[r4];
    set r0 into pending_position_market[r4];
    set r1 into pending_position_outcome[r4];
    set r2 into pending_position_collateral[r4];
    set r48.shares_out into pending_position_shares[r4];

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
    input r3 as u64.private;
    input r4 as field.private;
    hash.bhp256 r4 into r5 as group;
    cast self.signer r4 r0 r1 r2 r4 r3 r2 r5 into r6 as BetPosition.record;
    async mint_position_record r4 r0 r1 r2 r3 self.caller into r7;
    output r6 as BetPosition.record;
    output r7 as veilmarkets_v9.aleo/mint_position_record.future;

finalize mint_position_record:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as address.public;
    get position_to_escrow[r0] into r6;
    assert.eq r6 r0;
    get position_owner_commitments[r0] into r7;
    cast r5 into r8 as field;
    add r8 r0 into r9;
    hash.bhp256 r9 into r10 as field;
    assert.eq r7 r10;
    get pending_position_market[r0] into r11;
    get pending_position_outcome[r0] into r12;
    get pending_position_collateral[r0] into r13;
    get pending_position_shares[r0] into r14;
    assert.eq r11 r1;
    assert.eq r12 r2;
    assert.eq r13 r3;
    assert.eq r14 r4;
    get markets[r1] into r15;
    lt r2 r15.outcome_count into r16;
    is.eq r2 255u8 into r17;
    or r16 r17 into r18;
    assert.eq r18 true;
    get.or_use minted_positions[r0] false into r19;
    not r19 into r20;
    assert.eq r20 true;
    set true into minted_positions[r0];
    cast r5 into r21 as field;
    add r21 r0 into r22;
    hash.bhp256 r22 into r23 as field;
    cast r23 r1 r2 r14 r13 r15.token_id false into r24 as PositionState;
    set r24 into positions[r0];

function mint_share_record:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    hash.bhp256 r0 into r5 as group;
    cast self.signer r0 r1 r2 r3 r0 r4 r3 r5 into r6 as BetPosition.record;
    async mint_share_record r0 r1 r2 r3 r4 self.caller into r7;
    output r6 as BetPosition.record;
    output r7 as veilmarkets_v9.aleo/mint_share_record.future;

finalize mint_share_record:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as address.public;
    get position_to_escrow[r0] into r6;
    assert.eq r6 r0;
    get position_owner_commitments[r0] into r7;
    cast r5 into r8 as field;
    add r8 r0 into r9;
    hash.bhp256 r9 into r10 as field;
    assert.eq r7 r10;
    get pending_position_market[r0] into r11;
    get pending_position_outcome[r0] into r12;
    get pending_position_collateral[r0] into r13;
    get pending_position_shares[r0] into r14;
    assert.eq r11 r1;
    assert.eq r12 r2;
    assert.eq r13 r3;
    assert.eq r14 r4;
    get markets[r1] into r15;
    lt r2 r15.outcome_count into r16;
    is.eq r2 255u8 into r17;
    or r16 r17 into r18;
    assert.eq r18 true;
    get.or_use minted_positions[r0] false into r19;
    not r19 into r20;
    assert.eq r20 true;
    set true into minted_positions[r0];
    cast r5 into r21 as field;
    add r21 r0 into r22;
    hash.bhp256 r22 into r23 as field;
    cast r23 r1 r2 r14 r13 r15.token_id false into r24 as PositionState;
    set r24 into positions[r0];

function sell_shares:
    input r0 as BetPosition.record;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as field.public;
    gt r1 0u64 into r4;
    assert.eq r4 true;
    gte r0.shares r1 into r5;
    assert.eq r5 true;
    gt r0.shares 0u64 into r6;
    assert.eq r6 true;
    cast r0.collateral_in into r7 as u128;
    cast r1 into r8 as u128;
    cast r0.shares into r9 as u128;
    mul r7 r8 into r10;
    div r10 r9 into r11;
    cast r11 into r12 as u64;
    sub r0.shares r1 into r13;
    sub r0.collateral_in r12 into r14;
    add r0.escrow_id r3 into r15;
    hash.bhp256 r15 into r16 as group;
    cast r0.owner r0.position_id r0.market_id r0.outcome r14 r0.escrow_id r13 r14 r16 into r17 as BetPosition.record;
    cast r1 into r18 as field;
    add r0.position_id r18 into r19;
    add r19 r3 into r20;
    hash.bhp256 r20 into r21 as field;
    hash.bhp256 r21 into r22 as group;
    cast r0.owner r0.market_id 0u64 r21 r22 into r23 as WinningsClaim.record;
    async sell_shares r0.position_id r0.market_id r0.outcome r0.shares r0.collateral_in r1 r2 r13 r14 r21 self.caller into r24;
    output r17 as BetPosition.record;
    output r23 as WinningsClaim.record;
    output r24 as veilmarkets_v9.aleo/sell_shares.future;

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
    cast r10 into r15 as field;
    add r15 r0 into r16;
    hash.bhp256 r16 into r17 as field;
    assert.eq r13.holder_commitment r17;
    assert.eq r13.market_id r1;
    assert.eq r13.outcome r2;
    assert.eq r13.shares r3;
    assert.eq r13.collateral_in r4;
    gte r13.shares r5 into r18;
    assert.eq r18 true;
    get markets[r1] into r19;
    not r19.is_resolved into r20;
    assert.eq r20 true;
    cast block.timestamp into r21 as u64;
    lt r21 r19.close_time into r22;
    assert.eq r22 true;
    get pools[r1] into r23;
    not r23.locked into r24;
    assert.eq r24 true;
    cast r2 into r25 as field;
    add r1 r25 into r26;
    get.or_use outcome_exposure[r26] 0u64 into r27;
    get.or_use outcome_share_supply[r26] 0u64 into r28;
    gte r28 r5 into r29;
    assert.eq r29 true;
    get.or_use protocol_u64[4u8] 10000000u64 into r30;
    gt r30 0u64 into r31;
    assert.eq r31 true;
    get.or_use protocol_u64[1u8] 100u64 into r32;
    lte r32 10000u64 into r33;
    assert.eq r33 true;
    cast r19.outcome_count into r34 as u64;
    mul r30 r34 into r35;
    add r23.total_collateral r35 into r36;
    cast r19.outcome_count into r37 as u64;
    div r23.total_collateral r37 into r38;
    add r38 r30 into r39;
    add r39 r27 into r40;
    gt r36 0u64 into r41;
    assert.eq r41 true;
    cast r5 into r42 as u128;
    cast r40 into r43 as u128;
    cast r36 into r44 as u128;
    mul r42 r43 into r45;
    div r45 r44 into r46;
    cast r46 into r47 as u64;
    assert.eq true true;
    cast r47 into r48 as u128;
    cast r32 into r49 as u128;
    cast 10000u64 into r50 as u128;
    mul r48 r49 into r51;
    div r51 r50 into r52;
    cast r52 into r53 as u64;
    sub r47 r53 into r54;
    cast r53 r47 r54 into r55 as SellQuoteComputation;
    gt r55.gross_payout 0u64 into r56;
    assert.eq r56 true;
    gt r55.net_payout 0u64 into r57;
    assert.eq r57 true;
    gte r55.net_payout r6 into r58;
    assert.eq r58 true;
    gte r27 r55.gross_payout into r59;
    assert.eq r59 true;
    gte r23.total_collateral r55.gross_payout into r60;
    assert.eq r60 true;
    gte r23.total_shares r5 into r61;
    assert.eq r61 true;
    sub r27 r55.gross_payout into r62;
    sub r28 r5 into r63;
    set r62 into outcome_exposure[r26];
    set r63 into outcome_share_supply[r26];
    is.eq r2 0u8 into r64;
    ternary r64 r62 r23.total_outcome_0 into r65;
    is.eq r2 1u8 into r66;
    ternary r66 r62 r23.total_outcome_1 into r67;
    is.eq r2 2u8 into r68;
    ternary r68 r62 r23.total_outcome_2 into r69;
    is.eq r2 3u8 into r70;
    ternary r70 r62 r23.total_outcome_3 into r71;
    is.eq r2 4u8 into r72;
    ternary r72 r62 r23.total_outcome_4 into r73;
    is.eq r2 5u8 into r74;
    ternary r74 r62 r23.total_outcome_5 into r75;
    is.eq r2 6u8 into r76;
    ternary r76 r62 r23.total_outcome_6 into r77;
    is.eq r2 7u8 into r78;
    ternary r78 r62 r23.total_outcome_7 into r79;
    sub r23.total_collateral r55.gross_payout into r80;
    sub r23.total_shares r5 into r81;
    cast r65 r67 r69 r71 r73 r75 r77 r79 r23.participant_count r23.locked r80 r81 r23.lp_supply into r82 as PoolState;
    set r82 into pools[r1];
    get.or_use protocol_fees[0u8] 0u64 into r83;
    add r83 r55.fee into r84;
    set r84 into protocol_fees[0u8];
    gt r13.shares 0u64 into r85;
    assert.eq r85 true;
    cast r13.collateral_in into r86 as u128;
    cast r5 into r87 as u128;
    cast r13.shares into r88 as u128;
    mul r86 r87 into r89;
    div r89 r88 into r90;
    cast r90 into r91 as u64;
    sub r13.shares r5 into r92;
    sub r13.collateral_in r91 into r93;
    assert.eq r7 r92;
    assert.eq r8 r93;
    is.eq r92 0u64 into r94;
    cast r13.holder_commitment r13.market_id r13.outcome r92 r93 r13.token_id r94 into r95 as PositionState;
    set r95 into positions[r0];
    cast r55.net_payout r19.token_id into r96 as PayoutClaim;
    set r96 into pending_payouts[r9];

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
    cast r6 into r11 as field;
    add r11 r0 into r12;
    hash.bhp256 r12 into r13 as field;
    assert.eq r9.holder_commitment r13;
    assert.eq r9.market_id r1;
    assert.eq r9.outcome r2;
    assert.eq r9.shares r3;
    assert.eq r9.collateral_in r4;
    gt r9.shares 0u64 into r14;
    assert.eq r14 true;
    get markets[r1] into r15;
    assert.eq r15.is_resolved true;
    get pools[r1] into r16;
    is.eq r15.winning_outcome 255u8 into r17;
    cast r15.winning_outcome into r18 as field;
    add r1 r18 into r19;
    get.or_use outcome_share_supply[r19] 0u64 into r20;
    is.eq r2 r15.winning_outcome into r21;
    or r17 r21 into r22;
    assert.eq r22 true;
    gt r20 0u64 into r23;
    or r17 r23 into r24;
    assert.eq r24 true;
    ternary r17 1u64 r20 into r25;
    gt r25 0u64 into r26;
    assert.eq r26 true;
    cast r9.shares into r27 as u128;
    cast r16.total_collateral into r28 as u128;
    cast r25 into r29 as u128;
    mul r27 r28 into r30;
    div r30 r29 into r31;
    cast r31 into r32 as u64;
    ternary r17 r9.collateral_in r32 into r33;
    gt r33 0u64 into r34;
    assert.eq r34 true;
    cast r33 r15.token_id into r35 as PayoutClaim;
    set r35 into pending_payouts[r5];
    cast r9.holder_commitment r9.market_id r9.outcome 0u64 0u64 r9.token_id true into r36 as PositionState;
    set r36 into positions[r0];

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
