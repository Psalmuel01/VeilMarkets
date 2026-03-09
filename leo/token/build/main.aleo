import veilmarkets_factory_v2.aleo;
import veilmarkets_v2.aleo;
import credits.aleo;
program veilmarkets_token_v2.aleo;

record EscrowedBet:
    owner as address.private;
    market_id as field.private;
    amount as u64.private;
    outcome as u8.private;
    escrow_id as field.private;
    nonce as group.private;

struct EscrowInfo:
    holder as address;
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
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    gte r0.microcredits r3 into r4;
    assert.eq r4 true;
    gte r3 1000000u64 into r5;
    assert.eq r5 true;
    is.eq r2 0u8 into r6;
    is.eq r2 1u8 into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_v2.aleo r3 into r9 r10;
    cast r0.owner into r11 as field;
    add r11 r1 into r12;
    cast r3 into r13 as field;
    add r12 r13 into r14;
    hash.bhp256 r14 into r15 as field;
    hash.bhp256 r15 into r16 as group;
    cast self.caller r1 r3 r2 r15 r16 into r17 as EscrowedBet.record;
    call veilmarkets_v2.aleo/place_bet r1 r2 r3 r15 self.caller into r18;
    async place_bet r1 r3 r15 self.caller r2 r10 r18 into r19;
    output r9 as credits.aleo/credits.record;
    output r17 as EscrowedBet.record;
    output r19 as veilmarkets_token_v2.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as field.public;
    input r3 as address.public;
    input r4 as u8.public;
    input r5 as credits.aleo/transfer_private_to_public.future;
    input r6 as veilmarkets_v2.aleo/place_bet.future;
    await r5;
    await r6;
    get.or_use market_escrow[r0] 0u64 into r7;
    add r7 r1 into r8;
    set r8 into market_escrow[r0];
    cast r3 r0 r1 r4 r2 into r9 as EscrowInfo;
    set r9 into escrow_details[r2];

function claim_payout:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as field.public;
    call veilmarkets_v2.aleo/verify_claim r2 r1 into r3;
    mul r1 100u64 into r4;
    div r4 10000u64 into r5;
    sub r1 r5 into r6;
    call credits.aleo/transfer_public_to_private self.caller r6 into r7 r8;
    async claim_payout r0 r1 r5 self.caller r3 r8 into r9;
    output r7 as credits.aleo/credits.record;
    output r9 as veilmarkets_token_v2.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as address.public;
    input r4 as veilmarkets_v2.aleo/verify_claim.future;
    input r5 as credits.aleo/transfer_public_to_private.future;
    await r4;
    await r5;
    get.or_use spent_escrow[r0] false into r6;
    not r6 into r7;
    assert.eq r7 true;
    set true into spent_escrow[r0];
    get escrow_details[r0] into r8;
    assert.eq r8.holder r3;
    get market_escrow[r8.market_id] into r9;
    gte r9 r1 into r10;
    assert.eq r10 true;
    sub r9 r1 into r11;
    set r11 into market_escrow[r8.market_id];
    get.or_use platform_fees[0u8] 0u64 into r12;
    add r12 r2 into r13;
    set r13 into platform_fees[0u8];

function refund_bet:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r2 into r3 r4;
    async refund_bet r1 r0 r2 self.caller r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_token_v2.aleo/refund_bet.future;

finalize refund_bet:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as address.public;
    input r4 as credits.aleo/transfer_public_to_private.future;
    await r4;
    get escrow_details[r1] into r5;
    assert.eq r5.holder r3;
    assert.eq r5.market_id r0;
    assert.eq r5.amount r2;
    get.or_use spent_escrow[r1] false into r6;
    not r6 into r7;
    assert.eq r7 true;
    set true into spent_escrow[r1];
    get market_escrow[r0] into r8;
    sub r8 r2 into r9;
    set r9 into market_escrow[r0];

function withdraw_fees:
    input r0 as u64.public;
    call credits.aleo/transfer_public_to_private self.caller r0 into r1 r2;
    async withdraw_fees r0 self.caller r2 into r3;
    output r1 as credits.aleo/credits.record;
    output r3 as veilmarkets_token_v2.aleo/withdraw_fees.future;

finalize withdraw_fees:
    input r0 as u64.public;
    input r1 as address.public;
    input r2 as credits.aleo/transfer_public_to_private.future;
    await r2;
    assert.eq r1 aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
    get platform_fees[0u8] into r3;
    gte r3 r0 into r4;
    assert.eq r4 true;
    sub r3 r0 into r5;
    set r5 into platform_fees[0u8];

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
