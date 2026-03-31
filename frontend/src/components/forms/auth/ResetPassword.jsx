import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, password: formData.password });
      setSuccess(true);
      setTimeout(() => { navigate('/login?passwordUpdate=success'); }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center justify-center mb-4 space-y-3">
            {orgInfo && (
              <>
                {orgInfo.logoUrl ? (
                  <img src={orgInfo.logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl">
                    {orgInfo.name?.charAt(0) || 'T'}
                  </div>
                )}
              </>
            )}
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription className="text-sm">Create a secure password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="p-4 text-sm text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div className="font-semibold text-center w-full">Password reset successfully! Redirecting to login...</div>
              </div>
              <ShieldCheck className="h-12 w-12 text-primary mx-auto opacity-20" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 text-sm font-black rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-[#FF0000] text-white border-2 border-[#FF0000] shadow-[0_0_20px_rgba(255,0,0,0.4)]">
                  <AlertCircle className="h-5 w-5 shrink-0 text-white" />
                  <div className="uppercase tracking-tight text-white">{error}</div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/90 font-semibold">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="!pl-10 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground/90 font-semibold">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className="!pl-10"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
