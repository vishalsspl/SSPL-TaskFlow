import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Heart, Lightbulb, Users, ArrowLeft, History } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import MarketingNavbar from '@/components/layout/MarketingNavbar';

const AboutUs = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme !== 'light';

    const values = [
        {
            icon: Target,
            title: "Mission-Driven",
            description: "We're committed to empowering teams worldwide with tools that make collaboration effortless and productive.",
        },
        {
            icon: Heart,
            title: "Customer First",
            description: "Our users are at the heart of everything we do. Their success is our success, and we're dedicated to supporting them.",
        },
        {
            icon: Lightbulb,
            title: "Innovation",
            description: "We constantly evolve and adapt, bringing cutting-edge features that solve real problems for modern teams.",
        },
        {
            icon: Users,
            title: "Collaboration",
            description: "We believe in the power of teamwork and build products that bring people together to achieve amazing things.",
        },
    ];

    const stats = [
        { number: "50K+", label: "Active Teams" },
        { number: "2M+", label: "Tasks Completed" },
        { number: "150+", label: "Countries" },
        { number: "99.9%", label: "Uptime" },
    ];

    const team = [
        {
            name: "Sarah Chen",
            role: "CEO & Co-founder",
            image: "https://images.unsplash.com/photo-1758873268631-fa944fc5cad2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwdGVhbSUyMHByb2Zlc3Npb25hbHN8ZW58MXx8fHwxNzc0MzEwMzY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        },
        {
            name: "Michael Rodriguez",
            role: "CTO & Co-founder",
            image: "https://images.unsplash.com/photo-1758630737900-a28682c5aa69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwb2ZmaWNlJTIwbW9kZXJufGVufDF8fHx8MTc3NDMzMTczMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        },
        {
            name: "Emily Thompson",
            role: "Head of Product",
            image: "https://images.unsplash.com/photo-1573757056004-065ad36e2cf4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGlubm92YXRpb24lMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3NDI1NDcxM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        },
    ];

    return (
        <div className={cn(
            "min-h-screen font-sans overflow-x-hidden selection:bg-primary/30 relative transition-colors duration-500",
            isDarkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F8FCF6] text-slate-900"
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
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16 md:mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
                            About <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">
                                TaskFlow
                            </span>
                        </h1>
                        <p className={cn(
                            "transition-colors duration-500 text-base md:text-lg lg:text-xl max-w-3xl mx-auto font-medium leading-relaxed",
                            isDarkMode ? "text-white/60" : "text-slate-600"
                        )}>
                            We're on a mission to transform the way teams work together. Founded in 2020,
                            TaskFlow has grown from a small startup to a global platform trusted by thousands
                            of teams worldwide.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-24 md:mb-32 relative z-10">
                        {stats.map((stat, idx) => (
                            <Card 
                                key={stat.label}
                                className={cn(
                                    "backdrop-blur-xl p-6 md:p-8 text-center animate-in fade-in zoom-in duration-500 hover:border-[#48A111]/30 transition-all group",
                                    isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-[#48A111]/10 bg-white shadow-xl"
                                )}
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="text-3xl md:text-5xl font-black text-[#48A111] mb-2 group-hover:scale-110 transition-transform tracking-tighter">
                                    {stat.number}
                                </div>
                                <div className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors", isDarkMode ? "text-white/40" : "text-slate-500")}>{stat.label}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Our Story */}
                    <div className="mb-24 md:mb-32">
                        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#48A111]/10 border border-[#48A111]/20 text-[#48A111] text-xs font-black tracking-widest uppercase mb-6">
                                    <History className="w-3 h-3" /> Our Legacy
                                </div>
                                <h2 className={cn("text-3xl md:text-4xl font-black mb-6 md:mb-8 tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Our Story</h2>
                                <div className={cn("space-y-6 text-base md:text-lg font-medium leading-relaxed transition-colors", isDarkMode ? "text-white/60" : "text-slate-600")}>
                                    <p>
                                        TaskFlow was born from a simple observation: teams were struggling with
                                        fragmented tools and complicated workflows. We knew there had to be a
                                        better way.
                                    </p>
                                    <p>
                                        Our founders, having experienced these challenges firsthand, set out to
                                        create a platform that would make collaboration intuitive, efficient,
                                        and dare we say, enjoyable.
                                    </p>
                                    <p>
                                        Today, TaskFlow powers teams across industries, from startups to
                                        Fortune 500 companies, helping them achieve their goals faster and with
                                        less friction.
                                    </p>
                                </div>
                            </div>
                            <div className="relative group animate-in fade-in slide-in-from-right-8 duration-700">
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#48A111]/40 to-[#A3E635]/40 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000" />
                                <div className="relative rounded-[2rem] overflow-hidden border border-white/20 shadow-2xl">
                                    <img 
                                        src="https://images.unsplash.com/photo-1758630737900-a28682c5aa69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwb2ZmaWNlJTIwbW9kZXJufGVufDF8fHx8MTc3NDMzMTczMHww&ixlib=rb-4.1.0&q=80&w=1080" 
                                        alt="TaskFlow Office" 
                                        className="w-full h-[300px] md:h-[450px] object-cover group-hover:scale-105 transition-transform duration-700" 
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1000'; }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Our Values */}
                    <div className="mb-24 md:mb-32">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className={cn("text-3xl md:text-4xl font-black mb-6 tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Our Core Values</h2>
                            <p className={cn("font-medium transition-colors", isDarkMode ? "text-white/40" : "text-slate-500")}>The principles that synchronize our collective efforts.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            {values.map((value, idx) => {
                                const Icon = value.icon;
                                return (
                                    <Card
                                        key={value.title}
                                        className={cn(
                                            "backdrop-blur-xl p-6 md:p-8 hover:bg-[#48A111]/5 transition-all group animate-in fade-in slide-in-from-bottom-8 duration-700",
                                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-[#48A111]/10 shadow-lg"
                                        )}
                                        style={{ animationDelay: `${idx * 150}ms` }}
                                    >
                                        <div className="bg-gradient-to-br from-[#48A111] to-[#A3E635] w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-6 md:mb-8 rotate-3 group-hover:rotate-0 transition-transform shadow-lg shadow-[#48A111]/20">
                                            <Icon className="size-5 md:size-6 text-white" />
                                        </div>
                                        <h3 className={cn("text-lg md:text-xl font-black mb-4 tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                                            {value.title}
                                        </h3>
                                        <p className={cn("font-medium text-sm leading-relaxed transition-colors", isDarkMode ? "text-white/60" : "text-slate-600")}>
                                            {value.description}
                                        </p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Leadership Team */}
                    <div className="mb-24 md:mb-32">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className={cn("text-3xl md:text-4xl font-black mb-6 tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Meet Our Leadership</h2>
                            <p className={cn("font-medium transition-colors", isDarkMode ? "text-white/40" : "text-slate-500")}>Visionaries steering the future of collaboration.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                            {team.map((member, idx) => (
                                <div
                                    key={member.name}
                                    className="group animate-in fade-in slide-in-from-bottom-8 duration-700"
                                    style={{ animationDelay: `${idx * 200}ms` }}
                                >
                                    <div className="relative mb-6 md:mb-8">
                                        <div className="absolute -inset-2 bg-gradient-to-tr from-[#48A111]/20 to-[#A3E635]/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-700" />
                                        <div className="relative rounded-[1.5rem] overflow-hidden border border-[#48A111]/10 bg-white/5 backdrop-blur-sm">
                                            <img 
                                                src={member.image} 
                                                alt={member.name} 
                                                className="w-full aspect-[4/5] object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                                            />
                                        </div>
                                    </div>
                                    <h3 className={cn("text-xl font-black mb-1 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{member.name}</h3>
                                    <p className="text-[#48A111] text-xs font-black uppercase tracking-widest">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AboutUs;
