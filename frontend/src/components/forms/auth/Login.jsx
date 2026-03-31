import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, AlertCircle, CheckCircle, Mail, Lock, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const Login = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden p-4">
      {/* Back to Landing Page Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-8 left-8 z-50 text-white/50 hover:text-white hover:bg-white/10 rounded-full border border-white/5 backdrop-blur-md transition-all group w-12 h-12"
        onClick={() => navigate('/')}
        title="Back to Home"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </Button>

      {/* Background Gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#102A04] via-[#050505] to-[#0A0A0A]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#48A111]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#48A111]/5 blur-[150px] rounded-full" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-white/90">
            Welcome back to <span className="bg-gradient-to-r from-[#48A111] to-[#A3E635] bg-clip-text text-transparent">TaskFlow</span>
          </CardTitle>
          <CardDescription className="text-sm text-white/60">Sign in to your account to continue</CardDescription>
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
              <div className="mb-4 p-4 text-sm font-medium rounded-xl flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                <div className="tracking-tight">
                  {error === "Invalid credentials" || error.toLowerCase().includes("credentials")
                    ? "Invalid email or password. Please try again."
                    : error}
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className={cn("text-white/90 font-semibold", fieldErrors.email && "text-[#FF0000]")}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
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
                    "!pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#48A111]/30 focus-visible:border-[#48A111]/50 transition-all",
                    fieldErrors.email && "border-[#FF0000]/50 ring-[#FF0000]/10 focus-visible:ring-[#FF0000]/20"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className={cn("text-white/90 font-semibold", fieldErrors.password && "text-[#FF0000]")}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
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
                    "!pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#48A111]/30 focus-visible:border-[#48A111]/50 transition-all",
                    fieldErrors.password && "border-[#FF0000]/50 ring-[#FF0000]/10 focus-visible:ring-[#FF0000]/20"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link to="/forgot-password" className="text-xs font-semibold text-primary/80 hover:text-primary transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full bg-[#48A111] hover:bg-[#48A111]/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-[#48A111]/10" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-white/60 font-medium">
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