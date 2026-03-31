import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Heart, Lightbulb, Users, ArrowLeft, History } from 'lucide-react';

const AboutUs = () => {
    const navigate = useNavigate();

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
                    {/* Header */}
                    <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
                            About <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#48A111] to-[#A3E635]">
                                TaskFlow
                            </span>
                        </h1>
                        <p className="text-white/60 text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed">
                            We're on a mission to transform the way teams work together. Founded in 2020,
                            TaskFlow has grown from a small startup to a global platform trusted by thousands
                            of teams worldwide.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-32 relative z-10">
                        {stats.map((stat, idx) => (
                            <Card 
                                key={stat.label}
                                className="bg-white/5 backdrop-blur-xl border-white/10 p-8 text-center animate-in fade-in zoom-in duration-500 hover:border-[#48A111]/30 transition-all group"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="text-5xl font-black text-[#48A111] mb-2 group-hover:scale-110 transition-transform tracking-tighter">
                                    {stat.number}
                                </div>
                                <div className="text-white/40 text-xs font-bold uppercase tracking-widest">{stat.label}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Our Story */}
                    <div className="mb-32">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#48A111]/10 border border-[#48A111]/20 text-[#48A111] text-xs font-black tracking-widest uppercase mb-6">
                                    <History className="w-3 h-3" /> Our Legacy
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">Our Story</h2>
                                <div className="space-y-6 text-white/60 text-lg font-medium leading-relaxed">
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
                                        className="w-full h-[450px] object-cover group-hover:scale-105 transition-transform duration-700" 
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1000'; }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Our Values */}
                    <div className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">Our Core Values</h2>
                            <p className="text-white/40 font-medium">The principles that synchronize our collective efforts.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {values.map((value, idx) => {
                                const Icon = value.icon;
                                return (
                                    <Card
                                        key={value.title}
                                        className="bg-white/5 backdrop-blur-xl border-white/10 p-8 hover:bg-[#48A111]/5 transition-all group animate-in fade-in slide-in-from-bottom-8 duration-700"
                                        style={{ animationDelay: `${idx * 150}ms` }}
                                    >
                                        <div className="bg-gradient-to-br from-[#48A111] to-[#A3E635] w-14 h-14 rounded-2xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform shadow-lg shadow-[#48A111]/20">
                                            <Icon className="size-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-4 tracking-tight">
                                            {value.title}
                                        </h3>
                                        <p className="text-white/60 font-medium text-sm leading-relaxed">
                                            {value.description}
                                        </p>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Leadership Team */}
                    <div className="mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">Meet Our Leadership</h2>
                            <p className="text-white/40 font-medium">Visionaries steering the future of collaboration.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {team.map((member, idx) => (
                                <div
                                    key={member.name}
                                    className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700"
                                    style={{ animationDelay: `${idx * 200}ms` }}
                                >
                                    <div className="relative h-[400px] mb-6 rounded-[2rem] overflow-hidden border border-white/10 shadow-xl group">
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-500 z-10" />
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=500'; }}
                                        />
                                        <div className="absolute bottom-6 left-6 right-6 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                            <p className="text-white font-black text-lg tracking-tight mb-1">{member.name}</p>
                                            <p className="text-[#A3E635] text-xs font-bold uppercase tracking-widest">{member.role}</p>
                                        </div>
                                    </div>
                                    <div className="text-center group-hover:opacity-0 transition-opacity">
                                        <h3 className="text-xl font-black text-white mb-1 tracking-tight">
                                            {member.name}
                                        </h3>
                                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Removed Join Us Section */}
                </div>
            </main>
        </div>
    );
};

export default AboutUs;
