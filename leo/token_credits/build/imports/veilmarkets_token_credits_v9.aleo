import veilmarkets_factory_v9.aleo;
import veilmarkets_v9.aleo;
import credits.aleo;
program veilmarkets_token_credits_v9.aleo;

record EscrowedBet:
    owner as address.private;
    market_id as field.private;
    amount as u64.private;
    outcome as u8.private;
    escrow_id as field.private;
    nonce as group.private;

struct EscrowInfo:
    holder_commitment as field;
    market_id as field;
    amount as u64;
    outcome as u8;
    escrow_id as field;

mapping market_escrow:
    key as field.public;
    value as u64.public;

mapping escrow_details:
    key as field.public;
    value as EscrowInfo.public;

mapping spent_escrow:
    key as field.public;
    value as boolean.public;

mapping platform_fees:
    key as u8.public;
    value as u64.public;

function place_bet:
    input r0 as credits.aleo/credits.record;
    input r1 as field.private;
    input r2 as u8.private;
    input r3 as u64.private;
    input r4 as field.private;
    gte r0.microcredits r3 into r5;
    assert.eq r5 true;
    gte r3 1000000u64 into r6;
    assert.eq r6 true;
    lte r2 31u8 into r7;
    assert.eq r7 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v9.aleo r3 into r8 r9;
    cast self.caller into r10 as field;
    add r10 r1 into r11;
    cast r2 into r12 as field;
    add r11 r12 into r13;
    cast r3 into r14 as field;
    add r13 r14 into r15;
    add r15 r4 into r16;
    hash.bhp256 r16 into r17 as field;
    cast self.caller into r18 as field;
    add r18 r17 into r19;
    hash.bhp256 r19 into r20 as field;
    call veilmarkets_v9.aleo/place_bet r1 r2 r3 r17 r20 into r21;
    hash.bhp256 r17 into r22 as group;
    cast self.signer r1 r3 r2 r17 r22 into r23 as EscrowedBet.record;
    async place_bet r1 r2 r3 r17 r20 r9 r21 into r24;
    output r8 as credits.aleo/credits.record;
    output r23 as EscrowedBet.record;
    output r24 as veilmarkets_token_credits_v9.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as credits.aleo/transfer_private_to_public.future;
    input r6 as veilmarkets_v9.aleo/place_bet.future;
    await r5;
    await r6;
    contains escrow_details[r3] into r7;
    not r7 into r8;
    assert.eq r8 true;
    cast r4 r0 r2 r1 r3 into r9 as EscrowInfo;
    set r9 into escrow_details[r3];
    get.or_use market_escrow[r0] 0u64 into r10;
    add r10 r2 into r11;
    set r11 into market_escrow[r0];

function buy_shares:
    input r0 as credits.aleo/credits.record;
    input r1 as field.private;
    input r2 as u8.private;
    input r3 as u64.private;
    input r4 as u64.private;
    input r5 as field.private;
    gte r0.microcredits r3 into r6;
    assert.eq r6 true;
    gte r3 1000000u64 into r7;
    assert.eq r7 true;
    gt r4 0u64 into r8;
    assert.eq r8 true;
    lte r2 31u8 into r9;
    assert.eq r9 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v9.aleo r3 into r10 r11;
    cast self.caller into r12 as field;
    add r12 r1 into r13;
    cast r2 into r14 as field;
    add r13 r14 into r15;
    cast r3 into r16 as field;
    add r15 r16 into r17;
    add r17 r5 into r18;
    hash.bhp256 r18 into r19 as field;
    cast self.caller into r20 as field;
    add r20 r19 into r21;
    hash.bhp256 r21 into r22 as field;
    call veilmarkets_v9.aleo/buy_shares r1 r2 r3 r4 r19 r22 into r23;
    hash.bhp256 r19 into r24 as group;
    cast self.signer r1 r3 r2 r19 r24 into r25 as EscrowedBet.record;
    async buy_shares r1 r2 r3 r19 r22 r11 r23 into r26;
    output r10 as credits.aleo/credits.record;
    output r25 as EscrowedBet.record;
    output r26 as veilmarkets_token_credits_v9.aleo/buy_shares.future;

finalize buy_shares:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as credits.aleo/transfer_private_to_public.future;
    input r6 as veilmarkets_v9.aleo/buy_shares.future;
    await r5;
    await r6;
    contains escrow_details[r3] into r7;
    not r7 into r8;
    assert.eq r8 true;
    cast r4 r0 r2 r1 r3 into r9 as EscrowInfo;
    set r9 into escrow_details[r3];
    get.or_use market_escrow[r0] 0u64 into r10;
    add r10 r2 into r11;
    set r11 into market_escrow[r0];

function fund_pool:
    input r0 as credits.aleo/credits.record;
    input r1 as field.private;
    input r2 as u64.private;
    input r3 as field.private;
    gte r0.microcredits r2 into r4;
    assert.eq r4 true;
    gte r2 1000000u64 into r5;
    assert.eq r5 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v9.aleo r2 into r6 r7;
    cast self.caller into r8 as field;
    add r8 r1 into r9;
    cast r2 into r10 as field;
    add r9 r10 into r11;
    add r11 r3 into r12;
    hash.bhp256 r12 into r13 as field;
    cast self.caller into r14 as field;
    add r14 r13 into r15;
    hash.bhp256 r15 into r16 as field;
    call veilmarkets_v9.aleo/fund_pool r1 r2 r13 r16 into r17;
    async fund_pool r1 r2 r7 r17 into r18;
    output r6 as credits.aleo/credits.record;
    output r18 as veilmarkets_token_credits_v9.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as credits.aleo/transfer_private_to_public.future;
    input r3 as veilmarkets_v9.aleo/fund_pool.future;
    await r2;
    await r3;
    get.or_use market_escrow[r0] 0u64 into r4;
    add r4 r1 into r5;
    set r5 into market_escrow[r0];

function claim_payout:
    input r0 as u64.public;
    input r1 as field.public;
    call veilmarkets_v9.aleo/verify_claim r1 r0 into r2;
    call credits.aleo/transfer_public_to_private self.caller r0 into r3 r4;
    async claim_payout r1 r4 r2 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_token_credits_v9.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as field.public;
    input r1 as credits.aleo/transfer_public_to_private.future;
    input r2 as veilmarkets_v9.aleo/verify_claim.future;
    await r1;
    await r2;
    get.or_use spent_escrow[r0] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    set true into spent_escrow[r0];

function refund_bet:
    input r0 as field.public;
    input r1 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r1 into r2 r3;
    async refund_bet r0 r1 self.caller r3 into r4;
    output r2 as credits.aleo/credits.record;
    output r4 as veilmarkets_token_credits_v9.aleo/refund_bet.future;

finalize refund_bet:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    input r3 as credits.aleo/transfer_public_to_private.future;
    await r3;
    get escrow_details[r0] into r4;
    cast r2 into r5 as field;
    add r5 r0 into r6;
    hash.bhp256 r6 into r7 as field;
    assert.eq r4.holder_commitment r7;
    assert.eq r4.amount r1;
    get.or_use spent_escrow[r0] false into r8;
    not r8 into r9;
    assert.eq r9 true;
    set true into spent_escrow[r0];
    get.or_use market_escrow[r4.market_id] 0u64 into r10;
    gte r10 r1 into r11;
    assert.eq r11 true;
    sub r10 r1 into r12;
    set r12 into market_escrow[r4.market_id];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
