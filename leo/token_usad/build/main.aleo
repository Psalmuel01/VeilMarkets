import veilmarkets_factory_v10.aleo;
import veilmarkets_core_v10.aleo;
import merkle_tree.aleo;
import test_usad_multisig_core.aleo;
import test_usad_freezelist.aleo;
import test_usad_stablecoin.aleo;
program veilmarkets_token_usad_v10.aleo;

struct TokenMerkleProof:
    siblings as [field; 16u32];
    leaf_index as u32;

function buy_shares:
    input r0 as test_usad_stablecoin.aleo/Token.record;
    input r1 as TokenMerkleProof.private;
    input r2 as TokenMerkleProof.private;
    input r3 as field.public;
    input r4 as u8.public;
    input r5 as u64.public;
    input r6 as u64.public;
    input r7 as u64.public;
    input r8 as u64.public;
    input r9 as field.public;
    cast r5 into r10 as u128;
    gte r0.amount r10 into r11;
    assert.eq r11 true;
    gte r5 1000000u64 into r12;
    assert.eq r12 true;
    gt r6 0u64 into r13;
    assert.eq r13 true;
    gt r7 0u64 into r14;
    assert.eq r14 true;
    gt r8 0u64 into r15;
    assert.eq r15 true;
    lte r4 31u8 into r16;
    assert.eq r16 true;
    cast r1.siblings r1.leaf_index into r17 as test_usad_stablecoin.aleo/MerkleProof;
    cast r2.siblings r2.leaf_index into r18 as test_usad_stablecoin.aleo/MerkleProof;
    cast r17 r18 into r19 as [test_usad_stablecoin.aleo/MerkleProof; 2u32];
    call test_usad_stablecoin.aleo/transfer_private_to_public veilmarkets_token_usad_v10.aleo r10 r0 r19 into r20 r21 r22;
    cast self.signer into r23 as field;
    add r23 r3 into r24;
    cast r4 into r25 as field;
    add r24 r25 into r26;
    cast r5 into r27 as field;
    add r26 r27 into r28;
    add r28 r9 into r29;
    hash.bhp256 r29 into r30 as field;
    cast self.signer into r31 as field;
    add r31 r30 into r32;
    hash.bhp256 r32 into r33 as field;
    call veilmarkets_core_v10.aleo/buy_shares r3 r4 r5 r6 r7 r8 r30 r33 into r34 r35;
    async buy_shares r22 r35 into r36;
    output r20 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r21 as test_usad_stablecoin.aleo/Token.record;
    output r34 as veilmarkets_core_v10.aleo/BetPosition.record;
    output r36 as veilmarkets_token_usad_v10.aleo/buy_shares.future;

finalize buy_shares:
    input r0 as test_usad_stablecoin.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v10.aleo/buy_shares.future;
    await r0;
    await r1;

function fund_pool:
    input r0 as test_usad_stablecoin.aleo/Token.record;
    input r1 as TokenMerkleProof.private;
    input r2 as TokenMerkleProof.private;
    input r3 as field.public;
    input r4 as u64.public;
    input r5 as field.public;
    cast r4 into r6 as u128;
    gte r0.amount r6 into r7;
    assert.eq r7 true;
    gte r4 1000000u64 into r8;
    assert.eq r8 true;
    cast r1.siblings r1.leaf_index into r9 as test_usad_stablecoin.aleo/MerkleProof;
    cast r2.siblings r2.leaf_index into r10 as test_usad_stablecoin.aleo/MerkleProof;
    cast r9 r10 into r11 as [test_usad_stablecoin.aleo/MerkleProof; 2u32];
    call test_usad_stablecoin.aleo/transfer_private_to_public veilmarkets_token_usad_v10.aleo r6 r0 r11 into r12 r13 r14;
    cast self.signer into r15 as field;
    add r15 r5 into r16;
    sub r16 r5 into r17;
    call veilmarkets_core_v10.aleo/fund_pool r3 r4 r17 into r18;
    async fund_pool r14 r18 into r19;
    output r12 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r13 as test_usad_stablecoin.aleo/Token.record;
    output r19 as veilmarkets_token_usad_v10.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as test_usad_stablecoin.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v10.aleo/fund_pool.future;
    await r0;
    await r1;

function claim_payout:
    input r0 as u64.public;
    input r1 as field.public;
    cast r0 into r2 as u128;
    call veilmarkets_core_v10.aleo/verify_claim r1 r0 into r3;
    call test_usad_stablecoin.aleo/transfer_public_to_private self.caller r2 into r4 r5 r6;
    async claim_payout r3 r6 into r7;
    output r4 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r5 as test_usad_stablecoin.aleo/Token.record;
    output r7 as veilmarkets_token_usad_v10.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as veilmarkets_core_v10.aleo/verify_claim.future;
    input r1 as test_usad_stablecoin.aleo/transfer_public_to_private.future;
    await r0;
    await r1;

function withdraw_protocol_fees:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as address.public;
    cast r0 into r3 as u128;
    call veilmarkets_factory_v10.aleo/verify_is_registered 4u8 self.caller into r4;
    call veilmarkets_core_v10.aleo/authz_fee_withdrawal r0 r1 into r5;
    call test_usad_stablecoin.aleo/transfer_public_to_private r2 r3 into r6 r7 r8;
    async withdraw_protocol_fees r4 r5 r8 into r9;
    output r6 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r7 as test_usad_stablecoin.aleo/Token.record;
    output r9 as veilmarkets_token_usad_v10.aleo/withdraw_protocol_fees.future;

finalize withdraw_protocol_fees:
    input r0 as veilmarkets_factory_v10.aleo/verify_is_registered.future;
    input r1 as veilmarkets_core_v10.aleo/authz_fee_withdrawal.future;
    input r2 as test_usad_stablecoin.aleo/transfer_public_to_private.future;
    await r0;
    await r1;
    await r2;

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
