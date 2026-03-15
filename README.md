# VeilMarkets — Privacy-First Prediction Markets on Aleo

**VeilMarkets** is a **privacy-first decentralized prediction market platform** built on Aleo. Users can create markets, place bets, and claim winnings **without revealing their identity, chosen outcome, or wager amounts**, leveraging zero-knowledge proofs to guarantee fairness and correctness.

---

## Table of Contents

- [What it Does](#what-it-does)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## What it Does

VeilMarkets allows users to:

- Create **binary outcome prediction markets**
- Place **private bets** that are encrypted and verifiable
- Resolve markets using **trusted oracle input**
- Claim winnings privately via **zero-knowledge proofs**

Privacy is at the core of the platform: **no public order books, no visible wager amounts, no identity leaks**.

---

## Problem Statement

Traditional on-chain prediction markets expose sensitive data:

- Participant identities
- Bet amounts and chosen outcomes
- Market strategies and signals

This leads to **manipulation, MEV, exposure of high-value bettors, and friction for institutions**. VeilMarkets solves this by ensuring **all bets are private**, while still allowing **verifiable settlement**.

---

## Features

- Binary outcome markets (Yes/No) with V2 pari-mutuel logic
- Real-time **Pool Analytics**: Automated Yes/No ratios and implied probability
- Live **Participant Tracking**: Transparent on-chain engagement metrics
- **Timestamp-based Accuracy**: Precise market closing and resolution using absolute time (Unix timestamps)
- Private bet submission and encrypted storage
- Market resolution via oracle with zero-knowledge proofs
- Settlement and winnings claim with verifiable privacy
- **Aleo Credit Tracking**: Integrated balance display for shielded credits
- User dashboard (“My Bets”) showing joined market metadata and private history

---

## Tech Stack

- **Aleo** — Layer-1 blockchain with programmable privacy
- **Leo** — Aleo smart contract language for bet and settlement logic
- **React / Vite** — Frontend framework for premium UX
- **Supabase** — Off-chain metadata storage for rich market details
- **Tailwind CSS** — Modern, responsive UI design
- **TypeScript** — Type safety across the entire stack

---

## Architecture
## Frontend Integration (v5)

### Transaction Flow Changes
1. **Placing a Bet**:
   - Program: `veilmarkets_token_v5.aleo`
   - Transition: `place_bet`
   - **Returns**: `(credits.aleo/credits, EscrowedBet, Future)`
   - > [!IMPORTANT]
     > Ensure the frontend uses the first returned record (`credits`) for wallet balance and the second record (`EscrowedBet`) is stored/minted as the user's position!

2. **Resolving a Market**:
   - **Step 1**: Call `propose_resolution` (Oracle Contract).
   - **Step 2**: Wait for the challenge window to end (or a dispute/vote if challenged).
   - **Step 3**: Call `resolve_on_core` (Oracle Contract) to finalize.
   - **Enforced rule**:
     - `propose_resolution` writes a proposal into `proposals[market_id]` and sets `challenge_deadline`.
     - `resolve_on_core` must match that proposal:
     - If not disputed, it asserts `outcome == proposed_outcome` and only after the challenge window ends.
     - If disputed, it asserts `outcome == winning_outcome` computed from votes.
     - The proposal is not advisory — it is enforced on-chain during finalization.

### Troubleshooting
- **Error: 'Credits' expected 2 entries, found 5 entries**:
  - **Cause**: You are likely passing an `EscrowedBet` record from the token contract instead of a `credits.aleo/credits` record.
  - **Fix**: Check your wallet filtering logic. Ensure input records for `place_bet` or `register_oracle` are specifically from the `credits.aleo` program.

## Architecture Diagram (v5)
```mermaid
graph TD
    Factory[veilmarkets_factory_v5.aleo] --> Core[veilmarkets_v5.aleo]
    Factory --> Token[veilmarkets_token_v5.aleo]
    Factory --> Oracle[veilmarkets_oracle_v5.aleo]
    
    User[User Wallet] --> Token
    Token --> Core
    Core -.-> Pending[Pending Payouts]
    Oracle --> Core
    
    Frontend[Frontend App] --> Supabase[(Supabase Metadata)]
    Frontend --> Aleo[Aleo Network]
```

- **veilmarkets_factory_v5.aleo**: System registry and permission management.
- **veilmarkets_v5.aleo**: Core logic for market creation, pool accounting, and pro-rata winnings calculation.
- **veilmarkets_token_v5.aleo**: Integrated pari-mutuel escrow vault. Handles deposits, bet funding, and secure payouts.
- **veilmarkets_oracle_v5.aleo**: Optimistic resolution governance with challenge window and escalation.

## Lifecycle Flow (End-to-End)

1. **Create Market**: Core contract stores market metadata, close_time, and resolution_time (Unix timestamps).
2. **Place Bet**: Token contract escrows credits and calls core to update pool state.
3. **Propose Resolution**: Oracle proposes a binary outcome after `resolution_time`.
4. **Challenge Window**: Others can dispute; if disputed, oracle votes determine the winning outcome.
5. **Finalize**: `resolve_on_core` resolves the market on core and locks the pool.
6. **Claim Winnings**:
   - Step 1: User calls `claim_winnings` on core to compute payout and store `pending_payouts[nullifier]`.
   - Step 2: User calls `claim_payout` on token with `(payout_amount, nullifier)` to receive credits.
   - Step 3: Token contract calls core `verify_claim` to confirm the payout amount before transfer finalizes.

---

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/your-username/veilmarkets.git
cd veilmarkets
```

2. Install dependencies:

```bash
npm install
```

3. Setup Environment Variables:
Create a `.env` file in the root directory:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ALEO_NETWORK=testnet
```

4. Deploy contracts to Aleo Testnet (requires Aleo SDK):
```bash
# Order of deployment
# 1. veilmarkets_factory_v5, 2. veilmarkets_v5, 3. veilmarkets_token_v5, 4. veilmarkets_oracle_v5
cd leo/factory && leo deploy
# Repeat for each program in order (veilmarkets, veilmarkets_token, veilmarkets_oracle)
```

5. **Register Contracts in Factory** (CRITICAL):
After deployment, you must link the contracts in the Factory registry so they can communicate:
```bash
# 1. Register Token Contract
leo execute <factory_contract_address>/register_contract 1u8 <token_contract_address> --broadcast --network testnet
# 2. Register Oracle Contract
leo execute <factory_contract_address>/register_contract 2u8 <oracle_contract_address> --broadcast --network testnet
```

6. Run the frontend locally:
```bash
npm run dev
```

6. Open your browser at `http://localhost:5173` and interact with the UI.

---

## Contributing

We welcome contributions! Please:

- Fork the repo
- Create a feature branch
- Submit a pull request describing your changes
- Ensure privacy and zero-knowledge principles are preserved

---

## License

MIT
