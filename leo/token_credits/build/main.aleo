import credits.aleo;
import veilmarkets_factory_v12.aleo;
import veilmarkets_core_v12.aleo;
program veilmarkets_token_credits_v12.aleo;

function buy_shares:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as field.private;
    gte r0.microcredits r3 into r7;
    assert.eq r7 true;
    gte r3 1000000u64 into r8;
    assert.eq r8 true;
    gt r4 0u64 into r9;
    assert.eq r9 true;
    gt r5 0u64 into r10;
    assert.eq r10 true;
    lte r2 7u8 into r11;
    assert.eq r11 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v12.aleo r3 into r12 r13;
    cast self.signer into r14 as field;
    add r14 r1 into r15;
    cast r2 into r16 as field;
    add r15 r16 into r17;
    cast r3 into r18 as field;
    add r17 r18 into r19;
    add r19 r6 into r20;
    hash.bhp256 r20 into r21 as field;
    hash.bhp256 r21 into r22 as field;
    call veilmarkets_core_v12.aleo/buy_shares r1 r2 r3 r4 r5 r21 r22 into r23 r24;
    async buy_shares r13 r24 into r25;
    output r12 as credits.aleo/credits.record;
    output r23 as veilmarkets_core_v12.aleo/BetPosition.record;
    output r25 as veilmarkets_token_credits_v12.aleo/buy_shares.future;

finalize buy_shares:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v12.aleo/buy_shares.future;
    await r0;
    await r1;

function fund_pool:
    input r0 as credits.aleo/credits.record;
    input r1 as field.public;
    input r2 as u64.public;
    gte r0.microcredits r2 into r3;
    assert.eq r3 true;
    gte r2 1000000u64 into r4;
    assert.eq r4 true;
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_credits_v12.aleo r2 into r5 r6;
    cast self.signer into r7 as field;
    add r1 r7 into r8;
    hash.bhp256 r8 into r9 as field;
    call veilmarkets_core_v12.aleo/fund_pool r1 r2 r9 into r10;
    async fund_pool r6 r10 into r11;
    output r5 as credits.aleo/credits.record;
    output r11 as veilmarkets_token_credits_v12.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v12.aleo/fund_pool.future;
    await r0;
    await r1;

function claim_payout:
    input r0 as u64.public;
    input r1 as field.public;
    call veilmarkets_core_v12.aleo/verify_claim r1 r0 into r2;
    call credits.aleo/transfer_public_to_private self.caller r0 into r3 r4;
    async claim_payout r2 r4 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_token_credits_v12.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as veilmarkets_core_v12.aleo/verify_claim.future;
    input r1 as credits.aleo/transfer_public_to_private.future;
    await r0;
    await r1;

function withdraw_protocol_fees:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as address.public;
    call veilmarkets_factory_v12.aleo/verify_is_registered 4u8 self.caller into r3;
    call veilmarkets_core_v12.aleo/authz_fee_withdrawal r0 r1 into r4;
    call credits.aleo/transfer_public_to_private r2 r0 into r5 r6;
    async withdraw_protocol_fees r3 r4 r6 into r7;
    output r5 as credits.aleo/credits.record;
    output r7 as veilmarkets_token_credits_v12.aleo/withdraw_protocol_fees.future;

finalize withdraw_protocol_fees:
    input r0 as veilmarkets_factory_v12.aleo/verify_is_registered.future;
    input r1 as veilmarkets_core_v12.aleo/authz_fee_withdrawal.future;
    input r2 as credits.aleo/transfer_public_to_private.future;
    await r0;
    await r1;
    await r2;

constructor:
    assert.eq program_owner aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
