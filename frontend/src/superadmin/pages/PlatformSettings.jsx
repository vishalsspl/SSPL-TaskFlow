import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  Mail,
  Zap,
  Save,
  AlertCircle,
  Cpu,
  Fingerprint,
  Monitor,
  Sun,
  Moon,
  Check
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

const PlatformSettings = () => {
  const { setHeader } = useHeaderStore();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    platformName: 'SSPL-TaskFlow',
    supportEmail: 'ops@taskflow.io',
    defaultTrialDays: '14',
    freeTierProjects: '3',
    mfaMandate: true,
    sessionExpiry: '120'
  });

  useEffect(() => {
    setHeader('Platform Settings', 'Manage general settings, plans, and security options');
    fetchSettings();
  }, [setHeader]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/superadmin/settings');
      if (res.data) {
        setSettings(prev => ({
          ...prev,
          ...res.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const mark = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      await api.put('/superadmin/settings', settings);
      toast({ title: 'Settings saved successfully' });
      setDirty(false);
    } catch (error) {
      toast({ 
        title: 'Save failed', 
        description: 'Could not save settings. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const SettingSection = ({ title, description, icon: Icon, children }) => (
    <Card className="rounded-3xl sm:rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden group transition-all">
      <CardHeader className="p-5 sm:p-8 sm:pb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-inner transition-transform group-hover:scale-105 shrink-0">
            <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <CardTitle className="text-lg sm:text-xl font-bold tracking-widest">{title}</CardTitle>
            <CardDescription className="text-[9px] sm:text-[10px] font-bold tracking-widest opacity-60 leading-tight">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator className="bg-border/10" />
      <CardContent className="p-5 sm:p-8 space-y-6 sm:space-y-8">
        {children}
      </CardContent>
    </Card>
  );

  const FormRow = ({ label, description, children }) => (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
      <div className="space-y-1 sm:space-y-1.5 max-w-xl">
        <Label className="text-sm font-bold text-foreground/90">{label}</Label>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{description}</p>
      </div>
      <div className="w-full lg:w-72 shrink-0">
        {children}
      </div>
    </div>
  );

  if (loading) return (
    <div className="max-w-5xl mx-auto p-12 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-24 px-4 sm:px-0">
      
      {/* ── Public Identity ────────────────────────────────────────────── */}
      <SettingSection
        title="General Settings"
        description="Basic platform name and contact details"
        icon={Globe}
      >
        <FormRow label="Platform Name" description="The name shown across the platform">
          <Input 
            value={settings.platformName} 
            className="h-14 rounded-2xl bg-background/50 border-border/40 px-5 font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" 
            onChange={e => mark('platformName', e.target.value)} 
          />
        </FormRow>
        <FormRow label="Support Email" description="Contact email for support requests">
          <Input 
            value={settings.supportEmail} 
            className="h-14 rounded-2xl bg-background/50 border-border/40 px-5 font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" 
            onChange={e => mark('supportEmail', e.target.value)} 
          />
        </FormRow>
        <FormRow label="Maintenance Mode" description="Block all user access to the platform (only Super Admin can access)">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
              <span className="text-[10px] font-bold text-primary/60">Off</span>
              <Switch checked={settings.stasisMode === 'true'} onCheckedChange={checked => mark('stasisMode', String(checked))} />
            </div>
          </div>
        </FormRow>
      </SettingSection>


      {/* ── Appearance ────────────────────────────────────────────── */}
      <SettingSection
        title="Interface Appearance"
        description="Customize the local appearance of the super admin dashboard"
        icon={Monitor}
      >
        <div className="space-y-1">
          <Label className="text-base">System Theme</Label>
          <p className="text-sm text-muted-foreground mb-6">
            Automatically switch between day and night themes or force a specific mode.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Light Theme Option */}
            <button
              onClick={() => setTheme('light')}
              className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 text-left ${theme === 'light'
                ? 'border-primary bg-primary/5 shadow-[0_0_40px_rgba(72,161,17,0.15)] scale-[1.02]'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
            >
              <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                <div className="h-full w-full bg-[#f8fafc] p-2 flex flex-col gap-2">
                  <div className="h-1.5 w-12 rounded bg-slate-200" />
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 rounded bg-white shadow-sm border border-slate-100" />
                    <div className="h-10 flex-1 rounded bg-white shadow-sm border border-slate-100" />
                  </div>
                  <div className="h-full w-full rounded bg-white shadow-sm border border-slate-100" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground'}`}>
                    <Sun className="h-4 w-4" />
                  </div>
                  <span className={`font-bold Montserrat text-sm ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`}>Light</span>
                </div>
                {theme === 'light' && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white stroke-[3]" />
                  </div>
                )}
              </div>
            </button>

            {/* Dark Theme Option */}
            <button
              onClick={() => setTheme('dark')}
              className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 text-left ${theme === 'dark'
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_40px_rgba(139,92,246,0.15)] scale-[1.02]'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
            >
              <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                <div className="h-full w-full bg-slate-950 p-2 flex flex-col gap-2">
                  <div className="h-1.5 w-12 rounded bg-slate-800" />
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 rounded bg-slate-900 border border-white/5" />
                    <div className="h-10 flex-1 rounded bg-slate-900 border border-white/5" />
                  </div>
                  <div className="h-full w-full rounded bg-slate-900 border border-white/5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-muted-foreground'}`}>
                    <Moon className="h-4 w-4" />
                  </div>
                  <span className={`font-bold Montserrat text-sm ${theme === 'dark' ? 'text-[#8B5CF6]' : 'text-muted-foreground'}`}>Dark</span>
                </div>
                {theme === 'dark' && (
                  <div className="h-5 w-5 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white stroke-[3]" />
                  </div>
                )}
              </div>
            </button>

            {/* System Theme Option */}
            <button
              onClick={() => setTheme('system')}
              className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all duration-300 text-left ${theme === 'system'
                ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 shadow-[0_0_40px_rgba(14,165,233,0.15)] scale-[1.02]'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
            >
              <div className="aspect-[16/10] w-full rounded-xl overflow-hidden mb-4 border border-white/5">
                <div className="h-full w-full bg-slate-900/50 p-2 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="h-1.5 w-12 rounded bg-slate-700" />
                    <div className="h-1.5 w-8 rounded bg-slate-700" />
                  </div>
                  <div className="h-full w-full rounded-lg border border-white/10 overflow-hidden flex">
                    <div className="w-1/2 h-full bg-white opacity-20" />
                    <div className="w-1/2 h-full bg-black opacity-40" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${theme === 'system' ? 'bg-[#0EA5E9] text-white' : 'bg-white/5 text-muted-foreground'}`}>
                    <Monitor className="h-4 w-4" />
                  </div>
                  <span className={`font-bold Montserrat text-sm ${theme === 'system' ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}>System</span>
                </div>
                {theme === 'system' && (
                  <div className="h-5 w-5 rounded-full bg-[#0EA5E9] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white stroke-[3]" />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </SettingSection>

      {/* ── Security ────────────────────────────────────────────── */}
      <SettingSection
        title="Security Settings"
        description="Login and session security options"
        icon={Fingerprint}
      >
        <FormRow label="Require Two-Step Login" description="Require two-step verification for all Admin users">
          <div className="flex items-center justify-end">
            <Switch checked={settings.mfaMandate === 'true' || settings.mfaMandate === true} onCheckedChange={checked => mark('mfaMandate', checked)} className="data-[state=checked]:bg-primary" />
          </div>
        </FormRow>
        <FormRow label="Auto Logout Time" description="Minutes of no activity before users are automatically logged out">
          <Input 
            type="number" 
            value={settings.sessionExpiry} 
            className="h-14 rounded-2xl bg-background/50 border-border/40 px-5 font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" 
            onChange={e => mark('sessionExpiry', e.target.value)} 
          />
        </FormRow>
      </SettingSection>

      {/* ── Override Hub ────────────────────────────────────────────── */}
      {dirty && (
        <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-black/90 dark:bg-black/95 backdrop-blur-3xl p-4 sm:p-6 rounded-3xl sm:rounded-[2.5rem] border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto w-full sm:w-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-xl sm:rounded-2xl flex items-center justify-center animate-pulse shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-white font-bold text-xs sm:text-sm">Unsaved Changes</h4>
                <p className="text-white/40 text-[9px] sm:text-[10px] font-bold leading-tight mt-0.5">You have changes that haven't been saved yet</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="ghost" className="h-10 sm:h-14 rounded-xl sm:rounded-2xl px-6 sm:px-8 text-white/60 hover:text-white font-bold text-[10px] sm:text-[11px] w-1/2 sm:w-auto" onClick={() => setDirty(false)}>
                Discard
              </Button>
              <Button className="h-10 sm:h-14 rounded-xl sm:rounded-2xl px-6 sm:px-12 bg-primary text-white font-bold text-[10px] sm:text-[11px] shadow-xl shadow-primary/30 w-1/2 sm:w-auto flex-1 sm:flex-none" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSettings;