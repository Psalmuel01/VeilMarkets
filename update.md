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
- `veilmarkets_factory_v5.aleo`: Central registry for system contracts.
- `veilmarkets_v5.aleo`: Core logic for market creation and pool accounting.
- `veilmarkets_token_v5.aleo`: Integrated pari-mutuel escrow vault and credit system.
- `veilmarkets_oracle_v5.aleo`: Governance framework for trusted resolution and disputes.
**Core Features**:
- Real-time on-chain market discovery.
- Fully private bet placement (ZK proofs).
- Dynamic market creation with off-chain metadata persistence (Supabase).
- Automated winnings claiming for settled markets.

### 3. Technical Documentation
**GitHub Repository**: [Psalmuel01/VeilMarkets](https://github.com/Psalmuel01/VeilMarkets)  
**Architecture Overview**: A modular 4-program architecture separating **Registry** (Factory), **Logic** (Markets), **Finance** (Token Escrow), and **Governance** (Oracle).  
**Privacy Model**: Uses shielded records and transition inputs to ensure that bet outcomes and wager amounts are never revealed to the public, while maintaining verifiable pool integrity.

### 4. Progress Changelog (Wave 3 - v5 Upgrade)
**What's New (v5 Implementation)**:
- **Absolute Timestamp Transition**: Fully migrated from block-height based deadlines to `block.timestamp` (Unix seconds) for 100% accurate market closing and resolution.
- **v5 Modular Architecture**: Deployed and integrated the latest v5 suite of Aleo contracts across the system.
- **Friendly UX Refinements**: Implemented short-hand human-friendly dates (e.g., "Mar 15, 9:40pm") and optimized card layouts for readability.
- **Robust Creation Flow**: Refactored the market creation deep-linking to use the persistent on-chain Market ID for immediate discovery.
- **Comprehensive Technical Cleanup**: Resolved all legacy TypeScript lint errors and optimized internal transaction parsing for v5 record structures.
- **Metadata Traceability**: Added real-time logging for Supabase synchronization to ensure data integrity during market creation.

**Feedback Incorporated**:
- **Chronological Assertions**: Implemented a mandatory 60-second resolution offset to satisfy on-chain chronological invariants.
- **Short-form Datetimes**: Responding to PR feedback, simplified date formats by removing redundant labels and shortening month names.
- **Iconic Visual Cues**: Replaced general clock icons with status-driven Timer icons to better communicate market urgency.

### 5. Progress Status
- [x] **Wave 1**: Architecture & Core Logic
- [x] **Wave 2**: UI/UX & Integration
- [x] **Wave 3**: Market Metrics & Analytics (v5 Timestamps)
- [/] **Wave 4**: Automation & Governance (In Progress)

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
