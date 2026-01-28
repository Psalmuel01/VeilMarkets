import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield,
  Zap,
  Trophy,
  ArrowRight,
  Lock,
  Eye,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZKBadge } from "@/components/ui/ZKBadge";

const steps = [
  {
    icon: Shield,
    title: "Select Market",
    description: "Browse prediction markets across Sports, Finance, Crypto, and more.",
  },
  {
    icon: Lock,
    title: "Place Private Bet",
    description: "Your bet amount and identity are encrypted using zero-knowledge proofs.",
  },
  {
    icon: Trophy,
    title: "Claim Winnings",
    description: "When markets settle, claim your winnings privately and securely.",
  },
];

const features = [
  { icon: Lock, label: "Encrypted Amounts" },
  { icon: Eye, label: "Hidden Identity" },
  { icon: CheckCircle2, label: "Verifiable On-Chain" },
  { icon: Shield, label: "ZK Proofs" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-gradient flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">VeilMarkets</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/markets">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Explore Markets
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Docs
              </Button>
            </Link>
            <Link to="/markets">
              <Button className="btn-glow-primary">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8"
            >
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Powered by Aleo Zero-Knowledge Proofs</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-foreground">Private Prediction Markets</span>
              <br />
              <span className="text-gradient">Powered by Aleo</span>
            </h1>

            {/* Subtext */}
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Place bets privately, verify outcomes publicly. Your identity and wager amounts
              remain encrypted while the market stays fully verifiable on-chain.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/create">
                <Button size="lg" className="btn-glow-primary text-lg px-8 h-14">
                  Create Market
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/markets">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-border hover:bg-muted">
                  Explore Markets
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50"
                >
                  <feature.icon className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">{feature.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to participate in private prediction markets
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}

                <div className="relative z-10 p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-24 px-6 bg-muted/20 border-t border-border/50">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <ZKBadge variant="verified" size="lg" className="mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Zero-Knowledge Privacy
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                VeilMarkets leverages Aleo's zero-knowledge proof technology to ensure
                your betting activity remains completely private while still being
                verifiable on the blockchain.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl gradient-border bg-card"
              >
                <Lock className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Private Bets</h3>
                <p className="text-muted-foreground">
                  Your bet amounts and positions are encrypted. No one can see how much
                  you wagered or which outcome you predicted.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl gradient-border bg-card"
              >
                <Eye className="w-10 h-10 text-accent mb-4" />
                <h3 className="text-xl font-semibold mb-2">Hidden Identity</h3>
                <p className="text-muted-foreground">
                  Your wallet address and identity are never exposed. Participate
                  in markets without revealing who you are.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl gradient-border bg-card"
              >
                <CheckCircle2 className="w-10 h-10 text-success mb-4" />
                <h3 className="text-xl font-semibold mb-2">Verifiable Outcomes</h3>
                <p className="text-muted-foreground">
                  Market settlements are publicly verifiable. Anyone can confirm
                  the outcome was fair without seeing individual bets.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl gradient-border bg-card"
              >
                <Zap className="w-10 h-10 text-warning mb-4" />
                <h3 className="text-xl font-semibold mb-2">Instant Settlement</h3>
                <p className="text-muted-foreground">
                  When markets resolve, claim your winnings instantly. ZK proofs
                  ensure fast, trustless payouts.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Start Betting Privately?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join VeilMarkets and experience the future of private prediction markets
              on the Aleo blockchain.
            </p>
            <Link to="/markets">
              <Button size="lg" className="btn-glow-primary text-lg px-10 h-14">
                Explore Markets
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-neon-gradient flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">
              © 2026 VeilMarkets. Built on Aleo.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
