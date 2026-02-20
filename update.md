# Submission Requirements

### 1. Project Overview
**Name**: VeilMarkets  
**Description**: A decentralized, private binary prediction market platform built on the Aleo blockchain.  
**Problem Being Solved**: Traditional prediction markets leak user preferences, wager amounts, and identities publicly. VeilMarkets leverages Zero-Knowledge Proofs (ZKPs) to allow users to participate in markets while keeping their positions and wallet activities entirely private.

**Product Market Fit (PMF)**: Targeting privacy-conscious traders and anonymous market creators who require high-integrity resolution without exposing sensitive financial data.  
**Go-To-Market (GTM) Plan**: Initial launch on Aleo Testnet followed by community-driven market creation incentives. Partnering with privacy-first DeFi protocols for liquidity integration.

### 2. Working Demo
**Deployment**: Integrated with Aleo Testnet using the Shield Wallet adapter.  
**Functional Leo Contracts**:
- `veilmarkets.aleo`: Core logic for market creation and pool accounting.
- `veilmarket_token.aleo`: Token escrow for bets and automated payout distribution.
- `veilmarkets_oracle.aleo`: Governance framework for trusted resolution and disputes.
**Core Features**:
- Real-time on-chain market discovery.
- Fully private bet placement (ZK proofs).
- Dynamic market creation with off-chain metadata persistence (Supabase).
- Automated winnings claiming for settled markets.

### 3. Technical Documentation
**GitHub Repository**: [Psalmuel01/VeilMarkets](https://github.com/Psalmuel01/VeilMarkets)  
**Architecture Overview**: A 3-program architecture separating **Logic** (Markets), **Finance** (Token Escrow), and **Governance** (Oracle).  
**Privacy Model**: Uses shielded records and transition inputs to ensure that bet outcomes and wager amounts are never revealed to the public, while maintaining verifiable pool integrity.

### 4. Progress Changelog (Wave 2)
**What's New (Today's Updates)**:
- **Two-Step Betting Flow**: Implemented a secure funds escrow system where money is locked in `veilmarket_token.aleo` before the bet is recorded in the core contract.
- **Supabase Metadata Sync**: Developed a robust off-chain sync using Transaction (Shield) IDs to link rich metadata (titles, descriptions, sources) with on-chain market data.
- **Resolution Source Integration**: Added a "Resolution Source" field throughout the market lifecycle to enhance transparency and resolution accuracy.
- **Dynamic Network Stats**: Live fetching of "Active Market" counts and network activity directly from the Aleo blockchain.
- **Wallet-Level Protection**: Integrated `WalletGuard` across all dashboard pages to prevent leaks of private data when the wallet is disconnected.
- **Testnet Faucet**: Added a built-in credit faucet to the UI for immediate testnet participation.

**Feedback Incorporated**:
- Refined the redirection flow to use transaction hashes for reliable deep-linking immediately after market creation.
- Improved error handling for wallet authorization failures and transaction discovery.

### 5. Future Roadmap

#### **Wave 3: Multi-Market Support & Market Metrics**
*Goal: Expand scope and usability, introducing multiple simultaneous markets and abstract engagement metrics.*
- **Multi-Market Management**: Full support for browsing and interacting with dozens of parallel markets simultaneously.
- **Enhanced Settlement Flow**: Unified dashboard to claim winnings across multiple markets in a single session.
- **Abstract Activity Metrics**: Display engagement (e.g., “X participants”) to provide social proof and popularity cues without revealing private bet amounts or outcomes.
- **ZK Logic Optimization**: Improved internal Aleo program logic to handle high-concurrency bet resolution and aggregated settlement proofs.

#### **Wave 4: Automation, Liquidity & Governance**
*Goal: Evolve into a fully autonomous, liquidity-rich prediction ecosystem.*
- **Oracle & DAO Automation**: Fully automated resolution via API triggers and a decentralized dispute resolution system for Oracle token holders.
- **ZK-AMM Implementation**: Deploy Automated Market Maker logic to provide dynamic odds and instant liquidity withdrawals.
- **Permissionless Creator Fees**: Enabling market creators to earn a percentage of the pool, incentivizing the generation of high-quality markets.
- **Mobile-First Scaling**: Optimize the Aleo Shield integration for a premium mobile experience and expand to multi-token support (Wrapped Aleo / Stablecoins).
