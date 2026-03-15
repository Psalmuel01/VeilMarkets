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

    // Resolution begins after a fixed offset from close (e.g. 1 hour)
    const RESOLUTION_OFFSET_SECONDS = 3600;
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
      formData.resolutionSource
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Market</h1>
          <p className="text-muted-foreground">
            Launch a new private prediction market on Aleo
          </p>
        </div>

        {step === "form" && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Market Question
              </Label>
              <Input
                id="title"
                placeholder="Will Bitcoin reach $100,000 by end of 2024?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-muted/50 border-border/50 focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Phrase as a yes/no question with a clear resolution criteria
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description & Resolution Criteria</Label>
              <Textarea
                id="description"
                placeholder="This market resolves YES if Bitcoin's price exceeds $100,000 USD on any major exchange before December 31, 2024..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-muted/50 border-border/50 focus:border-primary/50 min-h-[120px]"
              />
            </div>

            {/* Category & Date Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Closing Date & Time
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="closingDate"
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) => setFormData({ ...formData, closingDate: e.target.value })}
                    className="flex-3 bg-muted/50 border-border/50 focus:border-primary/50"
                  />
                  <Input
                    id="closingTime"
                    type="time"
                    step="1"
                    value={formData.closingTime}
                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                    className="flex-2 bg-muted/50 border-border/50 focus:border-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Resolution Source */}
            <div className="space-y-2">
              <Label htmlFor="resolutionSource">Resolution Source (Optional)</Label>
              <Input
                id="resolutionSource"
                placeholder="e.g., CoinGecko, ESPN, Official Government Website"
                value={formData.resolutionSource}
                onChange={(e) => setFormData({ ...formData, resolutionSource: e.target.value })}
                className="bg-muted/50 border-border/50 focus:border-primary/50"
              />
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Privacy Note</p>
                <p className="text-muted-foreground">
                  As a market creator, your identity remains private. All betting activity
                  in your market will be encrypted using ZK proofs.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid}
              className="w-full btn-glow-primary"
            >
              Continue to Review
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.form>
        )}

        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Preview Card */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Market Preview</h2>
                <ZKBadge variant="proof" size="sm" />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Question</p>
                  <p className="font-medium">{formData.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{formData.description}</p>
                </div>
                <div className="flex gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <p className="font-medium capitalize">{formData.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Closes</p>
                    <p className="font-medium">{formData.closingDate} at {formData.closingTime}</p>
                  </div>
                </div>
                {formData.resolutionSource && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Resolution Source</p>
                    <p className="font-medium">{formData.resolutionSource}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Confirmation */}
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-success" />
                <h3 className="font-semibold">Privacy Guarantees</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Your identity as creator will be hidden
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  All bets will be encrypted with ZK proofs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Market resolution will be verifiable on-chain
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1"
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1 btn-glow-primary"
              >
                Create Market
              </Button>
            </div>
          </motion.div>
        )}

        {step === "creating" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center space-y-6"
          >
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Creating Market</h3>
              <p className="text-muted-foreground">
                Generating ZK proof and deploying to Aleo...
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto w-24 h-24 rounded-full bg-success/10 border-2 border-success flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-success" />
            </motion.div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Market Created!</h3>
              <p className="text-muted-foreground mb-4">
                Your private prediction market is now live on Aleo
              </p>
              <ZKBadge variant="verified" size="lg" animated />
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Market ID</div>
              <code className="text-sm font-mono text-primary break-all">
                {creationResult?.marketId || "Generating..."}
              </code>
              <div className="text-xs text-muted-foreground mt-3 mb-1">Transaction ID</div>
              <code className="text-xs font-mono text-muted-foreground break-all">
                {creationResult?.transactionId || "aleo1tx..."}
              </code>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/markets")}
                className="flex-1"
              >
                View All Markets
              </Button>
              <Button
                onClick={() => {
                  if (creationResult?.marketId) {
                    console.log("Navigating to market with ID:", creationResult.marketId);
                    navigate(`/market/${creationResult.marketId}`);
                  }
                }}
                className="flex-1 btn-glow-primary"
              >
                View Your Market
              </Button>
            </div>
          </motion.div>
        )}

        {step === "failed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto w-24 h-24 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center"
            >
              <AlertCircle className="w-12 h-12 text-destructive" />
            </motion.div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Transaction Failed</h3>
              <p className="text-muted-foreground mb-4">
                Your market could not be created. Please try again or check your wallet connection.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                className="flex-1"
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1 btn-glow-primary"
              >
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
