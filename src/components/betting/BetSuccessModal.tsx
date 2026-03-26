import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZKBadge } from "@/components/ui/ZKBadge";

interface BetSuccessModalProps {
  open: boolean;
  onClose: () => void;
  txId?: string | null;
  /**
   * Optional callback when user clicks "View My Bets".
   * If not provided the component will navigate to `/dashboard`.
   */
  onViewBets?: () => void;
}

export const BetSuccessModal = ({ open, onClose, txId, onViewBets }: BetSuccessModalProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleViewBets = () => {
    if (onViewBets) {
      onViewBets();
    } else {
      navigate("/dashboard");
    }
    onClose();
  };

  const handleCopy = async () => {
    if (!txId) return;
    try {
      await navigator.clipboard.writeText(txId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // ignore clipboard failures silently
      console.warn("Copy failed", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md glass-card rounded-[2.5rem] border border-white/5 p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black">Bet Placed</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-6 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="mx-auto w-20 h-20 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shadow-[0_0_30px_hsla(160,84%,45%,0.12)]"
          >
            <CheckCircle2 className="w-10 h-10 text-success" />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tight">Bet Successfully Placed</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your private bet has been submitted to the Aleo network. It will appear in your positions shortly.
            </p>
            <div className="flex justify-center pt-2">
              <ZKBadge variant="verified" size="lg" animated />
            </div>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
            <div className="flex-1 text-left">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 mb-1">Transaction Hash</div>
              <code className="text-xs font-mono text-primary break-all">{txId ?? "Pending..."}</code>
            </div>
            <Button variant="ghost" onClick={handleCopy} className="h-10 w-10 p-0 rounded-full">
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl">
              Close
            </Button>
            <Button onClick={handleViewBets} className="flex-[2] h-12 rounded-2xl btn-premium">
              View My Bets
            </Button>
          </div>

          {copied && (
            <div className="text-xs text-white/80 mt-2">Transaction hash copied to clipboard</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BetSuccessModal;
