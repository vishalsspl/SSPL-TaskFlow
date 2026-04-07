import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, Users, Calendar, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MarketingNavbar from '@/components/layout/MarketingNavbar';

import api from '@/lib/api';

const Pricing = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme !== 'light';
  const [settings, setSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [teamSize, setTeamSize] = React.useState(25);
  const [billingCycle, setBillingCycle] = React.useState('monthly');

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/public/settings');
        setSettings(res.data);
      } catch (error) {
        console.error('Failed to fetch pricing settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const calculatePrice = (planName) => {
    if (planName === "Free") return "₹0";
    if (planName === "Enterprise") return "Custom";
    
    let basePricePerUser = 0;
    if (planName === "Starter") basePricePerUser = parseInt(settings?.starter_per_user_price) || 200;
    if (planName === "Professional") basePricePerUser = parseInt(settings?.pro_per_user_price) || 600;
    
    let total = basePricePerUser * teamSize;
    const discountPercent = parseInt(settings?.annual_discount_percent) || 17;
    
    if (billingCycle === 'annually') {
      total = total * (1 - discountPercent / 100);
    }
    
    return `₹${total.toLocaleString('en-IN')}`;
  };

  const plans = [
    {
      name: "Free",
      price: "₹0",
      description: "Perfect for individuals and small teams starting out",
      features: [
        `Up to 10 team members`,
        `3 projects`,
        "Basic task management",
        "500MB storage",
        "Community support",
      ],
      buttonText: "Sign Up",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Starter",
      price: calculatePrice("Starter"),
      description: "Better for growing teams with more tasks",
      features: [
        `Up to ${teamSize > 30 ? teamSize : settings?.starter_max_users || '30'} members`,
        `${settings?.starter_max_projects || '15'} projects`,
        "Advanced task features",
        "5GB storage",
        "Email support",
      ],
      buttonText: "Sign Up",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Professional",
      price: calculatePrice("Professional"),
      description: "Best for teams that need more power",
      features: [
        `Up to ${teamSize > 100 ? teamSize : settings?.pro_max_users || '100'} members`,
        `${settings?.pro_max_projects || '100'} projects`,
        "Full task management",
        "100GB storage",
        "Priority support",
        "Custom workflows",
        "Analytics & reporting",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "default",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with complex needs",
      features: [
        `Unlimited team members`,
        `Unlimited projects`,
        "All pro features",
        "1TB storage",
        "24/7 dedicated support",
        "Custom integrations",
        "Advanced security",
        "SLA guarantee",
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline",
      popular: false,
    },
  ];

  if (loading) return (
    <div className={cn("min-h-screen flex items-center justify-center transition-colors duration-500", isDarkMode ? "bg-[#0A0A0A]" : "bg-[#F8FCF6]")}>
      <div className="w-10 h-10 border-4 border-[#48A111]/20 border-t-[#48A111] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={cn(
        "min-h-screen font-sans overflow-x-hidden selection:bg-primary/30 relative transition-colors duration-500",
        isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8FCF6] text-slate-900'
    )}>
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className={`absolute inset-0 transition-opacity duration-500 ${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E")]' : ''}`} />
          <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}`} />
          <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}`} />
      </div>

      <MarketingNavbar />

      {/* Content Section */}
      <main className="relative z-10 px-6 py-12 md:py-20 pb-40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className={cn("text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight transition-colors duration-500", isDarkMode ? "text-white" : "text-slate-900")}>
              Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">Pricing</span> <br className="hidden md:block" />
              for Every Team
            </h1>
            <p className={cn("text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed transition-colors duration-500", isDarkMode ? "text-white/60" : "text-slate-600")}>
              Simple, flexible pricing that scales as you grow. Choose the plan that's right for your organization's rhythm.
            </p>
          </div>

          {/* Pricing Controls */}
          <div className={cn(
            "p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border backdrop-blur-xl mb-12 md:mb-20 animate-in fade-in zoom-in duration-700",
            isDarkMode ? "bg-white/5 border-white/10 shadow-2xl shadow-[#48A111]/5" : "bg-white border-[#48A111]/20 shadow-xl"
          )}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#48A111]/10 flex items-center justify-center border border-[#48A111]/20">
                    <Users className="size-5 text-[#48A111]" />
                  </div>
                  <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>Team Size Estimation</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <Label className={cn("font-bold text-[10px] md:text-xs uppercase tracking-widest", isDarkMode ? "text-white/40" : "text-slate-400")}>Number of Users</Label>
                    <span className="text-2xl font-black text-[#48A111] tabular-nums">{teamSize}</span>
                  </div>
                  <Input 
                    type="range" 
                    min="1" 
                    max="500" 
                    value={teamSize} 
                    onChange={(e) => setTeamSize(parseInt(e.target.value))}
                    className="h-2 bg-[#48A111]/10 rounded-lg appearance-none cursor-pointer accent-[#48A111] focus:ring-0"
                  />
                </div>
              </div>
              
              <div className="flex flex-col md:items-end gap-6">
                <div className="flex items-center justify-between md:justify-end w-full gap-4">
                  <span className={cn("text-[10px] md:text-xs font-bold tracking-widest transition-colors", billingCycle === 'monthly' ? (isDarkMode ? "text-white" : "text-slate-900") : (isDarkMode ? "text-white/40" : "text-slate-400"))}>MONTHLY</span>
                  <Switch 
                    checked={billingCycle === 'annually'} 
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
                    className="bg-[#48A111]/20 data-[state=checked]:bg-[#48A111]"
                  />
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] md:text-xs font-bold tracking-widest transition-colors", billingCycle === 'annually' ? (isDarkMode ? "text-white" : "text-slate-900") : (isDarkMode ? "text-white/40" : "text-slate-400"))}>ANNUALLY</span>
                    <Badge variant="secondary" className="bg-[#48A111] text-white border-0 font-black text-[10px] py-0">-{settings?.annual_discount_percent || '17'}%</Badge>
                  </div>
                </div>
                <div className={cn("px-4 md:px-6 py-2 md:py-3 rounded-2xl border flex items-center justify-center md:justify-start gap-3 w-full md:w-auto", isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                  <Calendar className="size-4 text-[#48A111]" />
                  <span className={cn("text-xs md:text-sm font-black", isDarkMode ? "text-white/60" : "text-slate-600")}>
                    Billed {billingCycle === 'monthly' ? 'every month' : 'at once each year'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto relative z-10">
            {plans.map((plan, idx) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative backdrop-blur-xl shadow-2xl transition-all duration-500 hover:scale-[1.02] flex flex-col group animate-in fade-in slide-in-from-bottom-8",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-[#48A111]/10 shadow-xl"
                )}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                {plan.popular && (
                  <>
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-[#48A111] to-[#A3E635] rounded-xl opacity-40 group-hover:opacity-100 transition duration-500 blur-sm" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#48A111] to-[#A3E635] text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-xl z-20">
                      Most Popular
                    </div>
                  </>
                )}
                
                <CardHeader className="relative z-10 pt-6 pb-4">
                  <CardTitle className={cn("text-xl font-black tracking-tight leading-none mb-1.5 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{plan.name}</CardTitle>
                  <CardDescription className={cn("text-xs font-medium leading-relaxed transition-colors", isDarkMode ? "text-white/40" : "text-slate-500")}>
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 flex-1 pt-0">
                  <div className="mb-8">
                    <span className={cn("text-3xl md:text-4xl font-black tracking-tighter transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{plan.price}</span>
                    {plan.price !== "Custom" && plan.price !== "₹0" && (
                      <div className="flex flex-col">
                        <span className={cn("font-bold uppercase tracking-widest text-[8px] mt-1 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")}>
                          {billingCycle === 'monthly' ? 'per month' : 'per year / billed annually'}
                        </span>
                        <span className={cn("font-medium text-[8px] mt-0.5 transition-colors", isDarkMode ? "text-white/20" : "text-slate-500")}>
                          Approx. ₹{(parseFloat(plan.price.replace(/[₹,]/g, '')) / teamSize).toFixed(0)} per user / month
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className={cn("flex items-start gap-2.5 transition-colors duration-300", isDarkMode ? "text-white/70 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900")}>
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-all",
                          isDarkMode ? "bg-[#48A111]/10 border-[#48A111]/20 group-hover:bg-[#48A111] group-hover:text-white" : "bg-[#48A111]/5 border-[#48A111]/20 group-hover:bg-[#48A111] group-hover:text-white"
                        )}>
                          <Check className="size-2.5 font-bold" />
                        </div>
                        <span className="text-[11px] font-medium leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="relative z-10 pb-6 pt-0">
                  <Button
                    variant={plan.buttonVariant === 'default' ? 'default' : 'outline'}
                    className={cn(
                        "w-full h-11 md:h-12 rounded-xl text-[10px] md:text-xs font-black tracking-widest uppercase transition-all duration-300",
                        plan.popular 
                          ? (isDarkMode ? "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5" : "bg-[#48A111] text-white hover:bg-[#48A111]/90 shadow-xl shadow-[#48A111]/10") 
                          : (isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900")
                    )}
                    onClick={() => navigate('/signup')}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-16 md:mt-24 text-center animate-in fade-in duration-1000 delay-500">
            <p className={cn("text-sm md:text-base font-medium transition-colors", isDarkMode ? "text-white/40" : "text-slate-500")}>
              Need a custom solution for your organization?{" "}
              <Link to="/contact" className="text-[#A3E635] hover:text-[#48A111] font-bold transition-all underline decoration-[#A3E635]/20 underline-offset-4">
                Contact our sales team
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
