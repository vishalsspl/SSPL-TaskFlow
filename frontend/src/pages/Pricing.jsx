import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, Users, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import api from '@/lib/api';

const Pricing = () => {
  const navigate = useNavigate();
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
    if (planName === "Enterprise") return "Custom";
    
    let basePricePerUser = 0;
    if (planName === "Starter") basePricePerUser = parseInt(settings?.starter_per_user_price) || 5000;
    if (planName === "Professional") basePricePerUser = parseInt(settings?.pro_per_user_price) || 15000;
    
    let total = basePricePerUser * teamSize;
    const discountPercent = parseInt(settings?.annual_discount_percent) || 17;
    
    if (billingCycle === 'annually') {
      total = total * (1 - discountPercent / 100);
    }
    
    return `₹${total.toLocaleString('en-IN')}`;
  };

  const plans = [
    {
      name: "Starter",
      price: calculatePrice("Starter"),
      description: "Perfect for individuals and small teams getting started",
      features: [
        `Up to ${teamSize > 30 ? teamSize : settings?.starter_max_users || '30'} team members`,
        `${settings?.starter_max_projects || '5'} projects`,
        "Basic task management",
        "1GB storage",
        "Email support",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Professional",
      price: calculatePrice("Professional"),
      description: "Best for growing teams that need more power",
      features: [
        `Up to ${teamSize > 100 ? teamSize : settings?.pro_max_users || '100'} team members`,
        `${settings?.pro_max_projects || '50'} projects`,
        "Advanced task management",
        "50GB storage",
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
      description: "For large organizations with advanced needs",
      features: [
        `Up to ${teamSize > 1000 ? teamSize : settings?.enterprise_max_users || '1000'} team members`,
        `${settings?.enterprise_max_projects || '500'} projects`,
        "Enterprise task management",
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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#48A111]/20 border-t-[#48A111] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans overflow-x-hidden selection:bg-primary/30 relative">
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#102A04] via-[#050505] to-[#0A0A0A]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#48A111]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A3E635]/5 blur-[150px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">TaskFlow</span>
        </Link>
      </nav>

      {/* Content Section */}
      <main className="relative z-10 px-6 py-20 pb-40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
              Choose Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">
                Growth Path
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-xl mx-auto font-medium leading-relaxed">
              Select the perfect plan for your team's needs. All plans include a 14-day free trial to get you started on your journey.
            </p>
          </div>

          {/* Pricing Controls - Jira Style */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16 animate-in fade-in duration-700 delay-200">
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 group focus-within:border-[#48A111]/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#48A111]/10 flex items-center justify-center border border-[#48A111]/20 group-hover:bg-[#48A111]/20 transition-all">
                <Users className="size-5 text-[#48A111]" />
              </div>
              <div className="flex flex-col">
                <Label htmlFor="team-size" className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Team Size</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="team-size"
                    type="number"
                    min="1"
                    max="10000"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-20 bg-transparent border-none p-0 h-auto text-xl font-black text-white focus-visible:ring-0 focus-visible:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-white/40 font-bold text-sm tracking-tight">users</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/10">
              <div className="flex flex-col items-end">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Bill me</Label>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black uppercase tracking-widest transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-white/40'}`}>Monthly</span>
                  <Switch 
                    checked={billingCycle === 'annually'}
                    onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')}
                    className="data-[state=checked]:bg-[#48A111]"
                  />
                  <span className={`text-xs font-black uppercase tracking-widest transition-colors ${billingCycle === 'annually' ? 'text-white' : 'text-white/40'}`}>Annually</span>
                </div>
              </div>
              <Badge className="bg-[#48A111]/20 text-[#A3E635] border-[#48A111]/30 text-[10px] font-black tracking-widest px-3 py-1 animate-pulse">
                SAVE {settings?.annual_discount_percent || '17'}%
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative z-10">
            {plans.map((plan, idx) => (
              <Card
                key={plan.name}
                className={`relative bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02] flex flex-col group animate-in fade-in slide-in-from-bottom-8 duration-700 delay-${idx * 100}`}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                {plan.popular && (
                  <>
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-[#48A111] to-[#A3E635] rounded-xl opacity-40 group-hover:opacity-100 transition duration-500 blur-sm" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#48A111] to-[#A3E635] text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-xl z-20">
                      Most Popular
                    </div>
                  </>
                )}
                
                <CardHeader className="relative z-10 pt-8">
                  <CardTitle className="text-xl font-black text-white tracking-tight leading-none mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-white/40 font-medium">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 flex-1">
                  <div className="mb-10">
                    <span className="text-5xl font-black text-white tracking-tighter">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <div className="flex flex-col">
                        <span className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1">
                          {billingCycle === 'monthly' ? 'per month' : 'per year / billed annually'}
                        </span>
                        <span className="text-white/20 font-medium text-[9px] mt-0.5">
                          Approx. ₹{(parseFloat(plan.price.replace(/[₹,]/g, '')) / teamSize).toFixed(0)} per user / month
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-white/70 group-hover:text-white transition-colors duration-300">
                        <div className="w-5 h-5 rounded-full bg-[#48A111]/10 flex items-center justify-center shrink-0 mt-0.5 border border-[#48A111]/20 group-hover:bg-[#48A111] group-hover:text-white transition-all">
                          <Check className="size-3 font-bold" />
                        </div>
                        <span className="text-sm font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="relative z-10 pb-8">
                  <Button
                    variant={plan.buttonVariant === 'default' ? 'default' : 'outline'}
                    className={`w-full h-12 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${
                      plan.popular 
                        ? "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5" 
                        : "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    }`}
                    onClick={() => navigate('/signup')}
                  >
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-24 text-center animate-in fade-in duration-1000 delay-500">
            <p className="text-white/40 text-lg font-medium">
              Need a custom solution for your large organization?{" "}
              <Link to="/legal" className="text-[#A3E635] hover:text-[#48A111] font-bold transition-all underline decoration-[#A3E635]/20 underline-offset-4">
                Let's talk business
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
