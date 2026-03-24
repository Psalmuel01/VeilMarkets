import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Calendar,
  Tag,
  FileText,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZKBadge } from "@/components/ui/ZKBadge";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { getTimestampFromDate } from "@/lib/aleo";
import { TOKEN_PROGRAM_ID, USDCX_TOKEN_PROGRAM_ID } from "@/lib/constants";

const categories = [
  { value: "crypto", label: "Crypto" },
  { value: "finance", label: "Finance" },
  { value: "sports", label: "Sports" },
  { value: "politics", label: "Politics" },
  { value: "entertainment", label: "Entertainment" },
  { value: "tech", label: "Tech" },
];

type Step = "form" | "review" | "creating" | "success" | "failed";

export default function CreateMarketPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    closingDate: "",
    closingTime: "23:59",
    resolutionSource: "",
    tokenId: TOKEN_PROGRAM_ID,
  });

  const { createMarket } = useAleoPrograms();
  const [creationResult, setCreationResult] = useState<{ transactionId: string; marketId: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("review");
  };

  const handleCreate = async () => {
    setStep("creating");

    const closeTime = getTimestampFromDate(formData.closingDate, formData.closingTime);
    if (!closeTime) {
      toast.error("Invalid closing date (must be in future)");
      setStep("form");
      return;
    }

    // Resolution begins after a fixed offset from close (e.g. 1 minute)
    const RESOLUTION_OFFSET_SECONDS = 60;
    const resolutionTime = closeTime + RESOLUTION_OFFSET_SECONDS;

    // Map category string to u8
    const categoryMap: Record<string, number> = {
      crypto: 0,
      finance: 1,
      sports: 2,
      politics: 3,
      entertainment: 4,
      tech: 5,
    };

    const result = await createMarket(
      formData.title,
      formData.description,
      categoryMap[formData.category] ?? 0,
      closeTime,
      resolutionTime,
      formData.resolutionSource,
      formData.tokenId
    );

    if (result) {
      setCreationResult(result);
      setStep("success");
    } else {
      setStep("failed");
    }
  };

  const isFormValid = formData.title && formData.description && formData.category && formData.closingDate;

  return (
    <MainLayout requireWallet={true}>
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <Badge variant="outline" className="mb-4 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border-primary/20 text-primary bg-primary/5">
            Market Creation Portal
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-4">
            Launch Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Prediction</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            Deploy a private, ZK-powered prediction market on Aleo in seconds.
          </p>
        </motion.div>

        {step === "form" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 md:p-12 rounded-[3rem] border border-white/5 relative overflow-hidden"
          >
            {/* Background Decorative Element */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              {/* Question Input */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2 ml-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Primary Question
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Will Aleo Mainnet launch successfully?"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 text-lg font-medium focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-white/10"
                />
                <p className="text-[10px] text-muted-foreground/40 font-medium ml-1">
                  Must be a verifiable Yes/No outcome.
                </p>
              </div>

              {/* Description Textarea */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2 ml-1">
                  Details & Resolution
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide explicit criteria for the outcome resolution..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/[0.03] border-white/10 rounded-2xl p-6 min-h-[160px] text-base leading-relaxed focus:border-primary/50 transition-all placeholder:text-white/10"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Category Selection */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2 ml-1">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    Market Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6">
                      <SelectValue placeholder="Select context" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 rounded-2xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="h-12 rounded-xl focus:bg-white/10">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Closing Date */}
                <div className="space-y-3">
                  <Label htmlFor="closingDate" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2 ml-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Bidding Concludes
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="closingDate"
                      type="date"
                      value={formData.closingDate}
                      onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                      className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-4 focus:border-primary/50 transition-all"
                    />
                    <Input
                      id="closingTime"
                      type="time"
                      step="1"
                      value={formData.closingTime}
                      onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                      className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-4 w-[130px] focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Resolution Source & Currency */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="resolutionSource" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                    Authority Source
                  </Label>
                  <Input
                    id="resolutionSource"
                    placeholder="e.g. CoinMarketCap"
                    value={formData.resolutionSource}
                    onChange={(e) => setFormData({ ...formData, resolutionSource: e.target.value })}
                    className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                    Settlement Asset
                  </Label>
                  <Select
                    value={formData.tokenId}
                    onValueChange={(value) => setFormData({ ...formData, tokenId: value })}
                  >
                    <SelectTrigger className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 rounded-2xl">
                      <SelectItem value={TOKEN_PROGRAM_ID} className="h-12 rounded-xl focus:bg-white/10">
                        <div className="flex items-center gap-2">
                          <span>Aleo Credits</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-primary/30 text-primary uppercase font-black">Native</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={USDCX_TOKEN_PROGRAM_ID} className="h-12 rounded-xl focus:bg-white/10">
                        <div className="flex items-center gap-2">
                          <span>USDCx Stable</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400 uppercase font-black">v4</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  type="submit"
                  disabled={!isFormValid}
                  className="w-full h-16 rounded-[2rem] btn-premium text-lg font-black group"
                >
                  <span className="tracking-widest uppercase">Validate Market Configuration</span>
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Preview Card */}
            <div className="glass-card p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText className="w-24 h-24 text-primary" />
              </div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Configuration Review</h2>
                <ZKBadge variant="proof" size="sm" />
              </div>

              <div className="grid gap-8 relative z-10">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Market Question</p>
                  <p className="text-2xl font-black text-white leading-tight">{formData.title}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Detailed Criteria</p>
                  <p className="text-sm text-white/70 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/10">
                    {formData.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Category</p>
                    <p className="text-sm font-bold text-white capitalize">{formData.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Asset</p>
                    <p className="text-sm font-bold text-primary font-mono">{formData.tokenId === TOKEN_PROGRAM_ID ? "ALEO" : "USDCx"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Deadline</p>
                    <p className="text-sm font-bold text-white">{formData.closingDate}</p>
                  </div>
                </div>

                {formData.resolutionSource && (
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Source of Truth</p>
                    <p className="text-sm font-bold text-white/80">{formData.resolutionSource}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Confirmation */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/80">ZK Privacy Protocol</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  "Creator Anonymity",
                  "Encrypted Wagers",
                  "On-chain Proofs"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1 h-16 rounded-2xl border-white/10 text-white font-bold hover:bg-white/5"
              >
                BACK TO EDIT
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-[2] h-16 rounded-2xl btn-premium text-lg font-black"
              >
                CONFIRM & DEPLOY
              </Button>
            </div>
          </motion.div>
        )}

        {step === "creating" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-20 text-center space-y-8 glass-card rounded-[3rem] border border-white/5"
          >
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-32 h-32 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center backdrop-blur-xl">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            </div>
            <div className="max-w-xs mx-auto space-y-3">
              <h3 className="text-2xl font-black text-white tracking-tight">Deploying Market</h3>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                Generating unique ZK-SNARK proofs and broadcasting transaction to Aleo Network...
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {[0, 150, 300].map((delay) => (
                <motion.div
                  key={delay}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: delay / 1000, repeatType: "reverse" }}
                  className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_theme(colors.primary.DEFAULT)]"
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center space-y-10 glass-card rounded-[3rem] border border-white/5 overflow-hidden relative"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-success/50 to-transparent" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="mx-auto w-24 h-24 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shadow-[0_0_40px_hsla(160,84%,45%,0.2)]"
            >
              <CheckCircle2 className="w-12 h-12 text-success" />
            </motion.div>

            <div className="space-y-3">
              <h3 className="text-3xl font-black text-white tracking-tight">Deployment Successful</h3>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                Your prediction market is now active and accessible across the network.
              </p>
              <div className="flex justify-center pt-2">
                <ZKBadge variant="verified" size="lg" animated />
              </div>
            </div>

            <div className="max-w-md mx-auto p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Transaction Signature</span>
                <code className="text-xs font-mono text-primary/80 break-all bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                  {creationResult?.transactionId || "aleo1tx..."}
                </code>
              </div>
            </div>

            <div className="flex gap-4 max-w-md mx-auto px-6">
              <Button
                variant="outline"
                onClick={() => navigate("/markets")}
                className="flex-1 h-14 rounded-2xl border-white/10 text-white font-bold"
              >
                MARKETS HUB
              </Button>
              <Button
                onClick={() => {
                  if (creationResult?.marketId) {
                    navigate(`/market/${creationResult.marketId}`);
                  }
                }}
                className="flex-[2] h-14 rounded-2xl btn-premium text-base font-black"
              >
                GO TO MARKET
              </Button>
            </div>
          </motion.div>
        )}

        {step === "failed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center space-y-8 glass-card rounded-[3rem] border border-white/5"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white tracking-tight">Deployment Error</h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">
                The network failed to process your request. Ensure your wallet has sufficient credits and try again.
              </p>
            </div>

            <div className="flex gap-4 max-w-sm mx-auto">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1 h-14 rounded-2xl border-white/10 text-white font-bold"
              >
                EDIT CONFIG
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1 h-14 rounded-2xl btn-premium bg-gradient-to-r from-destructive/80 to-destructive text-base font-black"
              >
                RETRY
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
