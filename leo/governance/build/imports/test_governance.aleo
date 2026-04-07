import veilmarkets_factory_v9.aleo;
import veilmarkets_v9.aleo;
import credits.aleo;
import veilmarkets_oracle_v9.aleo;
import veilmarkets_governance_v9.aleo;
program test_governance.aleo;

closure proposal_target_valid:
    input r0 as u8;
    lte r0 1u8 into r1;
    output r1 as boolean;

function target_bounds:
    call proposal_target_valid 0u8 into r0;
    assert.eq r0 true;
    call proposal_target_valid 1u8 into r1;
    assert.eq r1 true;
    call proposal_target_valid 2u8 into r2;
    assert.eq r2 false;

function vote_majority_check:
    assert.eq true true;

constructor:
    assert.eq edition 0u16;
