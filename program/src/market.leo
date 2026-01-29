// market.leo

import common::types;
import common::constants;

program market.aleo {

    // Public mapping of market_id → Market
    mapping markets: u64 => Market;

    // Create a new prediction market
    transition create_market(
        market_id: u64,
        close_time: u64
    ) -> Market {

        let market = Market {
            id: market_id,
            close_time,
            status: STATUS_OPEN,
            outcome: OUTCOME_NONE
        };

        markets.insert(market_id, market);
        return market;
    }

    // Close a market (no more bets)
    transition close_market(
        market_id: u64
    ) -> Market {

        let mut market = markets.get(market_id);
        assert(market.status == STATUS_OPEN);

        market.status = STATUS_CLOSED;
        markets.insert(market_id, market);

        return market;
    }

    // Settle a market with oracle outcome
    transition settle_market(
        market_id: u64,
        outcome: u8
    ) -> Market {

        let mut market = markets.get(market_id);
        assert(market.status == STATUS_CLOSED);
        assert(outcome == OUTCOME_YES || outcome == OUTCOME_NO);

        market.status = STATUS_SETTLED;
        market.outcome = outcome;

        markets.insert(market_id, market);
        return market;
    }
}
