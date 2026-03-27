
# VeilMarkets – Technical Architecture

## Overview

VeilMarkets is a private prediction market built on Aleo.

The core idea is simple:
> Users can prove a valid bet exists **without revealing the bet itself**.

This means:
- Bet **amounts**, **positions**, and **identities** remain private  
- Market **outcomes** and **aggregate liquidity** remain public and verifiable  

---

## Problem

Traditional prediction markets on transparent blockchains (e.g. Ethereum) expose:
- User wallet addresses  
- Bet sizes  
- Selected outcomes  

This leads to:
- Front-running  
- Copy trading  
- Social bias  

VeilMarkets removes these issues by:
- Keeping individual bets private  
- Exposing only aggregated pool data  
- Maintaining verifiable outcomes  

---

## System Architecture

The system is composed of **five contracts**, each with a single responsibility.

### 1. Factory (Registry)

- Maintains registry of trusted contracts:
```address => u8 (type)```

- `1 = Token Adapter`
- `2 = Oracle`
- `3 = Core`

- Provides:
- `verify_is_registered(type, address)`

- Responsibilities:
- Access control for cross-contract calls  
- Extensibility (new adapters/oracles can be added without redeploying core)

- Notes:
- Only contract requiring admin privileges  

---

### 2. Core (Market Engine)

The **source of truth** for all markets.

#### Stores:
- `MarketInfo`
- creator  
- timing  
- token adapter  
- outcome count  
- resolution state  

- `PoolState`
- total stake per outcome  

- `Claims / Nullifiers`
- prevents double claims  

#### Responsibilities:
- Register bets  
- Track liquidity pools  
- Handle payout authorization  
- Finalize market resolution  

> Core never holds funds. It only tracks state and validates logic.

---

### 3. Token Adapters (Escrow Layer)

One adapter per token (e.g. USDCx, USDA).

#### Responsibilities:
- Escrow user funds  
- Release payouts  
- Interface with token contracts  

#### Key Properties:
- Core does not know token logic  
- Adapters abstract token behavior  
- Enables multi-token support  

---

### 4. Oracle (Resolution Engine)

Handles market resolution via an **optimistic mechanism**.

#### Flow:
1. Oracle proposes outcome (with stake)  
2. Dispute window opens  
3. If disputed:
 - Other oracles vote (stake-weighted)  
4. Final outcome is submitted to Core  

#### Responsibilities:
- Resolve markets  
- Manage disputes  
- Maintain integrity of outcomes  

---

### 5. Stablecoin Layer (USDCx / USDA)

- Private token records  
- Require **Merkle proof compliance checks**  
- Enforce restrictions (e.g. freeze lists)

---

## Key Interaction Flows

### 1. Placing a Bet

```

User
→ token_adapter.place_bet(...)
→ stablecoin.transfer_private_to_public(...)
→ core.place_bet(...)
→ factory.verify_is_registered(...)
→ update pool state
→ returns EscrowedBet (private)

```

#### Notes:
- Funds are escrowed in adapter  
- Core records only the bet metadata  
- User receives a **private bet record**

---

### 2. Claiming Winnings

#### Step 1 – Request Claim (Core)

```

User
→ core.claim_winnings(BetPosition)
→ writes payout to pending_payouts[nullifier]
→ returns WinningsClaim

```

#### Step 2 – Execute Payout (Adapter)

```

User
→ token_adapter.claim_payout(amount, nullifier)
→ core.verify_claim(...)
→ validates amount
→ clears nullifier
→ stablecoin.transfer_public_to_private(...)

```

#### Why this design matters:
- Prevents users from faking payout amounts  
- Core defines payout  
- Adapter executes payout  

---

## Privacy Model

### Private Data
- Bet positions  
- Bet amounts  
- User identity  

Stored as **encrypted Aleo records**:
- `EscrowedBet`
- `BetPosition`

### Public Data
- Total liquidity per outcome  
- Final market result  

### Double-Spend Protection
- Uses **nullifiers**
- Prevents multiple claims without revealing identity  

---

## Compliance Layer (Stablecoins)

Stablecoins enforce rules via ZK proofs:

- Users must prove:
  - They are not on a restricted list  

- Implemented via:
```

MerkleProof[2]

```

- Important:
- This is enforced by the token  
- VeilMarkets simply passes the proof through  

---

## Data Architecture (On-chain vs Off-chain)

### On-chain
- Market state  
- Pool totals  
- Resolution data  
- `title_hash`

### Off-chain (Supabase)
- Market title  
- Outcome labels  
- Categories  

### Flow:
1. Frontend hashes market title → `title_hash`  
2. Hash stored on-chain  
3. Full metadata stored off-chain  
4. UI joins using hash  

### Benefits:
- Lower on-chain storage cost  
- Data integrity preserved  
- Immutable linkage between UI and contract state  

---

## Design Principles

- **Privacy-first**: Individual positions are never exposed  
- **Modular**: Contracts are decoupled and upgradeable  
- **Trust-minimized**: Core enforces all critical logic  
- **Extensible**: New tokens and oracles can be added via Factory  
```

