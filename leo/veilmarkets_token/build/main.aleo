import veilmarkets_factory_v2.aleo;
import veilmarkets_v2.aleo;
program veilmarkets_token_v2.aleo;

record Credits:
    owner as address.private;
    amount as u64.private;
    nonce as group.private;

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

function faucet:
    input r0 as u64.public;
    lte r0 1000000000000u64 into r1;
    assert.eq r1 true;
    hash.bhp256 self.caller into r2 as group;
    cast self.caller r0 r2 into r3 as Credits.record;
    async faucet into r4;
    output r3 as Credits.record;
    output r4 as veilmarkets_token_v2.aleo/faucet.future;

finalize faucet:
    assert.eq true true;

function place_bet:
    input r0 as Credits.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    gte r0.amount r3 into r4;
    assert.eq r4 true;
    gte r3 1000000u64 into r5;
    assert.eq r5 true;
    is.eq r2 0u8 into r6;
    is.eq r2 1u8 into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    hash.bhp256 self.caller into r9 as field;
    add r9 r1 into r10;
    cast r3 into r11 as field;
    add r10 r11 into r12;
    cast r0.nonce into r13 as field;
    add r12 r13 into r14;
    hash.bhp256 r14 into r15 as field;
    hash.bhp256 r15 into r16 as group;
    cast self.caller r1 r3 r2 r15 r16 into r17 as EscrowedBet.record;
    sub r0.amount r3 into r18;
    sub r0.amount r3 into r19;
    hash.bhp256 r19 into r20 as group;
    cast self.caller r18 r20 into r21 as Credits.record;
    call veilmarkets_v2.aleo/place_bet r1 r2 r3 r15 self.caller into r22;
    async place_bet r1 r3 r15 self.caller r2 r22 into r23;
    output r21 as Credits.record;
    output r17 as EscrowedBet.record;
    output r23 as veilmarkets_token_v2.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as field.public;
    input r3 as address.public;
    input r4 as u8.public;
    input r5 as veilmarkets_v2.aleo/place_bet.future;
    get.or_use market_escrow[r0] 0u64 into r6;
    add r6 r1 into r7;
    set r7 into market_escrow[r0];
    cast r3 r0 r1 r4 r2 into r8 as EscrowInfo;
    set r8 into escrow_details[r2];
    await r5;

function claim_payout:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as field.public;
    call veilmarkets_v2.aleo/verify_claim r2 r1 into r3;
    async claim_payout r0 r1 self.caller r3 into r4;
    hash.bhp256 r2 into r5 as group;
    cast self.caller r1 r5 into r6 as Credits.record;
    output r6 as Credits.record;
    output r4 as veilmarkets_token_v2.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    input r3 as veilmarkets_v2.aleo/verify_claim.future;
    get.or_use spent_escrow[r0] false into r4;
    not r4 into r5;
    assert.eq r5 true;
    set true into spent_escrow[r0];
    get escrow_details[r0] into r6;
    assert.eq r6.holder r2;
    mul r1 100u64 into r7;
    div r7 10000u64 into r8;
    get market_escrow[r6.market_id] into r9;
    gte r9 r1 into r10;
    assert.eq r10 true;
    sub r9 r1 into r11;
    set r11 into market_escrow[r6.market_id];
    get.or_use platform_fees[0u8] 0u64 into r12;
    add r12 r8 into r13;
    set r13 into platform_fees[0u8];
    await r3;

function refund_bet:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    async refund_bet r1 r0 r2 self.caller into r3;
    hash.bhp256 r0 into r4 as group;
    cast self.caller r2 r4 into r5 as Credits.record;
    output r5 as Credits.record;
    output r3 as veilmarkets_token_v2.aleo/refund_bet.future;

finalize refund_bet:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as address.public;
    get escrow_details[r1] into r4;
    assert.eq r4.holder r3;
    assert.eq r4.market_id r0;
    assert.eq r4.amount r2;
    get.or_use spent_escrow[r1] false into r5;
    not r5 into r6;
    assert.eq r6 true;
    set true into spent_escrow[r1];
    get market_escrow[r0] into r7;
    sub r7 r2 into r8;
    set r8 into market_escrow[r0];

function withdraw_fees:
    input r0 as u64.public;
    async withdraw_fees r0 self.caller into r1;
    hash.bhp256 r0 into r2 as group;
    cast self.caller r0 r2 into r3 as Credits.record;
    output r3 as Credits.record;
    output r1 as veilmarkets_token_v2.aleo/withdraw_fees.future;

finalize withdraw_fees:
    input r0 as u64.public;
    input r1 as address.public;
    assert.eq r1 aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
    get platform_fees[0u8] into r2;
    gte r2 r0 into r3;
    assert.eq r3 true;
    sub r2 r0 into r4;
    set r4 into platform_fees[0u8];

function combine_credits:
    input r0 as Credits.record;
    input r1 as Credits.record;
    assert.eq r0.owner r1.owner;
    add r0.amount r1.amount into r2;
    add r0.amount r1.amount into r3;
    hash.bhp256 r3 into r4 as group;
    cast r0.owner r2 r4 into r5 as Credits.record;
    output r5 as Credits.record;

function split_credits:
    input r0 as Credits.record;
    input r1 as u64.private;
    gte r0.amount r1 into r2;
    assert.eq r2 true;
    hash.bhp256 r1 into r3 as group;
    cast r0.owner r1 r3 into r4 as Credits.record;
    sub r0.amount r1 into r5;
    sub r0.amount r1 into r6;
    hash.bhp256 r6 into r7 as group;
    cast r0.owner r5 r7 into r8 as Credits.record;
    output r4 as Credits.record;
    output r8 as Credits.record;

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
