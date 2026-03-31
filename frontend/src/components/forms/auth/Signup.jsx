import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, AlertCircle, User, Mail, Lock, Building2, ArrowLeft, Globe, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Step indicators ────────────────────────────────────────────────────────
const steps = ['Your account', 'Your organisation'];

const StepDots = ({ current }) => (
  <div className="flex items-center justify-center gap-3 mb-6">
    {steps.map((label, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all',
          i < current && 'bg-[#48A111] text-white',
          i === current && 'bg-[#48A111] text-white ring-4 ring-[#48A111]/30',
          i > current && 'bg-white/10 text-white/40',
        )}>
          {i < current ? '✓' : i + 1}
        </div>
        <span className={cn(
          'text-[11px] font-bold hidden sm:block',
          i === current ? 'text-white/90' : 'text-white/30',
        )}>{label}</span>
        {i < steps.length - 1 && (
          <ChevronRight className="w-3 h-3 text-white/20 ml-1" />
        )}
      </div>
    ))}
  </div>
);

// ── Field component ────────────────────────────────────────────────────────
const Field = ({ label, id, error, children }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className={cn('text-white/90 font-semibold text-sm', error && 'text-red-300')}>
      {label}
    </Label>
    {children}
  </div>
);

const Signup = () => {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    // step 0 — personal
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // step 1 — org
    organizationName: '',
    industry: '',
    size: '',
    website: '',
    country: '',
    role: 'ADMIN', // Default role
  });

  const roles = [
    { id: 'ADMIN', title: 'Organisation Admin', desc: 'Create and manage a new workspace for your team.', icon: <Building2 className="w-5 h-5" /> },
    { id: 'MANAGER', title: 'Manager', desc: 'Join an existing team to manage projects and tasks.', icon: <User className="w-5 h-5 text-blue-400" /> },
    { id: 'MEMBER', title: 'Team Member', desc: 'Join your organization to collaborate on work.', icon: <User className="w-5 h-5 text-emerald-400" /> },
    { id: 'CLIENT', title: 'Client / Stakeholder', desc: 'View progress and collaborate on your projects.', icon: <User className="w-5 h-5 text-purple-400" /> },
  ];

  const set = (key) => (e) => {
    setForm(p => ({ ...p, [key]: e.target.value }));
    setFieldErrors(p => ({ ...p, [key]: false }));
    setError('');
  };

  const setSelect = (key) => (value) => {
    setForm(p => ({ ...p, [key]: value }));
    setFieldErrors(p => ({ ...p, [key]: false }));
    setError('');
  };

  // ── step 0 validation ──────────────────────────────────────────────────
  const validateStep0 = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = true;
    else if (!/^[a-zA-Z0-9\s]+$/.test(form.name)) {
      setError('Name cannot contain special characters.');
      errs.name = true;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = true;
    if (form.password.length < 6) errs.password = true;
    if (form.password !== form.confirmPassword) errs.confirmPassword = true;

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      
      if (errs.name || errs.email) {
        setError('Please fill in all mandatory fields.');
      } else if (errs.password) {
        setError('Password must be at least 6 characters.');
      } else if (errs.confirmPassword) {
        setError('Passwords do not match.');
      } else {
        setError('Please fix the highlighted fields.');
      }
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError('');
    if (validateStep0()) setStep(1);
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.organizationName.trim()) errs.organizationName = true;
    
    // Only require these if user is an ADMIN (creating a new org)
    if (form.role === 'ADMIN') {
      if (!form.industry) errs.industry = true;
      if (!form.size) errs.size = true;
      if (!form.website.trim()) errs.website = true;
      if (!form.country) errs.country = true;
    }

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError('Please fill in all mandatory fields.');
      return false;
    }
    return true;
  };

  // ── final submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        organizationName: form.organizationName.trim(),
        industry: form.industry || undefined,
        size: form.size || undefined,
        website: form.website || undefined,
        country: form.country || undefined,
      });

      // If it's a join request, data might not contain a token (pending approval)
      if (data.token) {
        storeLogin(data.token, data.user);
        navigate('/dashboard');
      } else {
        // Redirect to a "Pending" page or show success message
        toast({ title: 'Success', description: data.message });
        navigate('/pending-approval');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed. Please try again.';
      setError(msg);
      if (msg.toLowerCase().includes('email')) {
        setStep(0);
        setFieldErrors({ email: true });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── shared input style ─────────────────────────────────────────────────
  const inputClass = (key) => cn(
    'bg-white/5 border-white/10 text-white placeholder:text-white/30',
    'focus-visible:ring-[#48A111]/30 focus-visible:border-[#48A111]/50 transition-all',
    fieldErrors[key] && 'border-red-500/50',
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] relative overflow-y-auto py-12 px-4 selection:bg-primary/30">
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-8 left-8 z-50 text-white/50 hover:text-white hover:bg-white/10 rounded-full border border-white/5 backdrop-blur-md transition-all group w-12 h-12"
        onClick={() => (step === 0 ? navigate('/') : setStep(0))}
        title={step === 0 ? 'Back to Home' : 'Back'}
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </Button>

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#102A04] via-[#050505] to-[#0A0A0A]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#48A111]/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#48A111]/5 blur-[150px] rounded-full" />
      </div>

      <Card className="w-full max-w-xl relative z-10 border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {step === 0 ? 'Create your account' : (form.role === 'ADMIN' ? 'Set up your organisation' : 'Join your organisation')}
          </CardTitle>
          <CardDescription className="text-sm text-white/60">
            {step === 0
              ? 'Start your 14-day free trial — no credit card needed'
              : (form.role === 'ADMIN' ? 'Tell us about your company' : 'Find the company you belong to')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <StepDots current={step} />

          {error && (
            <div className="mb-4 p-4 text-sm font-medium rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-red-500/10 border border-red-500/20 text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
              <span className="tracking-tight">{error}</span>
            </div>
          )}

          {/* ── Step 0: Personal details ── */}
          {step === 0 && (
            <div className="space-y-6">
              {/* Role Selector */}
              <div className="space-y-3">
                <Label className="text-white/90 font-bold text-xs uppercase tracking-widest tracking-tight font-black">Select your role</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, role: r.id }))}
                      className={cn(
                        'flex flex-col items-start p-4 rounded-xl border transition-all text-left group relative backdrop-blur-md',
                        form.role === r.id 
                          ? 'bg-[#48A111]/10 border-[#48A111] shadow-lg shadow-[#48A111]/5' 
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors',
                        form.role === r.id ? 'bg-[#48A111] text-white' : 'bg-white/10 text-white/60'
                      )}>
                        {r.icon}
                      </div>
                      <p className={cn('font-bold text-sm mb-1', form.role === r.id ? 'text-[#48A111]' : 'text-white')}>
                        {r.title}
                      </p>
                      <p className="text-[10px] leading-tight text-white/40 font-medium group-hover:text-white/60 transition-colors">
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Your name" id="name" error={fieldErrors.name}>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input id="name" placeholder="John Doe" value={form.name} onChange={set('name')}
                        className={cn('!pl-10', inputClass('name'))} />
                    </div>
                  </Field>

                  <Field label="Work email" id="email" error={fieldErrors.email}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')}
                        className={cn('!pl-10', inputClass('email'))} />
                    </div>
                  </Field>

                  <Field label="Password" id="password" error={fieldErrors.password}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                        value={form.password} onChange={set('password')}
                        className={cn('!pl-10 pr-10', inputClass('password'))} />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm password" id="confirmPassword" error={fieldErrors.confirmPassword}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password"
                        value={form.confirmPassword} onChange={set('confirmPassword')}
                        className={cn('!pl-10 pr-10', inputClass('confirmPassword'))} />
                      <button type="button" onClick={() => setShowConfirm(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <Button type="button" onClick={nextStep}
                  className="w-full bg-[#48A111] hover:bg-[#48A111]/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-[#48A111]/10 mt-2">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                <p className="text-center text-sm text-white/60 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#48A111] hover:underline font-bold">Sign in</Link>
                </p>
              </div>
            </div>
          )}

          {/* ── Step 1: Organisation details ── */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* org name — full width */}
                <div className="md:col-span-2">
                  <Field label={form.role === 'ADMIN' ? 'Organisation name *' : 'Organisation name to join *'} id="organizationName" error={fieldErrors.organizationName}>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input id="organizationName" placeholder={form.role === 'ADMIN' ? 'Acme Corp' : 'Enter company name to join'} value={form.organizationName}
                        onChange={set('organizationName')}
                        className={cn('!pl-10', inputClass('organizationName'))} />
                    </div>
                  </Field>
                </div>

                {form.role === 'ADMIN' && (
                  <>
                    <Field label="Industry *" id="industry" error={fieldErrors.industry}>
                      <Select value={form.industry} onValueChange={setSelect('industry')}>
                        <SelectTrigger className={cn(
                          "w-full h-10 rounded-md border border-white/10 bg-white/5 text-white/80 text-sm px-3 outline-none focus:ring-2 focus:ring-[#48A111]/30 transition-all",
                          fieldErrors.industry && "border-red-500/50"
                        )}>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                          {['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Real Estate', 'Media', 'Other'].map(i => (
                            <SelectItem key={i} value={i} className="focus:bg-white/10 focus:text-white cursor-pointer">{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Company size *" id="size" error={fieldErrors.size}>
                      <Select value={form.size} onValueChange={setSelect('size')}>
                        <SelectTrigger className={cn(
                          "w-full h-10 rounded-md border border-white/10 bg-white/5 text-white/80 text-sm px-3 outline-none focus:ring-2 focus:ring-[#48A111]/30 transition-all",
                          fieldErrors.size && "border-red-500/50"
                        )}>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                          {['1-10', '11-50', '51-200', '201-500', '500+'].map(s => (
                            <SelectItem key={s} value={s} className="focus:bg-white/10 focus:text-white cursor-pointer">{s} employees</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Website *" id="website" error={fieldErrors.website}>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input id="website" placeholder="https://yourcompany.com" value={form.website}
                          onChange={set('website')}
                          className={cn('!pl-10', inputClass('website'))} />
                      </div>
                    </Field>

                    <Field label="Country *" id="country" error={fieldErrors.country}>
                      <Select value={form.country} onValueChange={setSelect('country')}>
                        <SelectTrigger className={cn(
                          "w-full h-10 rounded-md border border-white/10 bg-white/5 text-white/80 text-sm px-3 outline-none focus:ring-2 focus:ring-[#48A111]/30 transition-all",
                          fieldErrors.country && "border-red-500/50"
                        )}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                          {['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'UAE', 'Other'].map(c => (
                            <SelectItem key={c} value={c} className="focus:bg-white/10 focus:text-white cursor-pointer">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}
              </div>

              {/* Trial callout */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#48A111]/10 border border-[#48A111]/20 text-[#48A111]">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-xs font-medium text-[#48A111]/90">
                  {form.role === 'ADMIN' 
                    ? <span>Your organisation starts on a <strong>14-day FREE trial</strong> with up to 10 users and 5 projects.</span>
                    : <span>You will be added to the organisation as a <strong>{form.role}</strong> pending administrator approval.</span>
                  }
                </p>
              </div>

              <Button type="submit" disabled={loading}
                className="w-full bg-[#48A111] hover:bg-[#48A111]/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-[#48A111]/10">
                {loading ? 'Submitting registration…' : 'Submit Registration'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;