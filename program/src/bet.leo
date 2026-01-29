// bet.leo

import common::types::*;
import common::constants::*;

program bet.aleo {

    // Place a private bet
    transition place_bet(
        bettor: address,
        market_id: u64,
        outcome: u8,
        amount: u64
    ) -> Bet {

        assert(outcome == OUTCOME_YES || outcome == OUTCOME_NO);
        assert(amount > 0u64);

        let bet = Bet {
            owner: bettor,
            market_id,
            outcome,
            amount
        };

        // Returned as a PRIVATE record
        return bet;
    }
}
