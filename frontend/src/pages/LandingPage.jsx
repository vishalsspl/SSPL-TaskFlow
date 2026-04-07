import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import MarketingNavbar from '@/components/layout/MarketingNavbar';

const LandingPage = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme !== 'light';

    return (
        <div className={cn(
            "min-h-screen font-sans overflow-hidden flex flex-col transition-colors duration-500",
            isDarkMode ? "bg-[#0A0A0A] text-white selection:bg-primary/30" : "bg-[#F8FCF6] text-slate-900 selection:bg-primary/30"
        )}>
            {/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute inset-0 transition-opacity duration-500 ${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E")]' : ''}`} />
                <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}`} />
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}`} />
            </div>

            <MarketingNavbar />

            {/* Hero Section */}
            <section className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 pb-20 md:pb-0 font-sans">
                <div className="max-w-7xl w-full mx-auto text-center -mt-8 md:-mt-16">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 md:mb-8 leading-[1.1] md:leading-[1.1] animate-in fade-in slide-in-from-top-10 duration-1000">
                        Manage Projects. Track Time. <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">
                            Ship Together.
                        </span>
                    </h1>

                    <p className={cn(
                        "text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-8 md:mb-12 font-medium leading-relaxed transition-colors animate-in fade-in slide-in-from-top-12 duration-1000 delay-200",
                        isDarkMode ? "text-white/60" : "text-slate-600"
                    )}>
                        Directly maps to your 3 core modules — Projects, Timesheets, and real-time Chat. Specific, not vague.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full sm:w-auto h-14 px-10 rounded-2xl text-lg font-bold transition-all min-w-[180px]",
                                isDarkMode 
                                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" 
                                    : "border-[#48A111]/20 bg-white hover:bg-[#48A111]/5 text-slate-900"
                            )}
                            onClick={() => navigate('/how-it-works')}
                        >
                            Learn More
                        </Button>
                        <Button
                            className={cn(
                                "w-full sm:w-auto h-14 px-10 rounded-2xl text-lg font-bold transition-all shadow-2xl min-w-[180px]",
                                isDarkMode 
                                    ? "bg-white text-black hover:bg-white/90 shadow-white/5" 
                                    : "bg-[#48A111] text-white hover:bg-[#48A111]/90 shadow-[#48A111]/20"
                            )}
                            onClick={() => navigate('/signup')}
                        >
                            Sign Up
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
