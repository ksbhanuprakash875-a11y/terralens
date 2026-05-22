import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Crown, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeemed?: () => void;
}

const PLANS = [
  {
    name: "Credit Pack",
    credits: 25,
    price: "₹399",
    icon: Gift,
    description: "One-time +25 credits",
    color: "from-blue-500 to-cyan-500",
  },
  {
    name: "Credit Pack+",
    credits: 60,
    price: "₹699",
    icon: Sparkles,
    description: "One-time +60 credits",
    color: "from-purple-500 to-pink-500",
    popular: true,
  },
  {
    name: "Pro Plan",
    credits: 150,
    price: "₹799/mo",
    icon: Crown,
    description: "150 credits/month + priority",
    color: "from-amber-500 to-orange-500",
  },
];

const UpgradeModal = ({ open, onOpenChange, onRedeemed }: UpgradeModalProps) => {
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-code", {
        body: { code: redeemCode.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Code Redeemed! 🎉",
        description: data.message,
      });
      setRedeemCode("");
      onRedeemed?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Redeem Failed",
        description: err.message || "Invalid or expired code",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Get More Credits
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Purchase a credit pack or upgrade to Pro. Contact us to get a redeem code after payment.
          </DialogDescription>
        </DialogHeader>

        {/* Plan cards */}
        <div className="grid gap-3 mt-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-4 flex items-center gap-4 ${
                plan.popular
                  ? "border-primary bg-primary/5"
                  : "border-border/50 bg-muted/20"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2 right-3 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  POPULAR
                </span>
              )}
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center shrink-0`}
              >
                <plan.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
              <span className="text-sm font-bold text-foreground whitespace-nowrap">
                {plan.price}
              </span>
            </div>
          ))}
        </div>

        {/* Redeem section */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-foreground mb-2">
            Have a redeem code?
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter code e.g. TERRA-XXXX"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              className="font-mono tracking-wider"
              onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
            />
            <Button
              onClick={handleRedeem}
              disabled={!redeemCode.trim() || redeeming}
              size="sm"
              className="shrink-0"
            >
              {redeeming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Redeem"
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Pay via UPI/bank transfer and share the screenshot. We'll send you a redeem code within minutes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
