// VeilMarkets Token Contract
// Handles credit deposits, bet escrow, and payouts

program veilmarkets_token.aleo {
    
    // ============================================================================
    // RECORDS
    // ============================================================================
    
    record Credits {
        owner: address,
        amount: u64,
    }
    
    record EscrowedBet {
        owner: address,
        market_id: field,
        amount: u64,
        outcome: u8,
    }

    // ============================================================================
    // MAPPINGS
    // ============================================================================
    
    mapping market_escrow: field => u64;
    mapping platform_fees: u8 => u64;

    // ============================================================================
    // TRANSITIONS
    // ============================================================================

    // Deposit credits to place bet (lock in escrow)
    async transition deposit_for_bet(
        credits: Credits,
        public market_id: field,
        public outcome: u8,
        public bet_amount: u64,
    ) -> (Credits, EscrowedBet, Future) {
        assert(credits.amount >= bet_amount);
        
        let escrowed: EscrowedBet = EscrowedBet {
            owner: credits.owner,
            market_id: market_id,
            amount: bet_amount,
            outcome: outcome,
        };
        
        let change: Credits = Credits {
            owner: credits.owner,
            amount: credits.amount - bet_amount,
        };
        
        let f: Future = finalize_deposit_for_bet(market_id, bet_amount);
        return (change, escrowed, f);
    }

    async function finalize_deposit_for_bet(market_id: field, amount: u64) {
        let current_escrow: u64 = Mapping::get_or_use(market_escrow, market_id, 0u64);
        Mapping::set(market_escrow, market_id, current_escrow + amount);
    }

    // Claim payout after winning
    async transition claim_payout(
        escrowed: EscrowedBet,
        public market_id: field,
        public payout_amount: u64,
        public platform_fee_pct: u64,
    ) -> (Credits, Future) {
        assert_eq(escrowed.market_id, market_id);
        
        let fee: u64 = (payout_amount * platform_fee_pct) / 10000u64;
        let net_payout: u64 = payout_amount - fee;
        
        let payout: Credits = Credits {
            owner: escrowed.owner,
            amount: net_payout,
        };
        
        let f: Future = finalize_claim_payout(market_id, payout_amount, fee);
        return (payout, f);
    }

    async function finalize_claim_payout(market_id: field, payout_amount: u64, fee: u64) {
        let current_escrow: u64 = Mapping::get(market_escrow, market_id);
        Mapping::set(market_escrow, market_id, current_escrow - payout_amount);
        
        let total_fees: u64 = Mapping::get_or_use(platform_fees, 0u8, 0u64);
        Mapping::set(platform_fees, 0u8, total_fees + fee);
    }

    // Refund bet if market is cancelled
    async transition refund_bet(
        escrowed: EscrowedBet,
        public market_id: field,
    ) -> (Credits, Future) {
        assert_eq(escrowed.market_id, market_id);
        
        let refund: Credits = Credits {
            owner: escrowed.owner,
            amount: escrowed.amount,
        };
        
        let f: Future = finalize_refund_bet(market_id, escrowed.amount);
        return (refund, f);
    }

    async function finalize_refund_bet(market_id: field, amount: u64) {
        let current_escrow: u64 = Mapping::get(market_escrow, market_id);
        Mapping::set(market_escrow, market_id, current_escrow - amount);
    }

    // Combine multiple credit records
    transition combine_credits(
        credits1: Credits,
        credits2: Credits,
    ) -> Credits {
        assert_eq(credits1.owner, credits2.owner);
        
        return Credits {
            owner: credits1.owner,
            amount: credits1.amount + credits2.amount,
        };
    }

    // Split credits
    transition split_credits(
        credits: Credits,
        public split_amount: u64,
    ) -> (Credits, Credits) {
        assert(credits.amount >= split_amount);
        
        let split1: Credits = Credits {
            owner: credits.owner,
            amount: split_amount,
        };
        
        let split2: Credits = Credits {
            owner: credits.owner,
            amount: credits.amount - split_amount,
        };
        
        return (split1, split2);
    }
}
