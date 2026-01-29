// common/types.leo

struct Market {
    id: u64,
    close_time: u64,
    status: u8, // 0 = Open, 1 = Closed, 2 = Settled
    outcome: u8 // 0 = unset, 1 = Yes, 2 = No
}

record Bet {
    owner: address,
    market_id: u64,
    outcome: u8,   // 1 = Yes, 2 = No
    amount: u64
}
