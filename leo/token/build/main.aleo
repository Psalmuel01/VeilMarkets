import veilmarkets_factory_v3.aleo;
import veilmarkets_v3.aleo;
import credits.aleo;
program veilmarkets_token_v3.aleo;

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

function verify_oracle_caller:
    call veilmarkets_factory_v3.aleo/verify_is_registered 2u8 self.caller into r0;
    async verify_oracle_caller r0 into r1;
    output r1 as veilmarkets_token_v3.aleo/verify_oracle_caller.future;

finalize verify_oracle_caller:
    input r0 as veilmarkets_factory_v3.aleo/verify_is_registered.future;
    await r0;

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
    call credits.aleo/transfer_private_to_public r0 veilmarkets_token_v3.aleo r3 into r9 r10;
    cast self.caller into r11 as field;
    add r11 r1 into r12;
    cast r3 into r13 as field;
    add r12 r13 into r14;
    hash.bhp256 r14 into r15 as field;
    call veilmarkets_v3.aleo/place_bet r1 r2 r3 r15 self.caller into r16;
    hash.bhp256 r15 into r17 as group;
    cast self.caller r1 r3 r2 r15 r17 into r18 as EscrowedBet.record;
    async place_bet r1 r2 r3 r15 self.caller r10 r16 into r19;
    output r9 as credits.aleo/credits.record;
    output r18 as EscrowedBet.record;
    output r19 as veilmarkets_token_v3.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as address.public;
    input r5 as credits.aleo/transfer_private_to_public.future;
    input r6 as veilmarkets_v3.aleo/place_bet.future;
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

function claim_payout:
    input r0 as u64.public;
    input r1 as field.public;
    call veilmarkets_v3.aleo/verify_claim r1 r0 into r2;
    call credits.aleo/transfer_public_to_private self.caller r0 into r3 r4;
    async claim_payout r1 r4 r2 into r5;
    output r3 as credits.aleo/credits.record;
    output r5 as veilmarkets_token_v3.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as field.public;
    input r1 as credits.aleo/transfer_public_to_private.future;
    input r2 as veilmarkets_v3.aleo/verify_claim.future;
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
    async refund_bet r0 r3 into r4;
    output r2 as credits.aleo/credits.record;
    output r4 as veilmarkets_token_v3.aleo/refund_bet.future;

finalize refund_bet:
    input r0 as field.public;
    input r1 as credits.aleo/transfer_public_to_private.future;
    await r1;
    set true into spent_escrow[r0];

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
