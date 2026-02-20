program veilmarkets_token.aleo;

record Credits:
    owner as address.private;
    amount as u64.private;

record EscrowedBet:
    owner as address.private;
    market_id as field.private;
    amount as u64.private;
    outcome as u8.private;

mapping market_escrow:
    key as field.public;
    value as u64.public;

mapping platform_fees:
    key as u8.public;
    value as u64.public;

function faucet:
    input r0 as u64.public;
    cast self.caller r0 into r1 as Credits.record;
    output r1 as Credits.record;

function deposit_for_bet:
    input r0 as Credits.record;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u64.public;
    gte r0.amount r3 into r4;
    assert.eq r4 true;
    cast r0.owner r1 r3 r2 into r5 as EscrowedBet.record;
    sub r0.amount r3 into r6;
    cast r0.owner r6 into r7 as Credits.record;
    async deposit_for_bet r1 r3 into r8;
    output r7 as Credits.record;
    output r5 as EscrowedBet.record;
    output r8 as veilmarkets_token.aleo/deposit_for_bet.future;

finalize deposit_for_bet:
    input r0 as field.public;
    input r1 as u64.public;
    get.or_use market_escrow[r0] 0u64 into r2;
    add r2 r1 into r3;
    set r3 into market_escrow[r0];

function claim_payout:
    input r0 as EscrowedBet.record;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as u64.public;
    assert.eq r0.market_id r1;
    mul r2 r3 into r4;
    div r4 10000u64 into r5;
    sub r2 r5 into r6;
    cast r0.owner r6 into r7 as Credits.record;
    async claim_payout r1 r2 r5 into r8;
    output r7 as Credits.record;
    output r8 as veilmarkets_token.aleo/claim_payout.future;

finalize claim_payout:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as u64.public;
    get market_escrow[r0] into r3;
    sub r3 r1 into r4;
    set r4 into market_escrow[r0];
    get.or_use platform_fees[0u8] 0u64 into r5;
    add r5 r2 into r6;
    set r6 into platform_fees[0u8];

function refund_bet:
    input r0 as EscrowedBet.record;
    input r1 as field.public;
    assert.eq r0.market_id r1;
    cast r0.owner r0.amount into r2 as Credits.record;
    async refund_bet r1 r0.amount into r3;
    output r2 as Credits.record;
    output r3 as veilmarkets_token.aleo/refund_bet.future;

finalize refund_bet:
    input r0 as field.public;
    input r1 as u64.public;
    get market_escrow[r0] into r2;
    sub r2 r1 into r3;
    set r3 into market_escrow[r0];

function combine_credits:
    input r0 as Credits.record;
    input r1 as Credits.record;
    assert.eq r0.owner r1.owner;
    add r0.amount r1.amount into r2;
    cast r0.owner r2 into r3 as Credits.record;
    output r3 as Credits.record;

function split_credits:
    input r0 as Credits.record;
    input r1 as u64.public;
    gte r0.amount r1 into r2;
    assert.eq r2 true;
    cast r0.owner r1 into r3 as Credits.record;
    sub r0.amount r1 into r4;
    cast r0.owner r4 into r5 as Credits.record;
    output r3 as Credits.record;
    output r5 as Credits.record;

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
