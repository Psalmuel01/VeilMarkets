import merkle_tree.aleo;
import test_usad_multisig_core.aleo;
import test_usad_freezelist.aleo;
import test_usad_stablecoin.aleo;
import veilmarkets_factory_v12.aleo;
import veilmarkets_core_v12.aleo;
program veilmarkets_token_usad_v12.aleo;

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
    input r8 as field.private;
    cast r5 into r9 as u128;
    gte r0.amount r9 into r10;
    assert.eq r10 true;
    gte r5 1000000u64 into r11;
    assert.eq r11 true;
    gt r6 0u64 into r12;
    assert.eq r12 true;
    gt r7 0u64 into r13;
    assert.eq r13 true;
    lte r4 7u8 into r14;
    assert.eq r14 true;
    cast r1.siblings r1.leaf_index into r15 as test_usad_stablecoin.aleo/MerkleProof;
    cast r2.siblings r2.leaf_index into r16 as test_usad_stablecoin.aleo/MerkleProof;
    cast r15 r16 into r17 as [test_usad_stablecoin.aleo/MerkleProof; 2u32];
    call test_usad_stablecoin.aleo/transfer_private_to_public veilmarkets_token_usad_v12.aleo r9 r0 r17 into r18 r19 r20;
    cast self.signer into r21 as field;
    add r21 r3 into r22;
    cast r4 into r23 as field;
    add r22 r23 into r24;
    cast r5 into r25 as field;
    add r24 r25 into r26;
    add r26 r8 into r27;
    hash.bhp256 r27 into r28 as field;
    hash.bhp256 r28 into r29 as field;
    call veilmarkets_core_v12.aleo/buy_shares r3 r4 r5 r6 r7 r28 r29 into r30 r31;
    async buy_shares r20 r31 into r32;
    output r18 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r19 as test_usad_stablecoin.aleo/Token.record;
    output r30 as veilmarkets_core_v12.aleo/BetPosition.record;
    output r32 as veilmarkets_token_usad_v12.aleo/buy_shares.future;

finalize buy_shares:
    input r0 as test_usad_stablecoin.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v12.aleo/buy_shares.future;
    await r0;
    await r1;

function fund_pool:
    input r0 as test_usad_stablecoin.aleo/Token.record;
    input r1 as TokenMerkleProof.private;
    input r2 as TokenMerkleProof.private;
    input r3 as field.public;
    input r4 as u64.public;
    cast r4 into r5 as u128;
    gte r0.amount r5 into r6;
    assert.eq r6 true;
    gte r4 1000000u64 into r7;
    assert.eq r7 true;
    cast r1.siblings r1.leaf_index into r8 as test_usad_stablecoin.aleo/MerkleProof;
    cast r2.siblings r2.leaf_index into r9 as test_usad_stablecoin.aleo/MerkleProof;
    cast r8 r9 into r10 as [test_usad_stablecoin.aleo/MerkleProof; 2u32];
    call test_usad_stablecoin.aleo/transfer_private_to_public veilmarkets_token_usad_v12.aleo r5 r0 r10 into r11 r12 r13;
    cast self.signer into r14 as field;
    add r3 r14 into r15;
    hash.bhp256 r15 into r16 as field;
    call veilmarkets_core_v12.aleo/fund_pool r3 r4 r16 into r17;
    async fund_pool r13 r17 into r18;
    output r11 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r12 as test_usad_stablecoin.aleo/Token.record;
    output r18 as veilmarkets_token_usad_v12.aleo/fund_pool.future;

finalize fund_pool:
    input r0 as test_usad_stablecoin.aleo/transfer_private_to_public.future;
    input r1 as veilmarkets_core_v12.aleo/fund_pool.future;
    await r0;
    await r1;

function claim_payout:
    input r0 as u64.public;
    input r1 as field.public;
    cast r0 into r2 as u128;
    call veilmarkets_core_v12.aleo/verify_claim r1 r0 into r3;
    call test_usad_stablecoin.aleo/transfer_public_to_private self.caller r2 into r4 r5 r6;
    async claim_payout r3 r6 into r7;
    output r4 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r5 as test_usad_stablecoin.aleo/Token.record;
    output r7 as veilmarkets_token_usad_v12.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as veilmarkets_core_v12.aleo/verify_claim.future;
    input r1 as test_usad_stablecoin.aleo/transfer_public_to_private.future;
    await r0;
    await r1;

function withdraw_protocol_fees:
    input r0 as u64.public;
    input r1 as field.public;
    input r2 as address.public;
    cast r0 into r3 as u128;
    call veilmarkets_factory_v12.aleo/verify_is_registered 4u8 self.caller into r4;
    call veilmarkets_core_v12.aleo/authz_fee_withdrawal r0 r1 into r5;
    call test_usad_stablecoin.aleo/transfer_public_to_private r2 r3 into r6 r7 r8;
    async withdraw_protocol_fees r4 r5 r8 into r9;
    output r6 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r7 as test_usad_stablecoin.aleo/Token.record;
    output r9 as veilmarkets_token_usad_v12.aleo/withdraw_protocol_fees.future;

finalize withdraw_protocol_fees:
    input r0 as veilmarkets_factory_v12.aleo/verify_is_registered.future;
    input r1 as veilmarkets_core_v12.aleo/authz_fee_withdrawal.future;
    input r2 as test_usad_stablecoin.aleo/transfer_public_to_private.future;
    await r0;
    await r1;
    await r2;

constructor:
    assert.eq program_owner aleo1gg2c0sqseya4f68g6j9qmh455c0pft2m6pnd43rls72ac0pdsvzs5f3v6l;
