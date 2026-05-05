import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, ShieldCheck, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/plans";
import { useAuthStore } from "@/store/authStore";

const UpgradePlanModal = ({ isOpen, onClose, limitType = 'resources' }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const plans = [
    {
      ...PLAN_LIMITS.STARTER,
      description: "Essential tools for small teams",
      color: "from-primary/20 to-primary/10",
      accent: "text-primary",
      border: "border-primary/30",
      icon: <Zap className="w-5 h-5" />,
      buttonText: "Get Started",
    },
    {
      ...PLAN_LIMITS.PRO,
      description: "Scale your business with ease",
      color: "from-primary/30 to-primary/20",
      accent: "text-primary",
      border: "border-primary/50",
      icon: <Sparkles className="w-5 h-5" />,
      buttonText: "Most Popular",
      popular: true,
    },
    {
      ...PLAN_LIMITS.ENTERPRISE,
      description: "Maximum power and security",
      color: "from-primary/20 to-primary/10",
      accent: "text-primary",
      border: "border-primary/30",
      icon: <ShieldCheck className="w-5 h-5" />,
      buttonText: "Contact Sales",
    },
  ];

  const handlePlanAction = () => {
    onClose();
    if (isAdmin) {
      navigate('/billing');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none max-h-[95vh] Montserrat">
        <ScrollArea className="h-full max-h-[90vh] w-full rounded-[2rem] border border-border/40 bg-card/95 backdrop-blur-3xl">
          <div className="relative w-full p-6 sm:p-10 overflow-hidden">
            {/* Decorative background elements using theme colors */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            <DialogHeader className="relative z-10 flex flex-col items-center text-center mb-10">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
                <Rocket className="w-6 h-6 text-primary-foreground" />
              </div>
              <DialogTitle className="text-2xl md:text-3xl font-black text-foreground tracking-[0.2em] mb-3 uppercase text-center w-full">
                PLANS & PRICING
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto font-medium leading-relaxed text-center">
                You've hit your <span className="text-primary font-bold">{limitType} limit</span> on the trial plan.
                <br className="hidden md:block" /> 
                {isAdmin 
                  ? 'Upgrade to unlock the full potential of SSPL TaskFlow.'
                  : 'Contact your organization Admin to upgrade the plan.'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-8">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative group flex flex-col p-6 rounded-[2rem] transition-all duration-500 hover:translate-y-[-4px]",
                    "bg-secondary/30 border backdrop-blur-md",
                    plan.border,
                    plan.popular ? "ring-1 ring-primary/30 shadow-2xl shadow-primary/5 bg-secondary/50" : ""
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-primary text-primary-foreground px-4 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg">
                      MOST POPULAR
                    </div>
                  )}

                  <div className={cn("p-3 rounded-xl w-fit mb-5 bg-gradient-to-br", plan.color)}>
                    <div className={plan.accent}>{plan.icon}</div>
                  </div>

                  <h3 className="text-lg font-black text-foreground mb-2 uppercase tracking-wider">{plan.name}</h3>
                  <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed font-medium min-h-[32px]">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-3xl font-black text-foreground tracking-tighter">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-xs text-muted-foreground/60 font-bold">/mo</span>}
                  </div>

                  <ul className="space-y-3 mb-10 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-[13px] text-foreground/80 font-medium">
                        <div className={cn("shrink-0 p-1 rounded-full bg-primary/10 text-primary")}>
                          <Check className="w-2.5 h-2.5 stroke-[4px]" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full rounded-xl py-6 font-black text-[10px] tracking-widest uppercase transition-all duration-300",
                      plan.popular 
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" 
                        : "bg-secondary hover:bg-secondary/80 text-foreground border border-border/20"
                    )}
                    onClick={handlePlanAction}
                    disabled={!isAdmin}
                  >
                    {isAdmin ? plan.buttonText : 'Contact Admin'}
                  </Button>
                </div>
              ))}
            </div>

            <div className="text-center relative z-10 pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 border border-border/20 text-muted-foreground text-[10px] font-bold mb-4">
                <ShieldCheck className="w-3 h-3 text-primary" />
                SECURE 256-BIT ENCRYPTED PAYMENTS
              </div>
              <p className="text-muted-foreground/60 text-[9px] uppercase tracking-[0.2em] font-black">
                Custom requirements? <button className="text-primary hover:underline ml-1" onClick={onClose}>Talk to sales</button>
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};


export default UpgradePlanModal;

