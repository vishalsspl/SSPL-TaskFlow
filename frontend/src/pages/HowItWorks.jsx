import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, ListChecks, BarChart3, Zap, Shield, Workflow, ArrowLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import MarketingNavbar from '@/components/layout/MarketingNavbar';

const HowItWorks = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme !== 'light';

  const steps = [
    {
      number: "01",
      title: "Set Your Workspace",
      description: "Create your organization and invite your team. Configure your core modules — Projects, Timesheets, and Chat — to match your team's unique rhythm.",
      icon: Users,
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000",
    },
    {
      number: "02",
      title: "Sync Your Workflow",
      description: "Map your projects, assign tasks, and start tracking time. Our real-time synchronization ensures everyone is on the same page, always.",
      icon: Workflow,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000",
    },
    {
      number: "03",
      title: "Master the Velocity",
      description: "Use real-time insights and chat to remove bottlenecks. Watch your team's productivity skyrocket as you ship together, faster than ever.",
      icon: Zap,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000",
    },
  ];

  const features = [
    {
      title: "Project Precision",
      description: "Manage complex projects with ease using our intuitive task tracking and milestone management system.",
      icon: ListChecks,
    },
    {
      title: "Time Intelligence",
      description: "Beautifully simple timesheets that provide deep insights into your team's effort and resource allocation.",
      icon: BarChart3,
    },
    {
      title: "Real-time Pulse",
      description: "Integrated team chat and notifications that keep everyone synchronized without the context switching.",
      icon: Shield,
    },
  ];

  return (
    <div className={cn(
      "min-h-screen font-sans overflow-x-hidden selection:bg-primary/30 relative transition-colors duration-500",
      isDarkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F8FCF6] text-slate-900"
    )}>
      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className={`absolute inset-0 transition-opacity duration-500 ${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E")]' : ''}`} />
          <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}`} />
          <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}`} />
      </div>

      <MarketingNavbar />

      {/* Content Section */}
      <main className="relative z-10 px-6 py-12 md:py-20 pb-40">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 md:mb-24 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
              How <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">TaskFlow</span> <br className="hidden md:block" />
              Powers Your Team
            </h1>
            <p className={cn(
              "text-base md:text-lg lg:text-xl max-w-2xl mx-auto font-medium leading-relaxed transition-colors duration-500 text-center",
              isDarkMode ? "text-white/60" : "text-slate-600"
            )}>
              Three simple steps to transform the way your team collaborates and achieves success through synchronized efficiency.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-24 md:space-y-40 mb-24 md:mb-40">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div
                  key={step.number}
                  className={cn(
                    "flex flex-col md:flex-row items-center gap-12 md:gap-20 animate-in fade-in slide-in-from-bottom-12 duration-1000",
                    isEven ? "" : "md:flex-row-reverse"
                  )}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="flex-1 space-y-6 md:space-y-8">
                    <div className="flex items-center gap-6">
                      <div className={cn("text-5xl md:text-7xl font-black tracking-tighter transition-all duration-500", isDarkMode ? "text-[#48A111] opacity-20" : "text-[#48A111] opacity-50")}>
                        {step.number}
                      </div>
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#48A111]/10 flex items-center justify-center border border-[#48A111]/20">
                        <Icon className="size-6 md:size-8 text-[#48A111]" />
                      </div>
                    </div>
                    <h2 className={cn("text-3xl md:text-5xl font-black tracking-tight transition-colors duration-500", isDarkMode ? "text-white" : "text-slate-900")}>
                      {step.title}
                    </h2>
                    <p className={cn("text-base md:text-lg font-medium leading-relaxed transition-colors duration-500", isDarkMode ? "text-white/60" : "text-slate-600")}>
                      {step.description}
                    </p>
                    <Button 
                      variant="ghost" 
                      className="group font-bold text-xs tracking-widest uppercase text-[#A3E635] hover:text-[#48A111] hover:bg-transparent p-0 flex items-center gap-2"
                      onClick={() => navigate('/signup')}
                    >
                      Start implementation <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 w-full relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#48A111]/20 to-[#A3E635]/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
                    <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group animate-in zoom-in duration-1000">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-[300px] md:h-[400px] object-cover group-hover:scale-110 transition-transform duration-1000"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-40 md:hidden" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features */}
          <div className="mt-24 md:mt-40">
            <div className="text-center mb-12 md:mb-20 animate-in fade-in duration-1000">
              <h2 className={cn("text-3xl md:text-5xl font-black mb-4 md:mb-6 tracking-tight transition-colors duration-500", isDarkMode ? "text-white" : "text-slate-900")}>Why Choose TaskFlow?</h2>
              <p className={cn("text-xs md:text-sm font-bold tracking-widest uppercase transition-colors duration-500", isDarkMode ? "text-white/40" : "text-slate-400")}>The synchronization your team has been waiting for.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                
                return (
                  <Card 
                    key={feature.title} 
                    className={cn(
                        "backdrop-blur-xl border-white/10 p-8 md:p-10 hover:bg-[#48A111]/5 transition-all group animate-in fade-in zoom-in duration-700",
                        isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-[#48A111]/10 shadow-lg"
                    )}
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#48A111]/10 flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform">
                      <Icon className="size-5 md:size-6 text-[#48A111]" />
                    </div>
                    <h3 className={cn("text-xl md:text-2xl font-black mb-3 md:mb-4 tracking-tight transition-colors duration-500", isDarkMode ? "text-white" : "text-slate-900")}>{feature.title}</h3>
                    <p className={cn("text-sm md:text-base font-medium leading-relaxed transition-colors duration-500", isDarkMode ? "text-white/60" : "text-slate-600")}>{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;
