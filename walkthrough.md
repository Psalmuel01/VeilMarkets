# VeilMarkets – Private Prediction Market on Aleo

## Overview

VeilMarkets is a privacy-focused prediction market built on Aleo.  
Users can create markets, place bets using shielded assets, and participate in a decentralized resolution process powered by oracles.

This guide covers:

- Connecting a wallet
- Creating markets (binary & non-binary)
- Placing bets
- Resolution flow
- Claiming rewards

---

## 1. Connect Wallet

- Connect your Aleo-compatible shielded wallet
- Ensure wallet has **on-chain history access** (required for private record proofs)
- Supported tokens:
  - **USDCx**
  - **USAD**

---

## 2. Create a Market

Navigate to **Create Market** and configure:

### Market Details

- **Title** – Clear, unambiguous question
- **Category** – e.g. Crypto, Sports, Politics
- **Type**:
  - Binary (Yes / No)
  - Non-binary (multiple outcomes)

---

### Non-Binary Markets

- Supports markets with more than two outcomes
- Example:
  - Ethereum
  - Solana
  - Base

---

### Market Configuration

- Define outcomes
- Set expiration date
- Choose token (**USDCx / USAD**)
- Specify settlement logic

---

### Confirm Creation

- Review inputs
- Confirm to deploy market

---

## 3. Place a Bet

- Navigate to **Markets**
- Select a market
- Choose an outcome
- Enter stake
- Confirm transaction

All bets are placed privately using shielded balances.

---

## 4. Market Lifecycle

Each market progresses through:

1. **Active** – Betting is open
2. **Expired** – Betting closed
3. **Proposed Resolution** – Oracle submits outcome
4. **Dispute Period** – Challenges allowed
5. **Finalized** – Outcome locked

---

## 5. Fast-Expiring Market Example

- Markets can be configured to expire quickly
- Useful for:
  - short-term predictions
  - live experimentation
  - rapid resolution flows

---

## 6. Resolution Process

### Propose Resolution

- After expiry, an oracle submits the outcome
- Requires staking credits
- **Penalty**: Incorrect proposals result in a **30 Credit slash** (minimum stake).
- **Winnings**: Successful oracles (proposers or disputers) earn **90% of the loser's stake/bond**.

---

### Confirm Proposal

- Proposal enters dispute window
- If undisputed → moves toward finalization

---

### Finalize Market

- Outcome is confirmed after dispute period
- Market becomes settled

---

## 7. Claim Rewards

- Navigate to resolved markets
- Claim winnings if prediction was correct
- Payouts in **USDCx / USAD**

---

## 8. Additional Notes

- **Non-binary markets** enable richer predictions
- **Private betting** hides user positions
- **Reserve markets** are admin-only

---

## Demo Video

https://loom.com/share/f0ac29e5d21a4dcdb8532b5c89381c00
