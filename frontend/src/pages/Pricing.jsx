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

import { Slider } from '@/components/ui/slider';
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
    if (planName === "Starter") basePricePerUser = parseInt(settings?.starter_per_user_price) || 10;
    if (planName === "Professional") basePricePerUser = parseInt(settings?.pro_per_user_price) || 10;
    
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
        "Kanban Board",
        "Basic Task Management",
        "Community Support",
      ],
      buttonText: "Sign Up",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Starter",
      price: calculatePrice("Starter"),
      description: "Essential tools for growing teams",
      features: [
        `Up to ${teamSize > 30 ? teamSize : settings?.starter_max_users || '30'} members`,
        `${settings?.starter_max_projects || '5'} projects`,
        "Kanban Board",
        "Tasks Management",
        "Tickets & Support",
        "Team Management",
        "Chat & Collaboration",
        "Email Support",
      ],
      buttonText: "Sign Up",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Professional",
      price: calculatePrice("Professional"),
      description: "Full power for scaling teams",
      features: [
        `Up to ${teamSize > 100 ? teamSize : settings?.pro_max_users || '100'} members`,
        `${settings?.pro_max_projects || '50'} projects`,
        "Everything in Starter",
        "Performance Analytics",
        "Timesheets & Tracking",
        "GitHub Integration",
        "Activity Logs & Audit",
        "Priority Support",
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
        "Everything in Pro",
        "SSO & SAML",
        "Custom Integrations",
        "Dedicated Account Manager",
        "24/7 Priority Support",
        "SLA Guarantee",
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

          {/* Advanced Pricing Controls */}
          <div className="flex justify-center mb-16 md:mb-24 animate-in fade-in zoom-in duration-1000">
            <div className={cn(
              "p-1.5 md:p-2 rounded-[2rem] md:rounded-full border backdrop-blur-3xl flex flex-col md:flex-row items-center gap-1 shadow-2xl transition-all duration-500",
              isDarkMode ? "bg-white/5 border-white/10 shadow-[#48A111]/10" : "bg-white/80 border-[#48A111]/20 shadow-xl"
            )}>
              {/* User Selector Block */}
              <div className={cn(
                "flex items-center gap-6 px-6 py-4 md:py-3 rounded-[1.5rem] md:rounded-full transition-all duration-500 min-w-[300px] md:min-w-[400px]",
                isDarkMode ? "bg-white/5" : "bg-slate-50/50"
              )}>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-[#48A111] to-[#A3E635] flex items-center justify-center text-white shadow-lg shadow-[#48A111]/25">
                    <Users className="size-4.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] leading-none", isDarkMode ? "text-white/40" : "text-slate-400")}>Team Size</span>
                    <span className="text-sm font-black text-primary mt-0.5">{teamSize} Users</span>
                  </div>
                </div>
                
                <Slider 
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  max={500}
                  className="flex-1"
                />
              </div>

              {/* Billing Toggle Block */}
              <div className="flex items-center gap-2 px-2 py-4 md:py-0 w-full md:w-auto">
                <div 
                  className={cn(
                    "flex-1 md:flex-none flex items-center gap-4 px-6 md:px-8 py-4 md:py-3 rounded-[1.5rem] md:rounded-full transition-all duration-500 cursor-pointer",
                    billingCycle === 'monthly' ? (isDarkMode ? "bg-white/10 shadow-lg" : "bg-white shadow-md") : ""
                  )}
                  onClick={() => setBillingCycle('monthly')}
                >
                  <span className={cn("text-[10px] font-black tracking-[0.15em] whitespace-nowrap", billingCycle === 'monthly' ? "text-primary" : "opacity-40")}>MONTHLY</span>
                </div>

                <div className="px-2 py-3">
                  <Switch 
                    checked={billingCycle === 'annually'} 
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
                    className="data-[state=checked]:bg-[#48A111] scale-110"
                  />
                </div>

                <div 
                  className={cn(
                    "flex-1 md:flex-none flex items-center gap-3 px-6 md:px-8 py-4 md:py-3 rounded-[1.5rem] md:rounded-full transition-all duration-500 cursor-pointer",
                    billingCycle === 'annually' ? (isDarkMode ? "bg-white/10 shadow-lg" : "bg-white shadow-md") : ""
                  )}
                  onClick={() => setBillingCycle('annually')}
                >
                  <span className={cn("text-[10px] font-black tracking-[0.15em] whitespace-nowrap", billingCycle === 'annually' ? "text-primary" : "opacity-40")}>ANNUALLY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
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
