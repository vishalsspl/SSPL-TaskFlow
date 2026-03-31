import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden selection:bg-primary/30 flex flex-col">
            {/* Background Gradient */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[#102A04] via-[#050505] to-[#0A0A0A]" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 py-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight">TaskFlow</span>
                </div>

                <div className="hidden md:flex items-center gap-10 text-sm font-medium text-white/70">
                    <Link to="/about" className="hover:text-white transition-colors">About us</Link>
                    <Link to="/how-it-works" className="hover:text-white transition-colors">How it works</Link>
                    <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        className="text-sm font-bold border border-white/10 hover:bg-white/5 px-6 rounded-xl"
                        onClick={() => navigate('/login')}
                    >
                        Log In
                    </Button>
                    <Button
                        className="text-sm font-bold bg-white text-black hover:bg-white/90 px-6 rounded-xl shadow-xl shadow-white/5"
                        onClick={() => navigate('/signup')}
                    >
                        Sign Up
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 flex-1 flex flex-col justify-center items-center px-6">
                <div className="max-w-7xl w-full mx-auto text-center -mt-16">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-8 leading-[1.1]">
                        Manage Projects. Track Time. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">
                            Ship Together.
                        </span>
                    </h1>

                    <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                        Directly maps to your 3 core modules — Projects, Timesheets, and real-time Chat. Specific, not vague.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            variant="outline"
                            className="h-14 px-10 rounded-2xl text-lg font-bold border-white/10 bg-white/5 hover:bg-white/10 transition-all min-w-[180px]"
                            onClick={() => navigate('/how-it-works')}
                        >
                            Learn More
                        </Button>
                        <Button
                            className="h-14 px-10 rounded-2xl text-lg font-bold bg-white text-black hover:scale-105 transition-all shadow-2xl shadow-white/10 min-w-[180px]"
                            onClick={() => navigate('/signup')}
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
