import veilmarkets_factory_v5.aleo;
import veilmarkets_v5.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program veilmarkets_token_usdcx_v5.aleo;

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
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    input r2 as field.public;
    input r3 as u8.public;
    input r4 as u64.public;
    cast r4 into r5 as u128;
    gte r0.amount r5 into r6;
    assert.eq r6 true;
    gte r4 1000000u64 into r7;
    assert.eq r7 true;
    is.eq r3 0u8 into r8;
    is.eq r3 1u8 into r9;
    or r8 r9 into r10;
    assert.eq r10 true;
    call test_usdcx_stablecoin.aleo/transfer_private_to_public veilmarkets_token_usdcx_v5.aleo r5 r0 r1 into r11 r12 r13;
    cast self.caller into r14 as field;
    add r14 r2 into r15;
    cast r4 into r16 as field;
    add r15 r16 into r17;
    hash.bhp256 r17 into r18 as field;
    call veilmarkets_v5.aleo/place_bet r2 r3 r4 r18 self.caller into r19;
    hash.bhp256 r18 into r20 as group;
    cast self.caller r2 r4 r3 r18 r20 into r21 as EscrowedBet.record;
    async place_bet r2 r3 r4 r18 self.caller r13 r19 into r22;
    output r11 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r12 as test_usdcx_stablecoin.aleo/Token.record;
    output r21 as EscrowedBet.record;
    output r22 as veilmarkets_token_usdcx_v5.aleo/place_bet.future;

finalize place_bet:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    input r4 as address.public;
    input r5 as test_usdcx_stablecoin.aleo/transfer_private_to_public.future;
    input r6 as veilmarkets_v5.aleo/place_bet.future;
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
    cast r0 into r2 as u128;
    call veilmarkets_v5.aleo/verify_claim r1 r0 into r3;
    call test_usdcx_stablecoin.aleo/transfer_public_to_private self.caller r2 into r4 r5 r6;
    async claim_payout r1 r6 r3 into r7;
    output r4 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r5 as test_usdcx_stablecoin.aleo/Token.record;
    output r7 as veilmarkets_token_usdcx_v5.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as field.public;
    input r1 as test_usdcx_stablecoin.aleo/transfer_public_to_private.future;
    input r2 as veilmarkets_v5.aleo/verify_claim.future;
    await r1;
    await r2;
    get.or_use spent_escrow[r0] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    set true into spent_escrow[r0];

function refund_bet:
    input r0 as field.public;
    input r1 as u64.public;
    cast r1 into r2 as u128;
    call test_usdcx_stablecoin.aleo/transfer_public_to_private self.caller r2 into r3 r4 r5;
    async refund_bet r0 r1 self.caller r5 into r6;
    output r3 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r4 as test_usdcx_stablecoin.aleo/Token.record;
    output r6 as veilmarkets_token_usdcx_v5.aleo/refund_bet.future;

finalize refund_bet:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    input r3 as test_usdcx_stablecoin.aleo/transfer_public_to_private.future;
    await r3;
    get escrow_details[r0] into r4;
    assert.eq r4.holder r2;
    assert.eq r4.amount r1;
    get.or_use spent_escrow[r0] false into r5;
    not r5 into r6;
    assert.eq r6 true;
    set true into spent_escrow[r0];
    get.or_use market_escrow[r4.market_id] 0u64 into r7;
    gte r7 r1 into r8;
    assert.eq r8 true;
    sub r7 r1 into r9;
    set r9 into market_escrow[r4.market_id];

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
