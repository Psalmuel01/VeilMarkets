import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  CheckCircle2,
  Zap,
  BookOpen,
  ExternalLink,
  Code,
  HelpCircle
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ZKBadge } from "@/components/ui/ZKBadge";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    content: [
      {
        title: "What is VeilMarkets?",
        description: "VeilMarkets is a privacy-first prediction market platform built on Aleo. It supports binary and categorical markets (2-8 outcomes) with settlement in Aleo Credits, USDCx, or USAD.",
      },
      {
        title: "How do I participate?",
        description: "Browse markets, choose an outcome, review quote/slippage, and buy shares through the market's token rail. The app handles private record usage and proof validation during execution.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: Shield,
    content: [
      {
        title: "Zero-Knowledge Proofs",
        description: "ZK proofs are used to verify bet validity and settlement correctness while reducing information leakage. Private wallet records and claims are handled through Aleo-native private execution paths.",
      },
      {
        title: "What's encrypted?",
        description: "Wallet-owned records and claim artifacts are private. Depending on the token rail, some public escrow/accounting events can still appear at contract level while preserving private position ownership.",
      },
      {
        title: "On-chain verification",
        description: "Market integrity remains publicly verifiable. Resolution and payout rules are enforced on-chain so anyone can verify final outcome correctness and payout logic.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Market Analytics",
    icon: Zap,
    content: [
      {
        title: "Real-time Ratios",
        description: "Each market features live share-trading analytics. Prices and quote outputs are derived from on-chain pool state, giving a current implied probability view before you trade.",
      },
      {
        title: "Trader + Liquidity Tracking",
        description: "We track trader activity, liquidity depth, and pool totals directly from contract mappings so market health reflects actual on-chain state.",
      },
      {
        title: "Time Estimations",
        description: "Markets use timestamp-based close and resolution times, with clear countdown/status transitions across Open, Closed, and Settled states.",
      },
    ],
  },
  {
    id: "whats-new",
    title: "What's New in v11",
    icon: Zap,
    content: [
      {
        title: "Multi-token market rails",
        description: "Market creators can select Aleo Credits, USDCx, or USAD as settlement asset during creation.",
      },
      {
        title: "Improved market discovery",
        description: "Markets page now supports direct currency filtering and subtle token ticker badges on cards.",
      },
      {
        title: "Oracle stake lifecycle",
        description: "Oracle UI now includes unstake management, and oracle status is tracked against effective minimum stake.",
      },
    ],
  },
  {
    id: "tokens",
    title: "Tokens & Wagers",
    icon: Lock,
    content: [
      {
        title: "Supported Settlement Tokens",
        description: "Markets can settle in Aleo Credits, USDCx, or USAD. Each market is bound to exactly one token adapter and all bet/claim operations follow that market's selected rail.",
      },
      {
        title: "Trade Inputs",
        description: "Users choose collateral amount and slippage guard. The app estimates shares out (buy) and payout out (sell) directly from the same quote math used on-chain.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical Details",
    icon: Code,
    content: [
      {
        title: "Aleo blockchain",
        description: "VeilMarkets is built on Aleo, a Layer 1 blockchain that uses zero-knowledge proofs natively. This enables private smart contract execution where inputs, outputs, and state can all be encrypted.",
      },
      {
        title: "Smart contracts",
        description: "The v11 suite includes factory, core, oracle, governance, and token adapters (Credits, USDCx, USAD). Together they enforce market creation, share trading, quorum resolution, governance-bound params, and payout verification.",
      },
    ],
  },
  {
    id: "lifecycle",
    title: "Market Lifecycle",
    icon: HelpCircle,
    content: [
      {
        title: "1) Create Market",
        description: "A market is created with close_time and resolution_time (timestamps) plus a settlement token. Share trading is open until close_time.",
      },
      {
        title: "2) Buy Shares",
        description: "Collateral is escrowed through the market's token adapter, then core updates share supply, exposure, and pool accounting.",
      },
      {
        title: "3) Propose Resolution",
        description: "Registered oracles can propose the outcome after resolution_time. Proposer must meet minimum active oracle stake (default 30 Credits).",
      },
      {
        title: "4) Challenge & Vote",
        description: "Anyone can dispute during the challenge window by posting the dispute bond (at least minimum stake). If disputed, staked oracles vote. Finalization requires quorum (default: at least 3 unique voters and total vote weight >= 3x minimum stake).",
      },
      {
        title: "5) Finalize",
        description: "An oracle finalizes on-chain via resolve_on_core / execute_quorum_resolution. If undisputed, finalize must match proposed outcome after deadline. If disputed, finalize must satisfy quorum checks and settle proposer/disputer economics.",
      },
      {
        title: "6) Claim / Withdraw",
        description: "Winners claim in two steps: claim_winnings on core, then claim_payout on the token adapter. LPs withdraw after market resolution using withdraw_liquidity.",
      },
    ],
  },
];

const faqs = [
  {
    question: "Can anyone see my bets?",
    answer: "Your private wallet records and claims are protected. Depending on the token rail, some contract-level escrow accounting can still be publicly observable.",
  },
  {
    question: "How are markets resolved?",
    answer: "A proposal is written on-chain with a challenge deadline. If undisputed, finalization can happen after deadline and must match the proposed outcome. If disputed, finalization requires quorum checks on oracle votes (minimum voters and minimum total vote weight).",
  },
  {
    question: "What happens if I win?",
    answer: "If your outcome wins, you claim through core first and then the token adapter. Winner redemption is fixed-share in core (1 payout unit per winning share), not pari-mutuel pool splitting.",
  },
  {
    question: "Are there any fees?",
    answer: "You pay normal Aleo network transaction fees. Trading applies protocol-configured fees (currently split between LP fee pool and protocol treasury), while dispute settlement applies 90/10 winner/platform split on slash/bond economics.",
  },
];

export default function DocsPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Documentation</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Learn how VeilMarkets v11 powers private multi-outcome prediction markets with multi-token settlement on Aleo
          </p>
        </motion.div>

        {/* Privacy Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl gradient-border bg-card mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <ZKBadge variant="verified" size="lg" />
            <div>
              <h2 className="text-lg font-semibold">Built for Privacy</h2>
              <p className="text-sm text-muted-foreground">
                Every aspect of VeilMarkets is designed with privacy as the core principle
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-sm">Private Position Records</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Eye className="w-5 h-5 text-accent" />
              <span className="text-sm">Hidden Identity</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm">Verifiable Results</span>
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, sectionIndex) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + sectionIndex * 0.05 }}
              id={section.id}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>

              <div className="space-y-6 pl-11">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex} className="p-5 rounded-xl bg-card border border-border/50">
                    <h3 className="font-medium mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3 pl-11">
            {faqs.map((faq, index) => (
              <div key={index} className="p-5 rounded-xl bg-card border border-border/50">
                <h3 className="font-medium mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* External Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 p-6 rounded-xl bg-muted/20 border border-border/50"
        >
          <h3 className="font-semibold mb-4">External Resources</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://aleo.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
            >
              <span className="text-sm font-medium">Aleo Documentation</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a
              href="https://github.com/Psalmuel01/VeilMarkets"
              className="flex items-center justify-between p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
            >
              <span className="text-sm font-medium">GitHub Repository</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
