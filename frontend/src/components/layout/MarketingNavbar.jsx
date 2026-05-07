import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

const MarketingNavbar = () => {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const isDarkMode = theme !== 'light';
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navLinks = [
        { label: 'About Us', href: '/about' },
        { label: 'How it works', href: '/how-it-works' },
        { label: 'Pricing', href: '/pricing' }
    ];

    return (
        <>
            <nav className="relative z-[100] w-full max-w-7xl mx-auto px-6 py-6 md:py-8 flex items-center justify-between shrink-0">
                <Link to="/" className="flex items-center gap-2">
                    <div className="flex flex-col items-center text-center">
                        <span className={cn("text-2xl font-black tracking-tight leading-none", isDarkMode ? "text-white" : "text-slate-900")}>TaskFlow</span>
                        <span className="text-[8px] text-primary font-bold tracking-[0.2em] uppercase mt-0.5 opacity-60">Sveltoz</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2 gap-10 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link key={link.href} to={link.href} className={cn("transition-colors hover:text-[#48A111]", isDarkMode ? "text-white/70" : "text-slate-600")}>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <button 
                        onClick={toggleTheme} 
                        className={cn(
                            "p-2 rounded-full transition-all duration-300", 
                            isDarkMode ? "text-white hover:bg-white/10" : "text-[#48A111] bg-[#48A111]/10 hover:bg-[#48A111]/20 shadow-sm"
                        )}
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-2">
                        <Button
                            variant="ghost"
                            className={cn(
                                "text-sm font-bold border transition-all px-6 rounded-xl h-10",
                                isDarkMode ? "border-white/10 hover:bg-white/5 text-white" : "border-[#48A111]/20 hover:bg-[#48A111]/5 text-slate-900"
                            )}
                            onClick={() => navigate('/login')}
                        >
                            Log In
                        </Button>
                        <Button
                            className={cn(
                                "text-sm font-bold transition-all px-6 rounded-xl shadow-xl h-10",
                                isDarkMode ? "bg-white text-black hover:bg-white/90 shadow-white/5" : "bg-[#48A111] text-white hover:bg-[#48A111]/90 shadow-[#48A111]/20"
                            )}
                            onClick={() => navigate('/signup')}
                        >
                            Get Started
                        </Button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={toggleMenu}
                        className={cn(
                            "md:hidden p-2 rounded-xl transition-all",
                            isDarkMode ? "text-white hover:bg-white/10" : "text-slate-900 bg-slate-100 hover:bg-slate-200"
                        )}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className={cn(
                    "fixed inset-0 z-[90] md:hidden transition-all duration-500 animate-in fade-in slide-in-from-top-10",
                    isDarkMode ? "bg-[#0A0A0A]/98 backdrop-blur-xl" : "bg-[#F8FCF6]/98 backdrop-blur-xl"
                )}>
                    <div className="flex flex-col items-center justify-center h-full gap-6 px-10">
                        {navLinks.map((link) => (
                            <Link 
                                key={link.href} 
                                to={link.href} 
                                onClick={() => setIsMenuOpen(false)}
                                className={cn(
                                    "text-xl font-bold tracking-tight transition-all active:scale-95",
                                    isDarkMode ? "text-white/90 hover:text-[#48A111]" : "text-slate-900 hover:text-[#48A111]"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        
                        <div className="w-full h-px bg-current opacity-5 my-2" />
                        
                        <div className="flex flex-col w-full gap-3">
                                <Button
                                    className={cn(
                                        "w-full h-12 rounded-xl text-md font-bold transition-all",
                                        isDarkMode ? "bg-white text-black" : "bg-[#48A111] text-white"
                                    )}
                                    onClick={() => { setIsMenuOpen(false); navigate('/signup'); }}
                                >
                                    Get Started
                                </Button>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full h-12 rounded-xl text-md font-bold transition-all",
                                    isDarkMode ? "border-white/10 text-white bg-white/5" : "border-slate-200 text-slate-900 bg-white"
                                )}
                                onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
                            >
                                Sign In
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MarketingNavbar;
