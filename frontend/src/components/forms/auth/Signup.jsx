import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
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

const StepDots = ({ current, isDarkMode }) => (
  <div className="flex items-center justify-center gap-3 mb-6">
    {steps.map((label, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all',
          i < current && 'bg-[#48A111] text-white',
          i === current && 'bg-[#48A111] text-white ring-4 ring-[#48A111]/30',
          i > current && (isDarkMode ? 'bg-white/10 text-white/40' : 'bg-slate-200 text-slate-500'),
        )}>
          {i < current ? '✓' : i + 1}
        </div>
        <span className={cn(
          'text-[11px] font-bold hidden sm:block transition-colors',
          i === current ? (isDarkMode ? 'text-white/90' : 'text-slate-900') : (isDarkMode ? 'text-white/30' : 'text-slate-500'),
        )}>{label}</span>
        {i < steps.length - 1 && (
          <ChevronRight className={cn("w-3 h-3 ml-1 transition-colors", isDarkMode ? "text-white/20" : "text-slate-300")} />
        )}
      </div>
    ))}
  </div>
);

// ── Field component ────────────────────────────────────────────────────────
const Field = ({ label, id, error, children, isDarkMode }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className={cn('font-semibold text-sm transition-colors', isDarkMode ? 'text-white/90' : 'text-slate-700', error && 'text-red-500')}>
      {label}
    </Label>
    {children}
  </div>
);

const Signup = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme !== 'light';
  const { login: storeLogin } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorTimestamp, setErrorTimestamp] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [orgVerified, setOrgVerified] = useState(false);
  const [verifiedOrgName, setVerifiedOrgName] = useState('');
  const [orgCheckError, setOrgCheckError] = useState('');
  const [checkingOrg, setCheckingOrg] = useState(false);
  
  const errorRef = useRef(null);

  useEffect(() => {
    if ((error || orgCheckError) && errorTimestamp > 0 && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error, orgCheckError, errorTimestamp]);

  const triggerError = (msg, isOrgError = false) => {
    if (isOrgError) setOrgCheckError(msg);
    else setError(msg);
    setErrorTimestamp(Date.now());
  };

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
    let emailFormatError = false;

    if (!form.name.trim()) errs.name = true;
    else if (!/^[a-zA-Z0-9\s]+$/.test(form.name)) {
      triggerError('Name cannot contain special characters.');
      errs.name = true;
    }

    if (!form.email.trim()) {
      errs.email = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = true;
      emailFormatError = true;
    }

    if (form.password.length < 6) errs.password = true;
    if (form.password !== form.confirmPassword) errs.confirmPassword = true;

    if (Object.keys(errs).length) {
      setFieldErrors(errs);

      if (emailFormatError) {
        triggerError('Invalid email format. Please check your work email.');
      } else if (errs.name || errs.email) {
        triggerError('Please fill in all mandatory fields.');
      } else if (errs.password) {
        triggerError('Password must be at least 6 characters.');
      } else if (errs.confirmPassword) {
        triggerError('Passwords do not match.');
      } else {
        triggerError('Please fix the highlighted fields.');
      }
      return false;
    }
    return true;
  };

  const nextStep = async () => {
    setError('');
    if (!validateStep0()) return;

    setLoading(true);
    try {
      const { data } = await api.post('/auth/check-email', { email: form.email.trim() });
      if (data.exists) {
        triggerError('You are already registered with this email.');
        setFieldErrors(p => ({ ...p, email: true }));
        return;
      }
      setStep(1);
    } catch (err) {
      triggerError('Error checking email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.organizationName.trim()) errs.organizationName = true;
    if (form.role === 'ADMIN') {
      if (!form.industry) errs.industry = true;
      if (!form.size) errs.size = true;
      if (!form.country) errs.country = true;
    }
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      triggerError('Please fill in all mandatory fields.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    setError('');
    setOrgCheckError('');

    try {
      // For non-admin roles, check if org exists first
      if (form.role !== 'ADMIN') {
        const { data: orgData } = await api.post('/auth/check-org', { organizationName: form.organizationName.trim() });
        if (!orgData.exists) {
          triggerError('Organisation not found. Please check the name or contact your admin.', true);
          setLoading(false);
          return;
        }
        setOrgVerified(true);
        setVerifiedOrgName(orgData.organizationName);
      }

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

      if (data.token && data.user) {
        console.log('[Signup] Success! Storing login and navigating to dashboard...');
        storeLogin(data.token, data.user);
        
        // Delay slightly to ensure storage is committed
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      } else if (data.token) {
        // Fallback if user object is somehow missing but token is there
        storeLogin(data.token, { ...form, role: 'ADMIN', isApproved: true });
        navigate('/dashboard');
      } else {
        toast({ title: 'Success', description: data.message });
        navigate('/pending-approval');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed. Please try again.';
      triggerError(msg);
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
    isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500',
    'focus-visible:ring-[#48A111]/30 focus-visible:border-[#48A111]/50 transition-all',
    fieldErrors[key] && 'border-red-500/50',
  );

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-start relative overflow-y-auto pt-16 pb-20 px-4 selection:bg-primary/30 transition-colors duration-500",
      isDarkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F8FCF6] text-slate-900"
    )}>
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-3 left-3 sm:top-8 sm:left-8 z-50 rounded-full border backdrop-blur-md transition-all group w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center",
          isDarkMode ? "text-white/50 hover:text-white hover:bg-white/10 border-white/5" : "text-slate-400 hover:text-slate-900 bg-white border-slate-200 shadow-sm"
        )}
        onClick={() => (step === 0 ? navigate('/') : setStep(0))}
        title={step === 0 ? 'Back to Home' : 'Back'}
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </Button>

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute inset-0 transition-opacity duration-500 ${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E")]' : ''}`} />
        <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}`} />
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 ${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}`} />
      </div>

      <Card className={cn(
        "w-full max-w-xl relative z-10 backdrop-blur-xl shadow-2xl transition-all duration-500",
        isDarkMode ? "bg-black/40 border-white/10" : "bg-white/90 border-[#48A111]/10 shadow-xl"
      )}>
        <CardHeader className="text-center pb-2">
          <CardTitle className={cn("text-2xl font-bold tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
            {step === 0 ? 'Create your account' : (form.role === 'ADMIN' ? 'Set up your organisation' : 'Join your organisation')}
          </CardTitle>
          <CardDescription className={cn("text-sm transition-colors", isDarkMode ? "text-white/60" : "text-slate-700")}>
            {step === 0
              ? 'Start your 14-day free trial — no credit card needed'
              : (form.role === 'ADMIN' ? 'Tell us about your company' : 'Find the company you belong to')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <StepDots current={step} isDarkMode={isDarkMode} />

          {(error || orgCheckError) && (
            <div 
              ref={errorRef}
              className={cn(
              "mb-4 p-4 text-sm font-semibold rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border",
              isDarkMode
                ? "bg-red-500/10 border-red-500/20 text-red-200"
                : "bg-red-50 border-red-200 text-red-700 shadow-sm shadow-red-100"
            )}>
              <AlertCircle className={cn("h-5 w-5 shrink-0 mt-0.5", isDarkMode ? "text-red-400" : "text-red-600")} />
              <span className="tracking-tight">{error || orgCheckError}</span>
            </div>
          )}

          {/* ── Step 0: Personal details ── */}
          {step === 0 && (
            <div className="space-y-6">
              {/* Role Selector */}
              <div className="space-y-3">
                <Label className={cn("font-bold text-xs uppercase tracking-widest tracking-tight font-black transition-colors", isDarkMode ? "text-white/90" : "text-slate-600")}>Select your role</Label>
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
                          : (isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10' : 'bg-white border-slate-200 hover:border-[#48A111]/30 hover:bg-[#48A111]/5 shadow-sm')
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors',
                        form.role === r.id ? 'bg-[#48A111] text-white' : (isDarkMode ? 'bg-white/10 text-white/60' : 'bg-slate-200 text-slate-500')
                      )}>
                        {r.icon}
                      </div>
                      <p className={cn('font-bold text-sm mb-1 transition-colors', form.role === r.id ? 'text-[#48A111]' : (isDarkMode ? 'text-white' : 'text-slate-700'))}>
                        {r.title}
                      </p>
                      <p className={cn("text-[10px] leading-tight font-medium transition-colors", isDarkMode ? "text-white/40 group-hover:text-white/60" : "text-slate-500 group-hover:text-slate-700")}>
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Your name" id="name" error={fieldErrors.name} isDarkMode={isDarkMode}>
                    <div className="relative">
                      <User className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")} />
                      <Input id="name" placeholder="John Doe" value={form.name} onChange={set('name')}
                        className={cn('!pl-10', inputClass('name'))} />
                    </div>
                  </Field>

                  <Field label="Work email" id="email" error={fieldErrors.email} isDarkMode={isDarkMode}>
                    <div className="relative">
                      <Mail className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")} />
                      <Input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')}
                        className={cn('!pl-10', inputClass('email'))} />
                    </div>
                  </Field>

                  <Field label="Password" id="password" error={fieldErrors.password} isDarkMode={isDarkMode}>
                    <div className="relative">
                      <Lock className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")} />
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters"
                        value={form.password} onChange={set('password')}
                        className={cn('!pl-10 pr-10', inputClass('password'))} />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDarkMode ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-600")}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm password" id="confirmPassword" error={fieldErrors.confirmPassword} isDarkMode={isDarkMode}>
                    <div className="relative">
                      <Lock className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")} />
                      <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password"
                        value={form.confirmPassword} onChange={set('confirmPassword')}
                        className={cn('!pl-10 pr-10', inputClass('confirmPassword'))} />
                      <button type="button" onClick={() => setShowConfirm(p => !p)}
                        className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDarkMode ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-600")}>
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <Button type="button" onClick={nextStep} disabled={loading}
                  className="w-full bg-[#48A111] hover:bg-[#48A111]/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-[#48A111]/10 mt-2">
                  {loading ? 'Checking email...' : <span className="flex items-center">Continue <ChevronRight className="w-4 h-4 ml-1" /></span>}
                </Button>

                <p className={cn("text-center text-sm font-medium transition-colors", isDarkMode ? "text-white/60" : "text-slate-600")}>
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
                  <Field label={form.role === 'ADMIN' ? 'Organisation name *' : 'Organisation name to join *'} id="organizationName" error={fieldErrors.organizationName} isDarkMode={isDarkMode}>
                    <div className="relative">
                      <Building2 className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")} />
                      <Input id="organizationName" placeholder={form.role === 'ADMIN' ? 'Acme Corp' : 'Enter company name to join'} value={form.organizationName}
                        onChange={(e) => { set('organizationName')(e); setOrgVerified(false); setOrgCheckError(''); }}
                        className={cn('!pl-10', inputClass('organizationName'))} />
                    </div>
                  </Field>

                  {/* Org not found error */}
                  {orgCheckError && (
                    <div className={cn(
                      "mt-3 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border",
                      isDarkMode
                        ? "bg-red-500/10 border-red-500/20 text-red-300"
                        : "bg-red-50 border-red-200 text-red-600 shadow-sm"
                    )}>
                      <AlertCircle className={cn("w-5 h-5 shrink-0", isDarkMode ? "text-red-400" : "text-red-500")} />
                      <p className="text-sm font-medium">{orgCheckError}</p>
                    </div>
                  )}

                </div>

                {form.role === 'ADMIN' && (
                  <>
                    <Field label="Industry *" id="industry" error={fieldErrors.industry} isDarkMode={isDarkMode}>
                      <Select value={form.industry} onValueChange={setSelect('industry')}>
                        <SelectTrigger className={cn(
                          "w-full h-10 rounded-md border text-sm px-3 outline-none focus:ring-2 focus:ring-[#48A111]/30 transition-all",
                          isDarkMode ? "border-white/10 bg-white/5 text-white/80" : "border-slate-200 bg-white text-slate-700",
                          fieldErrors.industry && "border-red-500/50"
                        )}>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent className={cn("border-white/10", isDarkMode ? "bg-[#1a1a1a] text-white" : "bg-white text-slate-900")}>
                          {['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Real Estate', 'Media', 'Other'].map(i => (
                            <SelectItem key={i} value={i} className="focus:bg-[#48A111]/10 focus:text-inherit cursor-pointer">{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Company size *" id="size" error={fieldErrors.size} isDarkMode={isDarkMode}>
                      <Select value={form.size} onValueChange={setSelect('size')}>
                        <SelectTrigger className={cn(
                          "w-full h-10 rounded-md border text-sm px-3 outline-none focus:ring-2 focus:ring-[#48A111]/30 transition-all",
                          isDarkMode ? "border-white/10 bg-white/5 text-white/80" : "border-slate-200 bg-white text-slate-700",
                          fieldErrors.size && "border-red-500/50"
                        )}>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className={cn("border-white/10", isDarkMode ? "bg-[#1a1a1a] text-white" : "bg-white text-slate-900")}>
                          {['1-10', '11-50', '51-200', '201-500', '500+'].map(s => (
                            <SelectItem key={s} value={s} className="focus:bg-[#48A111]/10 focus:text-inherit cursor-pointer">{s} employees</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Website (Optional)" id="website" error={fieldErrors.website} isDarkMode={isDarkMode}>
                      <div className="relative">
                        <Globe className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors", isDarkMode ? "text-white/40" : "text-slate-400")} />
                        <Input id="website" placeholder="https://yourcompany.com" value={form.website}
                          onChange={set('website')}
                          className={cn('!pl-10', inputClass('website'))} />
                      </div>
                    </Field>

                    <Field label="Country *" id="country" error={fieldErrors.country} isDarkMode={isDarkMode}>
                      <Select value={form.country} onValueChange={setSelect('country')}>
                        <SelectTrigger className={cn(
                          "w-full h-10 rounded-md border text-sm px-3 outline-none focus:ring-2 focus:ring-[#48A111]/30 transition-all",
                          isDarkMode ? "border-white/10 bg-white/5 text-white/80" : "border-slate-200 bg-white text-slate-700",
                          fieldErrors.country && "border-red-500/50"
                        )}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className={cn("border-white/10", isDarkMode ? "bg-[#1a1a1a] text-white" : "bg-white text-slate-900")}>
                          {['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'UAE', 'Other'].map(c => (
                            <SelectItem key={c} value={c} className="focus:bg-[#48A111]/10 focus:text-inherit cursor-pointer">{c}</SelectItem>
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