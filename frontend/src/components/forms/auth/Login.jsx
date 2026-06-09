import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, AlertCircle, CheckCircle, Mail, Lock, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

const Login = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme !== 'light';
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgInfo, setOrgInfo] = useState(null);

  useEffect(() => {
    const fetchOrgInfo = async () => {
      try {
        const response = await api.get('/organizations/public');
        setOrgInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch org info:', err);
      }
    };
    fetchOrgInfo();
  }, []);

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setSuccessMessage('Account created successfully! You can now login.');
    } else if (searchParams.get('passwordUpdate') === 'success') {
      setSuccessMessage('Password updated successfully! Please sign in with your new password.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      const user = response.data.user;
      login(response.data.token, user);

      if (user.mustChangePassword && user.role !== 'ADMIN') {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed';

      setError(errorMessage);
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user')) {
        setFieldErrors({ email: true });
      } else if (errorMessage.toLowerCase().includes('password')) {
        setFieldErrors({ password: true });
      } else {
        setFieldErrors({ email: true, password: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center relative overflow-y-auto pb-20 px-4 transition-colors duration-500", isDarkMode ? "bg-[#0A0A0A]" : "bg-[#F8FCF6]")}>
      {/* Back to Landing Page Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-8 left-8 z-50 rounded-full border backdrop-blur-md transition-all group w-12 h-12",
          isDarkMode ? "text-white/50 hover:text-white hover:bg-white/10 border-white/5" : "text-slate-400 hover:text-slate-900 bg-white border-slate-200 shadow-sm"
        )}
        onClick={() => navigate('/')}
        title="Back to Home"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </Button>

      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className={`absolute inset-0 transition-opacity duration-500 ${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E")]' : ''}`} />
          <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}`} />
          <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}`} />
      </div>

      <Card className={cn(
        "w-full max-w-md relative z-10 backdrop-blur-xl shadow-2xl transition-all duration-500",
        isDarkMode ? "bg-black/40 border-white/10" : "bg-white/80 border-[#48A111]/10 shadow-xl"
      )}>
        <CardHeader className="text-center pb-4">
          <CardTitle className={cn("text-2xl font-bold tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
            Welcome to <span className="bg-gradient-to-r from-[#48A111] to-[#A3E635] bg-clip-text text-transparent">TaskFlow</span>
          </CardTitle>
          <CardDescription className={cn("text-sm transition-colors", isDarkMode ? "text-white/60" : "text-slate-700")}>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="p-4 text-sm text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div className="font-semibold">{successMessage}</div>
              </div>
            )}

            {error && (
              <div className={cn(
                "mb-4 p-4 text-sm font-semibold rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border",
                isDarkMode 
                  ? "bg-red-500/10 border-red-500/20 text-red-200" 
                  : "bg-red-50 border-red-200 text-red-700 shadow-sm shadow-red-100"
              )}>
                <AlertCircle className={cn("h-5 w-5 shrink-0", isDarkMode ? "text-red-400" : "text-red-600")} />
                <div className="tracking-tight">
                  {error === "Invalid credentials" || error.toLowerCase().includes("credentials")
                    ? "Invalid email or password. Please try again."
                    : error}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className={cn("font-semibold transition-colors", isDarkMode ? "text-white/90" : "text-slate-700", fieldErrors.email && "text-red-500")}>Email</Label>
              <div className="relative">
                <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/70" : "text-slate-400")} />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: false });
                  }}
                  required
                  className={cn(
                    "!pl-10 transition-all duration-300",
                    isDarkMode ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                    "focus-visible:ring-[#48A111]/30 focus-visible:border-[#48A111]/50",
                    fieldErrors.email && "border-red-500/50 ring-red-500/10"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className={cn("font-semibold transition-colors", isDarkMode ? "text-white/90" : "text-slate-700", fieldErrors.password && "text-red-500")}>Password</Label>
              <div className="relative">
                <Lock className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/70" : "text-slate-400")} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: false });
                  }}
                  required
                  className={cn(
                    "!pl-10 pr-10 transition-all duration-300",
                    isDarkMode ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400",
                    "focus-visible:ring-[#48A111]/30 focus-visible:border-[#48A111]/50",
                    fieldErrors.password && "border-red-500/50 ring-red-500/10"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDarkMode ? "text-white/50 hover:text-white" : "text-slate-400 hover:text-slate-900")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link to="/forgot-password" className={cn("text-xs font-semibold hover:underline transition-colors", isDarkMode ? "text-[#48A111]" : "text-[#48A111]")}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full bg-[#48A111] hover:bg-[#48A111]/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-[#48A111]/10" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className={cn("text-center text-sm font-medium transition-colors", isDarkMode ? "text-white/60" : "text-slate-600")}>
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#48A111] hover:underline font-bold transition-all">Sign up</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;