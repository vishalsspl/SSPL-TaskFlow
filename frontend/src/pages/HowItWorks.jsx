import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, ListChecks, BarChart3, Zap, Shield, Workflow, ArrowLeft, ChevronRight } from 'lucide-react';

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: "01",
      title: "Create Your Workspace",
      description: "Set up your team workspace in minutes. Invite team members and organize your projects with ease using our intuitive onboarding wizard.",
      icon: Users,
      image: "https://images.unsplash.com/photo-1758691736843-90f58dce465e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NzQyNDY2Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      number: "02",
      title: "Plan & Organize Tasks",
      description: "Break down projects into manageable tasks. Assign responsibilities, set deadlines, and track progress in real-time with dynamic Kanban boards.",
      icon: ListChecks,
      image: "https://images.unsplash.com/photo-1758876202468-5ffe0ee61f07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9qZWN0JTIwcGxhbm5pbmclMjB0YXNrJTIwYm9hcmR8ZW58MXx8fHwxNzc0MzMxNjY4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    },
    {
      number: "03",
      title: "Track & Analyze Progress",
      description: "Monitor team performance with powerful analytics. Make data-driven decisions to optimize productivity and identify bottlenecks early.",
      icon: BarChart3,
      image: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGFuYWx5dGljcyUyMGRhc2hib2FyZHxlbnwxfHx8fDE3NzQyNzEwMTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Experience blazing-fast performance that keeps your team moving forward without delays.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and security protocols to keep your data safe and secure.",
    },
    {
      icon: Workflow,
      title: "Custom Workflows",
      description: "Tailor workflows to match your team's unique processes and requirements.",
    },
  ];

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

      <main className="relative z-10 px-6 py-20 pb-40">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              How <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">TaskFlow</span> <br />
              Powers Your Team
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
              Three simple steps to transform the way your team collaborates and achieves success through synchronized efficiency.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-40 mb-40">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div
                  key={step.number}
                  className={`flex flex-col md:flex-row items-center gap-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 ${
                    isEven ? "" : "md:flex-row-reverse"
                  }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="flex-1 space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="text-[#48A111] text-7xl font-black opacity-20 tracking-tighter">
                        {step.number}
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-[#48A111]/10 flex items-center justify-center border border-[#48A111]/20">
                        <Icon className="size-8 text-[#48A111]" />
                      </div>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                      {step.title}
                    </h2>
                    <p className="text-white/60 text-lg font-medium leading-relaxed">
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
                  
                  <div className="flex-1 relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#48A111]/20 to-[#A3E635]/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
                    <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group animate-in zoom-in duration-1000">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-[400px] object-cover group-hover:scale-110 transition-transform duration-1000"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-40" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Features */}
          <div className="mt-40">
            <div className="text-center mb-20 animate-in fade-in duration-1000">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
                Built for <span className="text-[#48A111]">Velocity</span>
              </h2>
              <p className="text-white/40 font-medium tracking-widest uppercase text-xs">Why teams choose our synchronization engine</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                
                return (
                  <Card
                    key={feature.title}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 hover:bg-[#48A111]/5 transition-all duration-500 group animate-in fade-in slide-in-from-bottom-8"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div className="bg-gradient-to-br from-[#48A111] to-[#A3E635] w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-[#48A111]/20 group-hover:scale-110 transition-transform">
                      <Icon className="size-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-4 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-white/60 font-medium leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Join Us CTA */}
          <div className="mt-40 text-center animate-in zoom-in duration-1000">
            <h2 className="text-3xl font-black text-white mb-8 tracking-tight italic">
              Ready to synchronize your team?
            </h2>
            <Button
              className="h-16 px-16 rounded-2xl text-md font-black tracking-widest uppercase bg-white text-black hover:scale-105 transition-all shadow-2xl shadow-white/5"
              onClick={() => navigate('/signup')}
            >
              Get Started Now
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;
