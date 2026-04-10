import veilmarkets_factory_v10.aleo;
import veilmarkets_core_v10.aleo;
import credits.aleo;
program veilmarkets_token_credits_v10.aleo;

function buy_shares:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as u64.public;
    input r7 as field.public;
    gte r0.microcredits r3 into r8;
    assert.eq r8 true;
    gte r3 1000000u64 into r9;
    assert.eq r9 true;
    gt r4 0u64 into r10;
    assert.eq r10 true;
    gt r5 0u64 into r11;
    assert.eq r11 true;
    gt r6 0u64 into r12;
    assert.eq r12 true;
    lte r2 31u8 into r13;
    assert.eq r13 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v10.aleo r3 into r14 r15;
    cast self.signer into r16 as field;
    add r16 r1 into r17;
    cast r2 into r18 as field;
    add r17 r18 into r19;
    cast r3 into r20 as field;
    add r19 r20 into r21;
    add r21 r7 into r22;
    hash.bhp256 r22 into r23 as field;
    cast self.signer into r24 as field;
    add r24 r23 into r25;
    hash.bhp256 r25 into r26 as field;
    call veilmarkets_core_v10.aleo/buy_shares r1 r2 r3 r4 r5 r6 r23 r26 into r27 r28;
    async buy_shares r15 r28 into r29;
    output r14 as credits.aleo/credits.record;
    output r27 as veilmarkets_core_v10.aleo/BetPosition.record;
    output r29 as veilmarkets_token_credits_v10.aleo/buy_shares.future;

finalize buy_shares:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v10.aleo/buy_shares.future;
    await r0;
    await r1;

function fund_pool:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as field.public;
    gte r0.microcredits r2 into r4;
    assert.eq r4 true;
    gte r2 1000000u64 into r5;
    assert.eq r5 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v10.aleo r2 into r6 r7;
    cast self.signer into r8 as field;
    add r8 r3 into r9;
    sub r9 r3 into r10;
    call veilmarkets_core_v10.aleo/fund_pool r1 r2 r10 into r11;
    async fund_pool r7 r11 into r12;
    output r6 as credits.aleo/credits.record;
    output r12 as veilmarkets_token_credits_v10.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v10.aleo/fund_pool.future;
    await r0;
    await r1;

function claim_payout:
    input r0 as u64.public;
    input r1 as field.public;
    call veilmarkets_core_v10.aleo/verify_claim r1 r0 into r2;
    call credits.aleo/transfer_public_to_private self.caller r0 into r3 r4;
    async claim_payout r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_token_credits_v10.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as veilmarkets_core_v10.aleo/verify_claim.future;
    input r1 as credits.aleo/transfer_public_to_private.future;
    await r0;
    await r1;

function withdraw_protocol_fees:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as address.public;
    call veilmarkets_factory_v10.aleo/verify_is_registered 4u8 self.caller into r3;
    call veilmarkets_core_v10.aleo/authz_fee_withdrawal r0 r1 into r4;
    call credits.aleo/transfer_public_to_private r2 r0 into r5 r6;
    async withdraw_protocol_fees r3 r4 r6 into r7;
    output r5 as credits.aleo/credits.record;
    output r7 as veilmarkets_token_credits_v10.aleo/withdraw_protocol_fees.future;

finalize withdraw_protocol_fees:
    input r0 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
    input r1 as veilmarkets_core_v10.aleo/authz_fee_withdrawal.future;
    input r2 as credits.aleo/transfer_public_to_private.future;
    await r0;
    await r1;
    await r2;

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
