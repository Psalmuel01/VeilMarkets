import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import {
  Shield, Zap, Trophy, ArrowRight, Lock, Eye,
  CheckCircle2, ChevronRight, TrendingUp, Users, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

// ── Animated grid background ──────────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="vm-grid-bg" aria-hidden="true">
      <div className="vm-grid-fade-top" />
      <div className="vm-grid-fade-bottom" />
    </div>
  );
}

// ── Floating cipher characters ─────────────────────────────────────────────────
function CipherRain() {
  const chars = "01アイウエオ∑∫∂Δ∇⊕⊗αβγδε";
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    const cols = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (i / 11) * 90 + 5,
      delay: i * 0.4,
      duration: 6 + (i % 4),
      char: chars[Math.floor(Math.random() * chars.length)],
    }));
    setColumns(cols);
  }, []);

  return (
    <div className="vm-cipher-rain" aria-hidden="true">
      {columns.map((col) => (
        <motion.span
          key={col.id}
          className="vm-cipher-char"
          style={{ left: `${col.x}%` }}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: "100vh", opacity: [0, 0.15, 0.15, 0] }}
          transition={{
            duration: col.duration,
            delay: col.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {col.char}
        </motion.span>
      ))}
    </div>
  );
}

// ── Live market ticker ─────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: "BTC > $100k by EOY", odds: "67%", dir: "up" },
  { label: "ETH ETF approved", odds: "82%", dir: "up" },
  { label: "Fed rate cut Q1", odds: "44%", dir: "down" },
  { label: "Aleo mainnet TPS > 1k", odds: "71%", dir: "up" },
  { label: "Gold > $3k", odds: "58%", dir: "up" },
  { label: "Recession 2026", odds: "33%", dir: "down" },
  { label: "ChatGPT-5 released", odds: "89%", dir: "up" },
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="vm-ticker-wrap">
      <motion.div
        className="vm-ticker-track"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="vm-ticker-item">
            <span className={`vm-ticker-dot ${item.dir}`} />
            <span className="vm-ticker-label">{item.label}</span>
            <span className={`vm-ticker-odds ${item.dir}`}>{item.odds}</span>
            <span className="vm-ticker-sep">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── ZK proof visualization ─────────────────────────────────────────────────────
function ZKVisual() {
  const nodes = [
    { id: "input", x: 10, y: 50, label: "Your Bet" },
    { id: "zk", x: 50, y: 50, label: "ZK Circuit" },
    { id: "proof", x: 90, y: 30, label: "Proof" },
    { id: "chain", x: 90, y: 70, label: "Chain" },
  ];

  return (
    <div className="vm-zk-visual">
      <svg viewBox="0 0 200 100" className="vm-zk-svg">
        {/* connections */}
        <motion.line x1="30" y1="50" x2="80" y2="50"
          stroke="var(--vm-accent)" strokeWidth="0.8" strokeDasharray="3 2"
          animate={{ strokeDashoffset: [0, -10] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
        <motion.line x1="120" y1="50" x2="160" y2="32"
          stroke="var(--vm-accent)" strokeWidth="0.8" strokeDasharray="3 2"
          animate={{ strokeDashoffset: [0, -10] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear", delay: 0.3 }} />
        <motion.line x1="120" y1="50" x2="160" y2="68"
          stroke="var(--vm-muted-accent)" strokeWidth="0.8" strokeDasharray="3 2"
          animate={{ strokeDashoffset: [0, -10] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear", delay: 0.6 }} />

        {/* locked input node */}
        <g>
          <rect x="2" y="40" width="28" height="20" rx="3" fill="var(--vm-surface)" stroke="var(--vm-border)" strokeWidth="0.5" />
          <text x="16" y="53" fontSize="5" fill="var(--vm-text-muted)" textAnchor="middle">🔒 ?</text>
        </g>

        {/* ZK circuit node — pulsing */}
        <motion.rect x="82" y="36" width="36" height="28" rx="4"
          fill="var(--vm-accent-bg)" stroke="var(--vm-accent)" strokeWidth="0.8"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }} />
        <text x="100" y="53" fontSize="4.5" fill="var(--vm-accent)" textAnchor="middle" fontWeight="600">ZK Proof</text>

        {/* output nodes */}
        <rect x="162" y="22" width="36" height="20" rx="3" fill="var(--vm-surface)" stroke="var(--vm-border)" strokeWidth="0.5" />
        <text x="180" y="35" fontSize="4" fill="var(--vm-text-muted)" textAnchor="middle">✓ Proof</text>

        <rect x="162" y="58" width="36" height="20" rx="3" fill="var(--vm-surface)" stroke="var(--vm-muted-accent)" strokeWidth="0.5" />
        <text x="180" y="71" fontSize="4" fill="var(--vm-text-muted)" textAnchor="middle">On-chain</text>

        {/* hidden label */}
        <text x="16" y="68" fontSize="3.5" fill="var(--vm-text-dim)" textAnchor="middle">hidden</text>
        <text x="180" y="82" fontSize="3.5" fill="var(--vm-text-dim)" textAnchor="middle">public</text>
      </svg>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────
const STATS = [
  { icon: Activity, value: "2,841", label: "Active markets" },
  { icon: Users, value: "14,200+", label: "Private bettors" },
  { icon: TrendingUp, value: "$4.2M", label: "Volume settled" },
  { icon: Shield, value: "100%", label: "ZK verified" },
];

function StatsBar() {
  return (
    <div className="vm-stats-bar">
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          className="vm-stat"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.1 }}
        >
          <s.icon className="vm-stat-icon" />
          <span className="vm-stat-value">{s.value}</span>
          <span className="vm-stat-label">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: Shield,
    title: "Select a market",
    description: "Browse prediction markets across Sports, Finance, Crypto, and more. Each market shows only aggregate odds — never individual positions.",
    tag: "Step 01",
  },
  {
    icon: Lock,
    title: "Place a private bet",
    description: "Your wallet records and claim artifacts use Aleo's private execution paths, while market-level totals remain publicly auditable.",
    tag: "Step 02",
  },
  {
    icon: Trophy,
    title: "Claim privately",
    description: "When markets settle, claim your winnings back into a private balance while the market outcome remains publicly verifiable.",
    tag: "Step 03",
  },
];

// ── Privacy features ───────────────────────────────────────────────────────────
const PRIVACY_FEATURES = [
  {
    icon: Lock,
    title: "Private bets",
    body: "Private records protect ownership and claim artifacts while preserving public aggregate market accounting.",
    accent: "var(--vm-accent)",
  },
  {
    icon: Eye,
    title: "Hidden identity",
    body: "Position ownership is commitment-based to reduce direct address-to-position linkage.",
    accent: "var(--vm-accent2)",
  },
  {
    icon: CheckCircle2,
    title: "Verifiable outcomes",
    body: "Market settlements are publicly verifiable. Anyone can confirm the outcome was fair without seeing individual bets.",
    accent: "var(--vm-green)",
  },
  {
    icon: Zap,
    title: "Instant settlement",
    body: "When markets resolve, claim your winnings instantly. ZK proofs ensure fast, trustless payouts with no intermediary.",
    accent: "var(--vm-amber)",
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{`
        /* ── Base reset for landing ── */
        .vm-root { 
          background: var(--background); color: var(--foreground); font-family: var(--font-body); min-height: 100vh; overflow-x: hidden;
          --vm-text: #ffffff;
          --vm-text-muted: #cbd5e1;
          --vm-text-dim: #94a3b8;
          --vm-bg: #030711;
          --vm-surface: #0a0f1d;
          --vm-surface2: #1e293b;
          --vm-border: rgba(255,255,255,0.12);
          --vm-border-accent: rgba(0,228,180,0.25);
          --vm-accent: #00e4b4;
          --vm-accent2: #6c8eff;
          --vm-accent-bg: rgba(0,228,180,0.06);
          --vm-green: #10b981;
          --vm-amber: #f59e0b;
        }

        /* ── Grid background ── */
        .vm-grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(0,228,180,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,228,180,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .vm-grid-fade-top {
          position: absolute; top: 0; left: 0; right: 0; height: 30vh;
          background: linear-gradient(to bottom, var(--vm-bg), transparent);
        }
        .vm-grid-fade-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 30vh;
          background: linear-gradient(to top, var(--background), transparent);
        }

        /* ── Cipher rain ── */
        .vm-cipher-rain { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
        .vm-cipher-char {
          position: absolute; top: 0;
          font-family: var(--font-mono);
          font-size: 13px; color: hsl(var(--primary));
          user-select: none; white-space: nowrap;
        }

        /* ── Nav ── */
        .vm-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 60px;
          background: rgba(8,11,16,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--vm-border);
        }
        .vm-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .vm-logo-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #00e4b4, #6c8eff);
          display: flex; align-items: center; justify-content: center;
        }
        .vm-logo-text {
          font-size: 14px; font-weight: 600;
          color: var(--foreground); letter-spacing: 0.05em;
        }
        .vm-nav-links { display: flex; align-items: center; gap: 8px; }
        .vm-nav-link {
          padding: 6px 14px; border-radius: 6px;
          font-size: 13px; color: var(--muted-foreground);
          text-decoration: none; transition: color 0.2s;
        }
        .vm-nav-link:hover { color: var(--vm-text); }

        /* ── Ticker ── */
        .vm-ticker-wrap {
          overflow: hidden; white-space: nowrap;
          border-top: 1px solid var(--vm-border);
          border-bottom: 1px solid var(--vm-border);
          background: var(--vm-surface); padding: 10px 0;
        }
        .vm-ticker-track { display: inline-flex; gap: 0; }
        .vm-ticker-item { display: inline-flex; align-items: center; gap: 8px; padding: 0 20px; }
        .vm-ticker-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .vm-ticker-dot.up { background: var(--vm-green); }
        .vm-ticker-dot.down { background: #f87171; }
        .vm-ticker-label { font-size: 12px; color: var(--vm-text-muted); font-family: var(--vm-font-body); }
        .vm-ticker-odds { font-size: 12px; font-family: var(--vm-font-display); }
        .vm-ticker-odds.up { color: var(--vm-green); }
        .vm-ticker-odds.down { color: #f87171; }
        .vm-ticker-sep { color: var(--vm-text-dim); font-size: 16px; margin-left: 12px; }

        /* ── Hero ── */
        .vm-hero {
          position: relative; padding: 120px 40px 80px;
          min-height: 92vh; display: flex; flex-direction: column; justify-content: center;
          overflow: hidden;
        }
        .vm-hero-glow-a {
          position: absolute; top: 15%; left: 20%; width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,228,180,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .vm-hero-glow-b {
          position: absolute; bottom: 10%; right: 15%; width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(108,142,255,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .vm-hero-inner { max-width: 820px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
        .vm-hero-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          border: 1px solid var(--vm-border-accent);
          background: var(--vm-accent-bg);
          font-family: var(--vm-font-display); font-size: 11px;
          color: var(--vm-accent); letter-spacing: 0.08em;
          text-transform: uppercase; margin-bottom: 28px;
        }
        .vm-hero-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vm-accent); animation: pulse-dot 2s infinite; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }

        .vm-h1 {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 600; line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--foreground); margin-bottom: 10px;
        }
        .vm-h1-accent {
          background: linear-gradient(90deg, #00e4b4, #6c8eff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .vm-hero-sub {
          font-size: 17px; color: var(--vm-text-muted); line-height: 1.65;
          max-width: 560px; margin: 20px auto 36px;
        }
        .vm-cta-row { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 48px; }
        .vm-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 28px; height: 48px; border-radius: 8px;
          background: linear-gradient(135deg, hsl(var(--primary)), #00b896);
          color: #080b10; font-weight: 600; font-size: 14px;
          text-decoration: none; transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 0 24px rgba(0,228,180,0.25);
        }
        .vm-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .vm-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 24px; height: 48px; border-radius: 8px;
          border: 1px solid var(--vm-border);
          color: var(--vm-text-muted); font-size: 14px;
          text-decoration: none; background: transparent;
          transition: border-color 0.2s, color 0.2s;
        }
        .vm-btn-secondary:hover { border-color: var(--vm-accent); color: var(--vm-text); }

        /* ── Feature chips ── */
        .vm-chip-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .vm-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          border: 1px solid var(--vm-border);
          font-size: 12px; color: var(--vm-text-muted);
          background: var(--vm-surface);
        }
        .vm-chip-icon { color: var(--vm-green); width: 13px; height: 13px; }

        /* ── Stats bar ── */
        .vm-stats-bar {
          display: flex; gap: 0; border-top: 1px solid var(--vm-border); border-bottom: 1px solid var(--vm-border);
          background: var(--vm-surface); padding: 20px 40px; justify-content: center;
          flex-wrap: wrap;
        }
        .vm-stat {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 0 40px; border-right: 1px solid var(--vm-border);
        }
        .vm-stat:last-child { border-right: none; }
        .vm-stat-icon { width: 16px; height: 16px; color: var(--vm-accent); margin-bottom: 2px; }
        .vm-stat-value { font-family: var(--font-mono); font-size: 22px; font-weight: 600; color: var(--foreground); }
        .vm-stat-label { font-size: 11px; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.06em; }

        /* ── Section ── */
        .vm-section { padding: 96px 40px; position: relative; z-index: 1; }
        .vm-section-label {
          font-family: var(--vm-font-display); font-size: 11px;
          color: var(--vm-accent); letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px; display: block;
        }
        .vm-h2 {
           font-size: clamp(26px, 4vw, 42px);
          font-weight: 600; color: var(--foreground); line-height: 1.15;
          letter-spacing: -0.02em; margin-bottom: 16px;
        }
        .vm-section-sub { font-size: 16px; color: var(--vm-text-muted); max-width: 480px; line-height: 1.6; }
        .vm-section-head { text-align: center; margin-bottom: 64px; }
        .vm-section-head .vm-section-sub { margin: 0 auto; }

        /* ── Steps ── */
        .vm-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--vm-border); max-width: 1100px; margin: 0 auto; border: 1px solid var(--vm-border); border-radius: 16px; overflow: hidden; }
        .vm-step { background: var(--vm-surface); padding: 40px 32px; position: relative; transition: background 0.2s; }
        .vm-step:hover { background: var(--vm-surface2); }
        .vm-step-tag { font-family: var(--vm-font-display); font-size: 10px; color: var(--vm-text-dim); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; }
        .vm-step-icon { width: 44px; height: 44px; border-radius: 10px; background: var(--vm-accent-bg); border: 1px solid var(--vm-border-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .vm-step-icon svg { width: 20px; height: 20px; color: var(--vm-accent); }
        .vm-step h3 { font-family: var(--vm-font-display); font-size: 17px; font-weight: 600; color: var(--vm-text); margin-bottom: 12px; }
        .vm-step p { font-size: 14px; color: var(--vm-text-muted); line-height: 1.65; }
        .vm-step-connector { position: absolute; top: 58px; right: -1px; width: 1px; height: 40px; background: linear-gradient(to bottom, transparent, var(--vm-accent), transparent); }

        /* ── ZK Visual ── */
        .vm-zk-visual { width: 100%; max-width: 420px; margin: 0 auto; }
        .vm-zk-svg { width: 100%; }

        /* ── Privacy grid ── */
        .vm-privacy-container { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        .vm-privacy-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 1000px; margin: 0 auto; }
        .vm-privacy-section { display: flex; flex-direction: column; gap: 24px; }
        .vm-privacy-card {
          padding: 32px; border-radius: 12px;
          background: var(--vm-surface); border: 1px solid var(--vm-border);
          transition: border-color 0.25s;
        }
        .vm-privacy-card:hover { border-color: rgba(0,228,180,0.4); box-shadow: 0 0 20px rgba(0,228,180,0.05); }
        .vm-privacy-card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .vm-privacy-card h3 { font-family: var(--vm-font-display); font-size: 16px; font-weight: 600; color: var(--vm-text); margin-bottom: 10px; }
        .vm-privacy-card p { font-size: 14px; color: var(--vm-text-muted); line-height: 1.65; }

        /* ── CTA section ── */
        .vm-cta-section {
          margin: 0 40px 80px; border-radius: 20px;
          background: var(--vm-surface);
          border: 1px solid var(--vm-border);
          padding: 80px 40px; text-align: center;
          position: relative; overflow: hidden; z-index: 1;
        }
        .vm-cta-glow {
          position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
          width: 400px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(0,228,180,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .vm-cta-section h2 { font-family: var(--vm-font-display); font-size: clamp(24px, 4vw, 40px); font-weight: 700; color: var(--vm-text); margin-bottom: 16px; }
        .vm-cta-section p { color: var(--vm-text-muted); font-size: 16px; margin-bottom: 32px; max-width: 440px; margin-left: auto; margin-right: auto; }

        /* ── Footer ── */
        .vm-footer {
          border-top: 1px solid var(--vm-border); padding: 28px 40px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px; position: relative; z-index: 1;
        }
        .vm-footer-left { display: flex; align-items: center; gap: 10px; }
        .vm-footer-copy { font-size: 12px; color: var(--vm-text-dim); font-family: var(--vm-font-display); }
        .vm-footer-links { display: flex; gap: 20px; }
        .vm-footer-link { font-size: 13px; color: var(--vm-text-muted); text-decoration: none; transition: color 0.2s; }
        .vm-footer-link:hover { color: var(--vm-accent); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .vm-hide-mobile { display: none; }
          .vm-privacy-container { grid-template-columns: 1fr; gap: 40px; }
          .vm-nav { padding: 0 20px; }
          .vm-hero { padding: 100px 20px 60px; }
          .vm-steps { grid-template-columns: 1fr; }
          .vm-privacy-wrap { grid-template-columns: 1fr; }
          .vm-stats-bar { gap: 20px; padding: 20px; }
          .vm-stat { border-right: none; padding: 0 16px; }
          .vm-section { padding: 60px 20px; }
          .vm-cta-section { margin: 0 16px 60px; padding: 60px 24px; }
          .vm-footer { padding: 24px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="vm-root">
        <GridBackground />

        {/* Nav */}
        <nav className="vm-nav">
          <Link to="/" className="vm-logo">
            <div className="vm-logo-icon">
              <Shield style={{ width: 16, height: 16, color: "#080b10" }} />
            </div>
            <span className="vm-logo-text">VeilMarkets</span>
          </Link>
          <div className="vm-nav-links">
            <Link to="/docs" className="vm-nav-link vm-hide-mobile">Docs</Link>
            <Link to="/markets" className="vm-nav-link vm-hide-mobile">Markets</Link>
            <ConnectWalletButton />
          </div>
        </nav>

        {/* Hero */}
        <section className="vm-hero">
          <CipherRain />
          <div className="vm-hero-glow-a" />
          <div className="vm-hero-glow-b" />

          <div className="vm-hero-inner">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="vm-hero-chip">
                <div className="vm-hero-chip-dot" />
                Powered by Aleo Zero-Knowledge Proofs
              </div>
            </motion.div>

            <motion.h1 className="vm-h1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              Predict privately.<br />
              <span className="vm-h1-accent">Win verifiably.</span>
            </motion.h1>

            <motion.p className="vm-hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              Private execution where ownership and claims are shielded, while
              aggregate market state stays publicly auditable on-chain.
            </motion.p>

            <motion.div className="vm-cta-row" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              <Link to="/create" className="vm-btn-primary">
                Create Market <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link to="/markets" className="vm-btn-secondary">
                Explore Markets <ChevronRight style={{ width: 16, height: 16 }} />
              </Link>
            </motion.div>

            <motion.div className="vm-chip-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              {[
                { icon: Lock, label: "Encrypted amounts" },
                { icon: Eye, label: "Hidden identity" },
                { icon: CheckCircle2, label: "Verifiable on-chain" },
                { icon: Shield, label: "ZK proofs" },
              ].map((f) => (
                <div key={f.label} className="vm-chip">
                  <f.icon className="vm-chip-icon" />
                  {f.label}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Ticker */}
        <Ticker />

        {/* Stats */}
        <StatsBar />

        {/* How it works */}
        <section className="vm-section">
          <motion.div className="vm-section-head" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="vm-section-label">How it works</span>
            <h2 className="vm-h2">Three steps to private prediction</h2>
            <p className="vm-section-sub">Private records and claims by default, with public market accounting where the protocol needs it.</p>
          </motion.div>

          <div className="vm-steps">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                className="vm-step"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <div className="vm-step-tag">{step.tag}</div>
                <div className="vm-step-icon"><step.icon /></div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {i < STEPS.length - 1 && <div className="vm-step-connector" />}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ZK Privacy */}
        <section className="vm-section" style={{ background: "var(--vm-surface)", borderTop: "1px solid var(--vm-border)", borderBottom: "1px solid var(--vm-border)" }}>
          <div className="vm-privacy-container">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="vm-section-label">Zero-knowledge privacy</span>
              <h2 className="vm-h2">Your bet is yours alone</h2>
              <p className="vm-section-sub" style={{ marginBottom: 32 }}>
                VeilMarkets uses Aleo's ZK proof system to protect private records and claims,
                while keeping settlement and aggregate state verifiable.
              </p>
              <ZKVisual />
            </motion.div>

            <motion.div className="vm-privacy-section" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              {PRIVACY_FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="vm-privacy-card"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="vm-privacy-card-icon" style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}30` }}>
                    <f.icon style={{ width: 18, height: 18, color: f.accent }} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="vm-section" style={{ paddingBottom: 48 }}>
          <motion.div
            className="vm-cta-section"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="vm-cta-glow" />
            <ZKBadge variant="verified" size="lg" className="mb-4" />
            <h2>Ready to bet privately?</h2>
            <p>
              Join thousands of participants on VeilMarkets — the only prediction market
              where your privacy is cryptographically guaranteed.
            </p>
            <Link to="/markets" className="vm-btn-primary">
              Explore Markets <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="vm-footer">
          <div className="vm-footer-left">
            <div className="vm-logo-icon" style={{ width: 24, height: 24, borderRadius: 6 }}>
              <Shield style={{ width: 13, height: 13, color: "#080b10" }} />
            </div>
            <span className="vm-footer-copy">© 2026 VEILMARKETS · BUILT ON ALEO</span>
          </div>
          <div className="vm-footer-links">
            <Link to="/docs" className="vm-footer-link">Docs</Link>
            <a href="#" className="vm-footer-link">GitHub</a>
            <a href="#" className="vm-footer-link">Twitter</a>
          </div>
        </footer>
      </div>
    </>
  );
}
