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

- Binary outcome markets (Yes/No)
- Private bet submission and encrypted storage
- Market resolution via oracle with zero-knowledge proofs
- Settlement and winnings claim with verifiable privacy
- User dashboard (“My Bets”) showing only private, personal information
- Privacy-first UI and proof visualization

---

## Tech Stack

- **Aleo** — Layer-1 blockchain with programmable privacy
- **Leo** — Aleo smart contract language for bet and settlement logic
- **React** — Frontend framework for responsive UI
- **Tailwind CSS / Figma** — UI/UX design system
- **TypeScript** — Type safety across frontend and contracts

---

## Architecture

```
Frontend (React / Next.js) ↔ Aleo Smart Contracts (Leo)
┌─────────────────────────────┐
│  Market Creation Contract    │
│  - Create binary markets     │
│  - Store public metadata     │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│      Bet Contract            │
│  - Accept encrypted bets     │
│  - Validate wager privately  │
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│   Settlement Contract        │
│  - Oracle submits outcome    │
│  - Compute private payouts   │
│  - ZK proof verification     │
└─────────────────────────────┘
```

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

3. Deploy contracts to Aleo Testnet:

```bash
# deploy market, bet, settlement contracts
leo run
```

4. Run the frontend locally:

```bash
npm run dev
```

5. Open your browser at `http://localhost:3000` and interact with the UI.

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
