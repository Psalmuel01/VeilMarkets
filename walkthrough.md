# VeilMarkets – Private Prediction Market on Aleo

## Overview

![Overview](https://loom.com/i/450dc37247594b3b9707a768f812f818?workflows_screenshot=true)

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

![Connect Wallet](https://loom.com/i/2024a227acb948a7b037a68fb7a58b9a?workflows_screenshot=true)

- Connect your Aleo-compatible shielded wallet
- Ensure wallet has **on-chain history access** (required for private record proofs)
- Supported tokens:
  - **USDCx**
  - **USAD**

---

## 2. Create a Market

![Create Market](https://loom.com/i/94cfd5d8388f4d6aa340f1eef30cb12b?workflows_screenshot=true)

Navigate to **Create Market** and configure:

### Market Details

- **Title** – Clear, unambiguous question
- **Category** – e.g. Crypto, Sports, Politics
- **Type**:
  - Binary (Yes / No)
  - Non-binary (multiple outcomes)

---

### Non-Binary Markets

![Non Binary](https://loom.com/i/c93543cd1617468bb7653fb112491634?workflows_screenshot=true)

- Supports markets with more than two outcomes
- Example:
  - Ethereum
  - Solana
  - Base

---

### Market Configuration

![Market Config](https://loom.com/i/ab97449d3c774b25b7cd80a56094da25?workflows_screenshot=true)

- Define outcomes
- Set expiration date
- Choose token (**USDCx / USAD**)
- Specify settlement logic

---

### Confirm Creation

![Confirm Market](https://loom.com/i/4108384bd84d4aab94ac771add381675?workflows_screenshot=true)

- Review inputs
- Confirm to deploy market

---

## 3. Place a Bet

![Place Bet](https://loom.com/i/abb13d3f74d0451b87e5e6a39aa007a2?workflows_screenshot=true)

- Navigate to **Markets**
- Select a market
- Choose an outcome
- Enter stake
- Confirm transaction

All bets are placed privately using shielded balances.

---

## 4. Market Lifecycle

![Lifecycle](https://loom.com/i/5c561b3c468341d0bfb09f7bd6528105?workflows_screenshot=true)

Each market progresses through:

1. **Active** – Betting is open
2. **Expired** – Betting closed
3. **Proposed Resolution** – Oracle submits outcome
4. **Dispute Period** – Challenges allowed
5. **Finalized** – Outcome locked

---

## 5. Fast-Expiring Market Example

![Expiring Market](https://loom.com/i/4e5c0020767343c3b1ab2bc66049145e?workflows_screenshot=true)

- Markets can be configured to expire quickly
- Useful for:
  - short-term predictions
  - live experimentation
  - rapid resolution flows

---

## 6. Resolution Process

### Propose Resolution

![Propose Resolution](https://loom.com/i/07bb4e5811d54c59b76fe39415913497?workflows_screenshot=true)

- After expiry, an oracle submits the outcome
- Requires staking credits

---

### Confirm Proposal

![Confirm Proposal](https://loom.com/i/d1ba5752ecf647fdade2b6b900cec140?workflows_screenshot=true)

- Proposal enters dispute window
- If undisputed → moves toward finalization

---

### Finalize Market

![Finalize](https://loom.com/i/c4b4d665ec7c4cc0a917865a760f6fad?workflows_screenshot=true)

- Outcome is confirmed after dispute period
- Market becomes settled

---

## 7. Claim Rewards

![Claim Rewards](https://loom.com/i/499164c4ca034b1084a15409c282369e?workflows_screenshot=true)

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
