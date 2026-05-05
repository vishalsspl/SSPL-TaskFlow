import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Crown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  ArrowUpRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Users,
  FolderKanban,
  CalendarDays,
  Loader2,
  Check,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const BillingPage = () => {
  const { setHeader } = useHeaderStore();
  const { user, syncUser } = useAuthStore();
  const { toast } = useToast();
  const [planData, setPlanData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(null); // 'STARTER' | 'PRO' | null
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    setHeader('Billing & Plans', 'Manage your subscription and payment history');
    fetchData();
  }, [setHeader]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [planRes, historyRes] = await Promise.all([
        api.get('/billing/current-plan'),
        api.get('/billing/history').catch(() => ({ data: { data: [] } })),
      ]);
      setPlanData(planRes.data);
      setInvoices(historyRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      toast({
        title: 'Error',
        description: 'Could not load billing information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Razorpay Payment Handler ──────────────────────────────────────────
  const handleUpgrade = async (plan) => {
    try {
      setPaymentLoading(plan);

      // 1. Create order on backend
      const { data } = await api.post('/billing/create-order', {
        plan,
        billingCycle,
      });

      // 2. Open Razorpay checkout
      const options = {
        key: data.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'SSPL TaskFlow',
        description: `${plan} Plan - ${billingCycle} billing`,
        order_id: data.orderId,
        prefill: {
          name: user?.name || '',
          email: data.organization?.email || user?.email || '',
        },
        theme: {
          color: '#48A111',
        },
        handler: async (response) => {
          // 3. Verify payment on backend
          try {
            const verifyRes = await api.post('/billing/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: data.invoiceId,
            });

            toast({
              title: '🎉 Payment Successful!',
              description: `Your organization has been upgraded to the ${verifyRes.data.plan} plan.`,
            });

            // Refresh data
            await fetchData();
            // Sync user to get updated plan info
            await syncUser(api);
          } catch (verifyError) {
            toast({
              title: 'Verification Failed',
              description: 'Payment was received but verification failed. Please contact support.',
              variant: 'destructive',
            });
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(null);
            toast({
              title: 'Payment Cancelled',
              description: 'You can upgrade your plan anytime.',
            });
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (response) => {
        toast({
          title: 'Payment Failed',
          description: response.error?.description || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      });
      razorpayInstance.open();
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Upgrade Failed',
        description: error.response?.data?.error || 'Could not initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPaymentLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PAID: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      OVERDUE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      CANCELLED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return (
      <Badge className={`${styles[status] || styles.PENDING} px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase`}>
        {status}
      </Badge>
    );
  };

  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'STARTER': return <Zap className="w-5 h-5" />;
      case 'PRO': return <Sparkles className="w-5 h-5" />;
      case 'ENTERPRISE': return <ShieldCheck className="w-5 h-5" />;
      default: return <Crown className="w-5 h-5" />;
    }
  };

  const calculatePrice = (plan) => {
    if (!planData?.pricing) return '...';
    const price = plan === 'PRO' ? planData.pricing.pro : planData.pricing.starter;
    const users = planData.currentUsers || 1;
    let total = price * users;
    if (billingCycle === 'annually') {
      total = total * 12 * (1 - (planData.pricing.annualDiscount || 17) / 100);
    }
    return `₹ ${total.toLocaleString('en-IN')}`;
  };

  const getFeatures = (planName) => {
    const tiers = planData?.tiers || {};
    const tier = tiers[planName];
    if (planName === 'STARTER') {
      return [
        `Up to ${tier?.maxUsers || 30} Users`,
        `${tier?.maxProjects || 5} Projects`,
        'Kanban Board',
        'Tasks Management',
        'Tickets & Support',
        'Team Management',
        'Chat & Collaboration',
        'Email Support',
      ];
    }
    if (planName === 'PRO') {
      return [
        `Up to ${tier?.maxUsers || 100} Users`,
        `${tier?.maxProjects || 50} Projects`,
        'Everything in Starter',
        'Performance Analytics',
        'Timesheets & Tracking',
        'GitHub Integration',
        'Activity Logs & Audit',
        'Priority Support',
      ];
    }
    return [
      `Up to ${tier?.maxUsers || 1000}+ Users`,
      `${tier?.maxProjects || 500}+ Projects`,
      'Everything in Pro',
      'SSO & SAML',
      'Custom Integrations',
      'Dedicated Account Manager',
      '24/7 Priority Support',
      'SLA Guarantee',
    ];
  };

  const plans = [
    {
      name: 'STARTER',
      title: 'Starter',
      description: 'Essential tools for small teams',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-blue-500/20 to-blue-600/10',
      accent: 'text-blue-500',
      border: 'border-blue-500/30',
      btnClass: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20',
    },
    {
      name: 'PRO',
      title: 'Professional',
      description: 'Scale your business with ease',
      icon: <Sparkles className="w-6 h-6" />,
      popular: true,
      color: 'from-primary/30 to-primary/10',
      accent: 'text-primary',
      border: 'border-primary/50',
      btnClass: 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20',
    },
    {
      name: 'ENTERPRISE',
      title: 'Enterprise',
      description: 'Maximum power and security',
      icon: <ShieldCheck className="w-6 h-6" />,
      color: 'from-purple-500/20 to-purple-600/10',
      accent: 'text-purple-500',
      border: 'border-purple-500/30',
      btnClass: 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Loading billing...</p>
        </div>
      </div>
    );
  }

  const currentPlan = planData?.plan || 'FREE';
  const planOrder = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* ── Current Plan Overview ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Card */}
        <Card className="lg:col-span-2 rounded-[2rem] border-border/40 bg-gradient-to-br from-primary/5 via-background to-primary/5 backdrop-blur-xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          <CardHeader className="relative z-10 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                  {getPlanIcon(currentPlan)}
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">
                    {currentPlan === 'FREE' ? 'Free Trial' : `${currentPlan} Plan`}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-semibold tracking-widest uppercase opacity-60">
                    Current Subscription
                  </CardDescription>
                </div>
              </div>
              <Badge className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase",
                planData?.status === 'ACTIVE'
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : planData?.status === 'TRIAL'
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
              )}>
                {planData?.status || 'TRIAL'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Users', value: `${planData?.currentUsers || 0}/${planData?.maxUsers || 10}`, icon: Users, color: 'text-blue-500' },
                { label: 'Projects', value: `${planData?.maxProjects || 5} max`, icon: FolderKanban, color: 'text-emerald-500' },
                {
                  label: 'Renews',
                  value: planData?.currentPeriodEnd
                    ? format(new Date(planData.currentPeriodEnd), 'MMM dd, yyyy')
                    : 'N/A',
                  icon: CalendarDays,
                  color: 'text-amber-500',
                },
                { label: 'Plan Tier', value: currentPlan, icon: Crown, color: 'text-primary' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20">
                  <div className={`w-9 h-9 rounded-xl bg-background border border-border/40 flex items-center justify-center ${stat.color} shadow-inner shrink-0`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">{stat.label}</p>
                    <p className="text-sm font-bold text-foreground truncate">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="rounded-[2rem] border-border/40 bg-white/50 dark:bg-black/40 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold tracking-tight">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: 'Total Paid',
                value: `₹${invoices.filter(i => i.status === 'PAID').reduce((a, c) => a + Number(c.amount), 0).toLocaleString('en-IN')}`,
                icon: CheckCircle2,
                color: 'text-emerald-500',
              },
              {
                label: 'Pending',
                value: `₹${invoices.filter(i => i.status === 'PENDING').reduce((a, c) => a + Number(c.amount), 0).toLocaleString('en-IN')}`,
                icon: Clock,
                color: 'text-amber-500',
              },
              {
                label: 'Total Invoices',
                value: invoices.length,
                icon: CreditCard,
                color: 'text-primary',
              },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/10">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-background border border-border/40 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{stat.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Upgrade Plans ─────────────────────────────────────────────── */}
      {currentPlan !== 'ENTERPRISE' && (
        <Card className="rounded-2xl md:rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          <CardHeader className="relative z-10 p-4 sm:p-8 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                  <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">Upgrade Your Plan</CardTitle>
                  <CardDescription className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase opacity-60">
                    Unlock more power for your team
                  </CardDescription>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-secondary/50 border border-border/20 w-fit">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase transition-all",
                    billingCycle === 'monthly'
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annually')}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase transition-all",
                    billingCycle === 'annually'
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annually
                  <Badge className="ml-1 sm:ml-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0">
                    Save {planData?.pricing?.annualDiscount || 17}%
                  </Badge>
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 p-4 sm:p-8 pt-2 sm:pt-4">
            {/* ── Mobile: Full-width Compact Stacked Cards ── */}
            <div className="md:hidden space-y-4">
              {plans.map((plan) => {
                const isCurrentPlan = currentPlan === plan.name;
                const isDowngrade = planOrder[plan.name] < planOrder[currentPlan];
                const features = getFeatures(plan.name);

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative rounded-2xl overflow-hidden transition-all",
                      "bg-secondary/30 border backdrop-blur-md",
                      plan.border,
                      plan.popular ? "ring-1 ring-primary/30 bg-secondary/50" : "",
                      isCurrentPlan ? "ring-2 ring-primary/50" : ""
                    )}
                  >
                    {/* Top badge */}
                    {(plan.popular && !isCurrentPlan) && (
                      <div className="bg-primary text-white text-center py-1 text-[8px] font-bold tracking-[0.2em] uppercase">
                        MOST POPULAR
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="bg-emerald-500 text-white text-center py-1 text-[8px] font-bold tracking-[0.2em] uppercase">
                        CURRENT PLAN
                      </div>
                    )}

                    <div className="p-4">
                      {/* Header: icon + name + price row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-2 rounded-lg bg-gradient-to-br", plan.color)}>
                            <div className={cn(plan.accent, "[&>svg]:w-4 [&>svg]:h-4")}>{plan.icon}</div>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide leading-tight">{plan.title}</h3>
                            <p className="text-[9px] text-muted-foreground font-medium">{plan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-extrabold text-foreground tracking-tight leading-tight">
                            {plan.name === 'ENTERPRISE' ? 'Custom' : calculatePrice(plan.name)}
                          </div>
                          {plan.name !== 'ENTERPRISE' && (
                            <span className="text-[9px] text-muted-foreground/60 font-medium">
                              per {billingCycle === 'monthly' ? 'month' : 'year'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Features as pill tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {features.map((feature, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 border border-border/30 text-[10px] text-foreground/70 font-medium">
                            <Check className="w-2.5 h-2.5 text-primary stroke-[3px] shrink-0" />
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* CTA */}
                      <Button
                        size="sm"
                        className={cn(
                          "w-full rounded-lg py-2.5 font-bold text-[9px] tracking-widest uppercase gap-1.5",
                          isCurrentPlan
                            ? "bg-secondary text-muted-foreground cursor-default"
                            : isDowngrade
                              ? "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                              : plan.btnClass
                        )}
                        disabled={isCurrentPlan || isDowngrade || paymentLoading !== null}
                        onClick={() => {
                          if (plan.name === 'ENTERPRISE') {
                            window.location.href = 'mailto:sales@sspl.com?subject=Enterprise Plan Inquiry';
                            return;
                          }
                          handleUpgrade(plan.name);
                        }}
                      >
                        {paymentLoading === plan.name ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : isDowngrade ? (
                          'Downgrade N/A'
                        ) : plan.name === 'ENTERPRISE' ? (
                          <>Contact Sales <ArrowRight className="w-3 h-3" /></>
                        ) : (
                          <>Upgrade Now <ArrowUpRight className="w-3 h-3" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop: 3-Column Grid ── */}
            <div className="hidden md:grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = currentPlan === plan.name;
                const isDowngrade = planOrder[plan.name] < planOrder[currentPlan];

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative group flex flex-col p-6 rounded-[2rem] transition-all duration-500 hover:translate-y-[-4px]",
                      "bg-secondary/30 border backdrop-blur-md",
                      plan.border,
                      plan.popular ? "ring-1 ring-primary/30 shadow-2xl bg-secondary/50" : "",
                      isCurrentPlan ? "ring-2 ring-primary/50 shadow-xl" : ""
                    )}
                  >
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-primary text-white px-4 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg">
                        MOST POPULAR
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] bg-emerald-500 text-white px-4 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg">
                        CURRENT PLAN
                      </div>
                    )}

                    <div className={cn("p-3 rounded-xl w-fit mb-4 bg-gradient-to-br", plan.color)}>
                      <div className={plan.accent}>{plan.icon}</div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1 uppercase tracking-wider">{plan.title}</h3>
                    <p className="text-[11px] text-muted-foreground mb-5 leading-relaxed font-medium">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-extrabold text-foreground tracking-tighter">
                        {plan.name === 'ENTERPRISE' ? 'Custom' : calculatePrice(plan.name)}
                      </span>
                      {plan.name !== 'ENTERPRISE' && (
                        <span className="text-xs text-muted-foreground/60 font-bold">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {getFeatures(plan.name).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[12px] text-foreground/80 font-medium">
                          <div className="shrink-0 p-0.5 rounded-full bg-primary/10 text-primary">
                            <Check className="w-2.5 h-2.5 stroke-[4px]" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full rounded-xl py-5 font-bold text-[10px] tracking-widest uppercase transition-all duration-300 gap-2",
                        isCurrentPlan
                          ? "bg-secondary text-muted-foreground cursor-default"
                          : isDowngrade
                            ? "bg-secondary text-muted-foreground/50 cursor-not-allowed"
                            : plan.btnClass
                      )}
                      disabled={isCurrentPlan || isDowngrade || paymentLoading !== null}
                      onClick={() => {
                        if (plan.name === 'ENTERPRISE') {
                          window.location.href = 'mailto:sales@sspl.com?subject=Enterprise Plan Inquiry';
                          return;
                        }
                        handleUpgrade(plan.name);
                      }}
                    >
                      {paymentLoading === plan.name ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : isDowngrade ? (
                        'Downgrade N/A'
                      ) : plan.name === 'ENTERPRISE' ? (
                        <>Contact Sales <ArrowRight className="w-3.5 h-3.5" /></>
                      ) : (
                        <>Upgrade Now <ArrowUpRight className="w-3.5 h-3.5" /></>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-6 text-muted-foreground/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] uppercase">
                Secure 256-bit encrypted payments via Razorpay
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Payment History ────────────────────────────────────────────── */}
      <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight">Payment History</CardTitle>
              <CardDescription className="text-[10px] font-semibold tracking-widest uppercase opacity-60">
                All invoices and transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent bg-muted/30">
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 pl-8">Invoice</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70">Plan</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-center">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-center">Date</TableHead>
                  <TableHead className="h-14 text-[10px] font-semibold tracking-widest uppercase text-foreground/70 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <CreditCard className="w-8 h-8 text-muted-foreground/20" />
                        <p className="text-sm font-bold opacity-40 italic">No payment history yet</p>
                        <p className="text-[10px] text-muted-foreground/40">Payments will appear here after your first upgrade</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-b border-border/20 hover:bg-primary/[0.04] transition-all">
                      <TableCell className="py-5 pl-8">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[10px] font-bold text-primary/70 tracking-tighter bg-primary/5 px-2 py-0.5 rounded-md w-fit">
                            {invoice.invoiceNumber || `#${invoice.id.slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 truncate max-w-[180px]">
                            {invoice.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 border-primary/20 text-primary/70 bg-primary/5">
                          {invoice.plan || 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <span className="text-sm font-bold text-foreground">
                          ₹{Number(invoice.amount).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-5 text-center">
                        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">
                          {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center justify-center">
                          {getStatusBadge(invoice.status)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;
