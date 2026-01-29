// settlement.leo

import common::types::*;
import common::constants::*;

program settlement.aleo {

    // Claim winnings for a settled bet
    transition claim_winnings(
        bet: Bet,
        market_outcome: u8
    ) -> u64 {

        // Ensure bet owner is caller
        assert(bet.owner == caller);

        // Ensure valid outcome
        assert(market_outcome == OUTCOME_YES || market_outcome == OUTCOME_NO);

        // Check if bet won
        if bet.outcome == market_outcome {
            // Simple 1x payout for MVP
            return bet.amount * 2u64;
        } else {
            return 0u64;
        }
    }
}
