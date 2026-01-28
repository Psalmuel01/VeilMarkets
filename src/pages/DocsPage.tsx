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
        description: "VeilMarkets is a private prediction market platform built on the Aleo blockchain. It allows users to participate in binary outcome markets while keeping their bets, identities, and wager amounts completely private through zero-knowledge proofs.",
      },
      {
        title: "How do I participate?",
        description: "Simply browse available markets, select your prediction (Yes or No), choose your wager level, and submit. Your bet is encrypted using ZK proofs before being recorded on the Aleo blockchain.",
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
        description: "ZK proofs allow you to prove that your bet is valid without revealing any information about the bet itself. This means no one can see your wager amount, your predicted outcome, or link your bet to your identity.",
      },
      {
        title: "What's encrypted?",
        description: "Your bet amount, chosen outcome, wallet address, and all transaction details are encrypted. Only you can see your own bets and winnings. The only public information is that a bet was placed (not by whom or for how much).",
      },
      {
        title: "On-chain verification",
        description: "While individual bets are private, the overall market integrity is publicly verifiable. Anyone can confirm that settlements are fair and that the correct outcome was determined, without seeing individual bets.",
      },
    ],
  },
  {
    id: "markets",
    title: "Markets",
    icon: Zap,
    content: [
      {
        title: "Market types",
        description: "VeilMarkets supports binary outcome markets across various categories including Crypto, Finance, Sports, Politics, and Entertainment. Each market has a clear resolution criteria and closing date.",
      },
      {
        title: "Creating a market",
        description: "Anyone can create a market by defining a yes/no question, providing resolution criteria, setting a closing date, and optionally specifying a resolution source. Market creators remain anonymous.",
      },
      {
        title: "Resolution process",
        description: "Markets are resolved based on their defined criteria after the closing date. The resolution is recorded on-chain with a ZK proof, allowing winners to claim their winnings privately.",
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
        description: "Our Aleo programs handle bet placement, market resolution, and payout distribution. All operations use ZK proofs to maintain privacy while ensuring correctness.",
      },
    ],
  },
];

const faqs = [
  {
    question: "Can anyone see my bets?",
    answer: "No. Your bets are encrypted using zero-knowledge proofs. Only you can see your betting history and winnings.",
  },
  {
    question: "How are markets resolved?",
    answer: "Markets are resolved based on their predefined criteria after the closing date. The resolution is verified on-chain.",
  },
  {
    question: "What happens if I win?",
    answer: "If your prediction is correct, you can claim your winnings privately. The payout is transferred to your wallet without revealing the amount publicly.",
  },
  {
    question: "Are there any fees?",
    answer: "There are minimal network fees for Aleo transactions. Market creators may set a small fee that goes to the resolution process.",
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
            <h1 className="text-3xl font-bold">Documentation</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Learn how VeilMarkets provides private prediction markets using Aleo's zero-knowledge technology
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

          <div className="space-y-4 pl-11">
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
              href="#"
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
