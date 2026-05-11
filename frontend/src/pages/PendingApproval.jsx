import { Link } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, Mail, ArrowLeft } from 'lucide-react';

const PendingApproval = () => {
    const { theme } = useTheme();
    const isDarkMode = theme !== 'light';

    return (
        <div className={cn(
            "min-h-screen flex flex-col items-center justify-center relative overflow-y-auto px-4 selection:bg-primary/30 transition-colors duration-500",
            isDarkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F8FCF6] text-slate-900"
        )}>
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute inset-0 transition-opacity duration-500 ${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E")]' : ''}`} />
                <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}`} />
                <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}`} />
            </div>

            <Card className={cn(
                "w-full max-w-md relative z-10 backdrop-blur-xl shadow-2xl transition-all duration-500",
                isDarkMode ? "bg-black/40 border-white/10" : "bg-white/90 border-[#48A111]/10 shadow-xl"
            )}>
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-6">
                        <div className={cn(
                            "p-4 rounded-full transition-colors duration-500",
                            isDarkMode ? "bg-[#48A111]/20 shadow-[0_0_30px_rgba(72,161,17,0.3)]" : "bg-[#48A111]/10 shadow-lg shadow-[#48A111]/5"
                        )}>
                            <Clock className={cn("w-12 h-12", isDarkMode ? "text-[#48A111]" : "text-[#48A111]")} />
                        </div>
                    </div>
                    <CardTitle className={cn("text-2xl font-bold tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                        Account Pending Approval
                    </CardTitle>
                    <CardDescription className={cn("text-sm transition-colors", isDarkMode ? "text-white/60" : "text-slate-700")}>
                        Your account is waiting for admin verification
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className={cn(
                        "p-5 rounded-xl border backdrop-blur-sm transition-colors duration-500",
                        isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
                    )}>
                        <h3 className={cn("font-semibold mb-3 flex items-center text-sm", isDarkMode ? "text-white/90" : "text-slate-900")}>
                            <CheckCircle className="w-4 h-4 mr-2 text-[#48A111]" />
                            What happens next?
                        </h3>
                        <ol className={cn("space-y-3 text-sm font-medium", isDarkMode ? "text-white/60" : "text-slate-600")}>
                            <li className="flex items-start">
                                <span className={cn("font-bold mr-2 mt-0.5", isDarkMode ? "text-white/40" : "text-slate-400")}>1.</span>
                                <span>An administrator will review your account details.</span>
                            </li>
                            <li className="flex items-start">
                                <span className={cn("font-bold mr-2 mt-0.5", isDarkMode ? "text-white/40" : "text-slate-400")}>2.</span>
                                <span>You'll receive approval (usually within 24 hours).</span>
                            </li>
                            <li className="flex items-start">
                                <span className={cn("font-bold mr-2 mt-0.5", isDarkMode ? "text-white/40" : "text-slate-400")}>3.</span>
                                <span>Once approved, you can login and access the platform.</span>
                            </li>
                        </ol>
                    </div>

                    <div className={cn(
                        "p-4 rounded-xl border flex items-start transition-colors duration-500",
                        isDarkMode ? "bg-[#48A111]/10 border-[#48A111]/20" : "bg-[#48A111]/5 border-[#48A111]/10"
                    )}>
                        <Mail className="w-5 h-5 text-[#48A111] mr-3 mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className={cn("font-bold mb-1", isDarkMode ? "text-[#48A111]" : "text-[#48A111]")}>Check your email</p>
                            <p className={cn("font-medium", isDarkMode ? "text-[#48A111]/80" : "text-[#48A111]/80")}>
                                We'll notify you via email once your account has been approved by an administrator.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 space-y-4">
                        <Link to="/login" className="block w-full">
                            <Button 
                                type="button" 
                                className="w-full bg-[#48A111] hover:bg-[#48A111]/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-[#48A111]/10 flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </Button>
                        </Link>
                        <p className={cn("text-center text-xs font-medium transition-colors", isDarkMode ? "text-white/40" : "text-slate-500")}>
                            Need help? Contact your organization administrator
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PendingApproval;

