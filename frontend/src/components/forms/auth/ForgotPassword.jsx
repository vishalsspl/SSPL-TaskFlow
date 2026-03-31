import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
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
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription className="text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-6">
              <div className="p-4 text-sm text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div className="font-semibold text-center w-full">
                  Reset link sent! Please check your email inbox and follow the instructions.
                </div>
              </div>
              <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-primary font-semibold hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 text-sm font-black rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-[#FF0000] text-white border-2 border-[#FF0000] shadow-[0_0_20px_rgba(255,0,0,0.4)]">
                  <AlertCircle className="h-5 w-5 shrink-0 text-white" />
                  <div className="uppercase tracking-tight text-white">{error}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/90 font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="!pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
