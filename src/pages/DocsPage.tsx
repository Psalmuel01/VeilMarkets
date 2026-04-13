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
        description: "VeilMarkets is a privacy-aware prediction market platform built on Aleo. It supports binary and categorical markets with share trading, oracle resolution, and settlement in Aleo Credits, USDCx, or USAD.",
      },
      {
        title: "How do I participate?",
        description: "Browse markets, choose an outcome, review the quote and slippage guard, then trade through the market's token rail. The app handles private record usage, token proofs where needed, and payout recovery after settlement.",
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
        description: "Aleo-native private execution paths are used for wallet-owned token records, position records, and payout claims. This keeps stored ownership artifacts private even while market accounting remains verifiable on-chain.",
      },
      {
        title: "What stays private?",
        description: "Private token records, position records after purchase, and claim artifacts stay private. Commitment-based ownership tracking also reduces unnecessary linkage for stored position and LP state.",
      },
      {
        title: "What is still public?",
        description: "Trade execution still exposes market, outcome, and amount because the market maker needs those values to update pool state on-chain. Aggregate pool balances, fees, and oracle actions are also publicly verifiable.",
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
        description: "Each market exposes live share-trading analytics. Prices and quote outputs are derived from on-chain pool state, giving an implied probability view before you trade.",
      },
      {
        title: "Trader + Liquidity Tracking",
        description: "Liquidity depth, fee pools, and market accounting are read directly from contract mappings so the app reflects real on-chain state rather than cached approximations.",
      },
      {
        title: "Time Estimations",
        description: "Markets use timestamp-based close and resolution times, with clear countdown/status transitions across Open, Closed, and Settled states.",
      },
    ],
  },
  {
    id: "whats-new",
    title: "What's New Since v8",
    icon: Zap,
    content: [
      {
        title: "Protocol model rewrite",
        description: "VeilMarkets moved from an older market design into share trading with FPMM-style execution, fixed-share settlement, and explicit LP return accounting.",
      },
      {
        title: "Modular contract suite",
        description: "The protocol now runs through factory, core, governance, oracle, and token-adapter programs, making market creation, trading, settlement, and parameter control more modular.",
      },
      {
        title: "Multi-token rails and oracle disputes",
        description: "Markets can settle in Credits, USDCx, or USAD, while resolution now supports oracle staking, disputes, quorum voting, and challenge-window finalization.",
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
        description: "Users choose collateral amount and slippage guard. The app estimates shares out on buys and payout out on sells directly from the same pool math enforced on-chain.",
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
        description: "VeilMarkets is built on Aleo, a Layer 1 blockchain with native zero-knowledge support. That enables private records and claim artifacts while still allowing public verification of market state transitions.",
      },
      {
        title: "Smart contracts",
        description: "The current suite includes factory, core, oracle, governance, and token adapters for Credits, USDCx, and USAD. Together they enforce market creation, share trading, LP accounting, oracle resolution, governance-bound params, and payout verification.",
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
        description: "Collateral is routed through the market's token adapter, then core updates pool inventory, fee accounting, and the buyer's private position record.",
      },
      {
        title: "3) Sell Shares / Fund Liquidity",
        description: "Before close, traders can sell shares back through core and LPs can fund pools through the token adapter. Core keeps pool inventory, fee pools, and LP balances in sync.",
      },
      {
        title: "4) Propose Resolution",
        description: "Registered oracles can propose the outcome after resolution_time. The proposer must meet the active oracle stake threshold and that stake can be locked while the proposal is active.",
      },
      {
        title: "5) Challenge & Vote",
        description: "Anyone can dispute during the challenge window by posting the dispute bond. If disputed, staked oracles vote and finalization must satisfy quorum rules or wait for the timeout fallback path.",
      },
      {
        title: "6) Finalize",
        description: "An oracle finalizes on-chain via the oracle-to-core resolution path. If undisputed, the finalized outcome must match the proposal after deadline. If disputed, finalization settles proposer, challenger, voter, and platform economics.",
      },
      {
        title: "7) Claim / Withdraw",
        description: "Winners claim in two steps: claim_winnings on core, then claim_payout on the token adapter. LPs withdraw after market resolution using withdraw_liquidity.",
      },
    ],
  },
];

const faqs = [
  {
    question: "Can anyone see my bets?",
    answer: "Not fully. Your private wallet records, position records, and claims are protected, but the trade execution still exposes market, outcome, and amount because core needs those public inputs to update pool state.",
  },
  {
    question: "How are markets resolved?",
    answer: "An oracle proposes an outcome after resolution_time. If nobody disputes, finalization can happen after the challenge deadline and must match the proposal. If disputed, quorum rules on oracle votes apply before resolution can settle on core.",
  },
  {
    question: "What happens if I win?",
    answer: "If your outcome wins, you claim through core first and then the token adapter. Redemption is fixed-share: each winning share pays exactly one payout unit of the market's settlement token.",
  },
  {
    question: "Are there any fees?",
    answer: "You pay normal Aleo transaction fees. Trading also applies protocol-configured fees that are split between the market LP fee pool and the protocol treasury, while oracle dispute settlement includes slash and reward flows for the proposer, challenger, voters, and platform.",
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
            Learn how the current VeilMarkets suite powers privacy-aware multi-outcome prediction markets with multi-token settlement on Aleo
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
                Private records and claims are protected, while market execution and resolution remain publicly verifiable
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
              <span className="text-sm">Public Trade Execution</span>
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
