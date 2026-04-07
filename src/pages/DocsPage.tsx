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
        description: "Browse markets, choose an outcome, set your wager, and submit through the market's token rail. The app handles private record usage and proof validation during execution.",
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
        description: "Each market now features real-time analytics. You can see the 'Yes' and 'No' ratios calculated directly from the on-chain pools, giving you the current implied probability of each outcome before placing a bet.",
      },
      {
        title: "Participant Tracking",
        description: "We now track and display the actual number of participants in each market by querying the contract mappings, providing social proof of market activity.",
      },
      {
        title: "Time Estimations",
        description: "Markets use timestamp-based close and resolution times, with clear countdown/status transitions across Open, Closed, and Settled states.",
      },
    ],
  },
  {
    id: "whats-new",
    title: "What's New in v8",
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
        title: "Wager Limits",
        description: "Users can choose their wager amount using a simple slider. The potential return is estimated in real-time based on the current pool distribution.",
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
        description: "The v8 suite includes factory, core, oracle, and token adapters (Credits, USDCx, USAD). Together they enforce market creation, escrow, resolution, and payout verification.",
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
        description: "A market is created with close_time and resolution_time (timestamps) plus a settlement token. Bets are accepted until close_time.",
      },
      {
        title: "2) Place Bets",
        description: "Bets are escrowed through the market's token adapter, then core pool totals and participant stats are updated.",
      },
      {
        title: "3) Propose Resolution",
        description: "Registered oracles can propose the outcome after the resolution block. This requires a staking bond (min. 30 Credits). Incorrect proposals result in a slash.",
      },
      {
        title: "4) Challenge & Vote",
        description: "Anyone can dispute a proposal within the challenge window by posting a bond. If disputed, oracle votes determine the winner. The winner (proposer or disputer) receives 90% of the loser's stake, with 10% going to the platform.",
      },
      {
        title: "5) Finalize",
        description: "The oracle owner finalizes on-chain via resolve_on_core. This transition enforces the 90/10 reward split and platform fee collection.",
      },
      {
        title: "6) Claim Winnings",
        description: "Winners claim in two steps: claim_winnings on core, then claim_payout on the matching token adapter (Credits, USDCx, or USAD).",
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
    answer: "A proposal is written on-chain with a challenge deadline. Finalization must match that proposal: if not disputed, resolve_on_core asserts outcome == proposed_outcome after the challenge window ends. If disputed, resolve_on_core asserts outcome == winning_outcome computed from votes. The proposal is enforced on-chain, not advisory.",
  },
  {
    question: "What happens if I win?",
    answer: "If your prediction is correct, you claim through core first and then through the matching token adapter. The payout is returned to your private wallet records.",
  },
  {
    question: "Are there any fees?",
    answer: "You pay normal Aleo network transaction fees. Additionally, during resolved disputes, a 10% platform fee is collected from the slashed stake/bond. The remaining 90% is awarded to the winning party.",
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
            Learn how VeilMarkets v8 powers private multi-outcome prediction markets with multi-token settlement on Aleo
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
              <span className="text-sm">Encrypted Bets</span>
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
