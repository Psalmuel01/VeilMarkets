# VeilMarkets: Platform Flow & Technical Overview

Welcome to **VeilMarkets**, the first privacy-preserving prediction market platform built on Aleo. This guide explains how the platform works, from the zero-knowledge tech under the hood to how you earn rewards.

---

## 1. The Core Concept
VeilMarkets is a **Binary Prediction Market**. Every market has two outcomes: **YES** or **NO**. 
- You bet on the outcome you believe is true.
- If you're right, you win a portion of the "No" voters' stakes (if you voted Yes) and vice versa.
- All of this happens without anyone knowing *who* you are or *what* you bet on.

---

## 2. The Tech: Why Aleo?
Traditional platforms (like Polymarket) are public. Everyone can see your wallet, your bets, and your strategy. VeilMarkets uses **Zero-Knowledge Proofs (ZKP)** on Aleo to provide:
- **Private Bets**: Your chosen outcome (Yes/No) and wager amount are encrypted on-chain.
- **Shielded Balances**: Your "Credits" are private records that only you can see and spend.
- **Verifiable Settlement**: Even though bets are private, the math is public. The contract proves you won without revealing your specific bet to the public.

---

## 3. What is Shown vs. Hidden

| Feature | Status | Explanation |
| :--- | :--- | :--- |
| **Market Title/Desc** | **Public** | Stored in Supabase and matched to on-chain IDs. |
| **Total Pool Size** | **Public** | Visible so users know the liquidity/odds. |
| **Your Address** | **Hidden** | Transactions use Aleo's private state. |
| **Your Chosen Outcome** | **Hidden** | Stored as a private record (`BetPosition`). |
| **Your Wager Amount** | **Hidden** | Only the total pool increments publicly. |

---

## 4. The Market Lifecycle

### Step 1: Creation
A creator sets a title, category, and two blocks:
1. **Closing Block**: When betting stops.
2. **Resolution Block**: The earliest an oracle can resolve the market.

### Step 2: Placing a Bet
When you place a bet:
1. Your **Credits** record is spent.
2. You receive a **BetPosition** record (private to you).
3. The platform's **Escrow** mapping increases by your wager amount.

### Step 3: Resolution (Oracles)
For now, the platform uses a **Multi-Oracle System**:
- **Proposals**: An authorized oracle proposes the outcome (Yes or No).
- **Voting**: Other oracles must vote to confirm the result (Fixed 2/3 threshold).
- **Finalization**: Once the "Dispute Period" passes without a challenge, the result is locked into the Core contract.

### Step 4: Claiming Winnings
If you won:
1. You submit your private **BetPosition** to the contract.
2. The contract generates a **Nullifier** (to prevent you from claiming twice).
3. The contract verifies the math: `(Your Bet * Total Pool) / Winning Pool Size`.
4. You receive a new **Credits** record with your winnings + original stake.

---

## 5. How Rewards are Calculated
VeilMarkets uses **Pari-mutuel pricing**. This means there are no fixed odds; the payout depends on how much everyone else bet.

**Formula:**
`Payout = (Your Wager * Total Combined Pool) / Total Wagers on Winning Side`

*Example:*
- Total Yes: 100 Credits
- Total No: 300 Credits
- Total Pool: 400 Credits
- If **Yes** wins, a 10 Credit bettor gets: `(10 * 400) / 100 = 40 Credits`.

---

## 6. Current Limitations (Alpha)
- **Oracles**: Currently, the system relies on a set of trusted oracle addresses. In the future, this will be fully decentralized.
- **Disputes**: If an oracle lies, a dispute can be filed, but this currently requires a manual review by the admin/DAO.
- **Fees**: A small 1% fee is collected on winnings to maintain the platform and reward oracles.

---

**Privacy is a right, not a feature.** Welcome to the future of prediction.
