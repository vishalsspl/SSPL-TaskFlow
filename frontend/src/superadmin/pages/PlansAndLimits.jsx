import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Save,
  AlertCircle,
  Crown,
  Rocket,
  Building2,
  Users,
  FolderKanban,
  Timer,
  MessageSquare,
  BarChart3,
  Shield,
  Ticket,
  FileText,
  Cloud,
  Headphones,
  Check,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

// All features that can be toggled on/off per plan
const FEATURES = [
  { key: 'projects', label: 'Project Management', description: 'Create and manage multiple project workspaces', icon: FolderKanban },
  { key: 'kanban', label: 'Kanban Boards', description: 'Visual drag-and-drop task management', icon: Rocket },
  { key: 'tasks', label: 'Task Tracking', description: 'Personal and team task tracking', icon: Check },
  { key: 'team', label: 'Team Management', description: 'User roles, invitations, and member control', icon: Users },
  { key: 'timesheets', label: 'Time Tracking', description: 'Log work hours and generate timesheet reports', icon: Timer },
  { key: 'performance', label: 'Performance Analytics', description: 'Team productivity and performance metrics', icon: BarChart3 },
  { key: 'chat', label: 'Team Chat', description: 'Real-time collaboration and messaging', icon: MessageSquare },
  { key: 'tickets', label: 'Support Helpdesk', description: 'Ticketing system for client support requests', icon: Ticket },
  { key: 'branding', label: 'Custom Branding', description: 'Organization logo and theme customization', icon: Building2 },
];

const PLAN_CONFIG = [
  { key: 'free', label: 'Free', color: 'slate-500', icon: Building2, bgClass: 'bg-slate-500/5 border-slate-500/10', textClass: 'text-slate-500' },
  { key: 'starter', label: 'Starter', color: 'primary', icon: Zap, bgClass: 'bg-primary/5 border-primary/10', textClass: 'text-primary' },
  { key: 'pro', label: 'Pro', color: 'blue-500', icon: Rocket, bgClass: 'bg-blue-500/5 border-blue-500/10', textClass: 'text-blue-500' },
  { key: 'enterprise', label: 'Enterprise', color: 'purple-500', icon: Crown, bgClass: 'bg-purple-500/5 border-purple-500/10', textClass: 'text-purple-500' },
];

const PlansAndLimits = () => {
  const { setHeader } = useHeaderStore();
  const { toast } = useToast();
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('limits'); // 'limits', 'features', 'organizations'
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgOverrides, setOrgOverrides] = useState({});

  const [settings, setSettings] = useState({
    // Trial & discount
    defaultTrialDays: '14',
    annual_discount_percent: '17',
    // Starter
    starter_max_users: '30',
    starter_max_projects: '5',
    starter_price: '19',
    starter_per_user_price: '5000',
    // Pro
    pro_max_users: '100',
    pro_max_projects: '50',
    pro_price: '49',
    pro_per_user_price: '15000',
    // Enterprise
    enterprise_max_users: '1000',
    enterprise_max_projects: '500',
    enterprise_price: 'Custom',
    // Feature toggles
    free_features: JSON.stringify({
      projects: true, kanban: false, tasks: true, team: false, 
      timesheets: false, performance: false, chat: false, tickets: false, branding: false
    }),
    starter_features: JSON.stringify({
      projects: true, kanban: true, tasks: true, team: true, 
      timesheets: false, performance: false, chat: false, tickets: false, branding: false
    }),
    pro_features: JSON.stringify({
      projects: true, kanban: true, tasks: true, team: true, 
      timesheets: true, performance: true, chat: true, tickets: false, branding: true
    }),
    enterprise_features: JSON.stringify({
      projects: true, kanban: true, tasks: true, team: true, 
      timesheets: true, performance: true, chat: true, tickets: true, branding: true
    }),
  });

  useEffect(() => {
    setHeader('Plans & Limits', 'Set plan limits, pricing, and control feature access for each plan');
    fetchSettings();
  }, [setHeader]);

  useEffect(() => {
    if (activeTab === 'organizations' && orgs.length === 0) {
      fetchOrgs();
    }
  }, [activeTab]);

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await api.get('/superadmin/orgs');
      setOrgs(res.data);
    } catch (error) {
      console.error('Failed to fetch orgs:', error);
      toast({ title: 'Failed to fetch organizations', variant: 'destructive' });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/superadmin/settings');
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
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

  const getFeatures = (planKey) => {
    try {
      const stored = JSON.parse(settings[`${planKey}_features`] || '{}');
      const sanitized = {};
      FEATURES.forEach(f => {
        sanitized[f.key] = stored[f.key] !== undefined ? stored[f.key] : false;
      });
      return sanitized;
    } catch {
      const empty = {};
      FEATURES.forEach(f => { empty[f.key] = false; });
      return empty;
    }
  };

  const toggleFeature = (planKey, featureKey) => {
    const features = getFeatures(planKey);
    features[featureKey] = !features[featureKey];
    mark(`${planKey}_features`, JSON.stringify(features));
  };

  const handleSave = async () => {
    try {
      await api.put('/superadmin/settings', settings);
      toast({ title: 'Plans & limits saved successfully' });
      setDirty(false);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Could not save plan settings. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const openOrgOverrides = (org) => {
    const defaultFeatures = getFeatures(org.plan.toLowerCase());
    const overrides = org.customFeatures || {};
    // Merge baseline and any existing overrides for display
    setOrgOverrides({ ...defaultFeatures, ...overrides });
    setSelectedOrg(org);
  };

  const saveOrgOverrides = async () => {
    try {
      // Ensure we send the complete set of features (Master List)
      const masterList = {};
      FEATURES.forEach(f => {
        masterList[f.key] = orgOverrides[f.key] ?? false;
      });

      await api.put(`/superadmin/orgs/${selectedOrg.id}`, { customFeatures: masterList });
      setOrgs(orgs.map(o => o.id === selectedOrg.id ? { ...o, customFeatures: masterList } : o));
      toast({ title: 'Organization access customized successfully' });
      setSelectedOrg(null);
    } catch (error) {
      toast({
        title: 'Update failed',
        variant: 'destructive',
        description: 'Failed to save custom access settings.'
      });
    }
  };

  const resetOrgOverrides = async (orgId) => {
    try {
      await api.put(`/superadmin/orgs/${orgId}`, { customFeatures: {} });
      setOrgs(orgs.map(o => o.id === orgId ? { ...o, customFeatures: null } : o));
      toast({ title: 'Organization reset to plan defaults' });
      setSelectedOrg(null);
    } catch (error) {
      toast({
        title: 'Reset failed',
        variant: 'destructive',
        description: 'Could not revert to plan defaults.'
      });
    }
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto p-12 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4 sm:px-0">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-secondary/40 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
        <button
          onClick={() => setActiveTab('limits')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-300 whitespace-nowrap ${
            activeTab === 'limits'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          Plans & Pricing
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-300 whitespace-nowrap ${
            activeTab === 'features'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          Feature Access
        </button>
        <button
          onClick={() => setActiveTab('organizations')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-300 whitespace-nowrap ${
            activeTab === 'organizations'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          Organizations
        </button>
      </div>

      {activeTab === 'limits' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Global Settings */}
          <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
            <CardHeader className="p-8 pb-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Zap className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-widest">General Plan Settings</CardTitle>
                  <CardDescription className="text-[10px] font-bold tracking-widest opacity-60">Trial period and discount settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator className="bg-border/10" />
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground/90">Free Trial Days</Label>
                  <p className="text-[11px] text-muted-foreground font-medium">Number of free trial days for new organizations</p>
                  <div className="relative mt-2">
                    <Input
                      type="number"
                      value={settings.defaultTrialDays}
                      className="h-14 pr-16 rounded-2xl bg-background/50 border-border/40 px-5 font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                      onChange={e => mark('defaultTrialDays', e.target.value)}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-40">Days</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground/90">Annual Discount (%)</Label>
                  <p className="text-[11px] text-muted-foreground font-medium">Discount applied when organizations pay yearly</p>
                  <div className="relative mt-2">
                    <Input
                      type="number"
                      value={settings.annual_discount_percent || '17'}
                      className="h-14 pr-16 rounded-2xl bg-background/50 border-border/40 px-5 font-bold focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                      onChange={e => mark('annual_discount_percent', e.target.value)}
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-40">%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PLAN_CONFIG.map((plan) => (
              <Card key={plan.key} className={`rounded-[2.5rem] border shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden transition-all hover:shadow-3xl hover:scale-[1.01] duration-500 ${plan.bgClass}`}>
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${plan.bgClass} flex items-center justify-center ${plan.textClass} shadow-inner border`}>
                      <plan.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className={`text-lg font-black tracking-widest uppercase ${plan.textClass}`}>{plan.label}</CardTitle>
                      <CardDescription className="text-[10px] font-bold tracking-widest opacity-60 uppercase">Plan Configuration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Separator className="bg-border/10" />
                <CardContent className="p-8 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-50 flex items-center gap-2">
                      <Users className="w-3 h-3" /> Max Users
                    </Label>
                    <Input
                      type="number"
                      value={settings[`${plan.key}_max_users`] || ''}
                      onChange={e => mark(`${plan.key}_max_users`, e.target.value)}
                      className="h-12 rounded-xl bg-background/40 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-50 flex items-center gap-2">
                      <FolderKanban className="w-3 h-3" /> Max Projects
                    </Label>
                    <Input
                      type="number"
                      value={settings[`${plan.key}_max_projects`] || ''}
                      onChange={e => mark(`${plan.key}_max_projects`, e.target.value)}
                      className="h-12 rounded-xl bg-background/40 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-50">Per User Price (₹)</Label>
                    <Input
                      type={plan.key === 'enterprise' ? 'text' : 'number'}
                      value={plan.key === 'enterprise' ? (settings[`${plan.key}_price`] || '') : (settings[`${plan.key}_per_user_price`] || '')}
                      onChange={e => mark(plan.key === 'enterprise' ? `${plan.key}_price` : `${plan.key}_per_user_price`, e.target.value)}
                      className="h-12 rounded-xl bg-background/40 font-bold"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Feature Access Header */}
          <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Shield className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-widest">Feature Access Control</CardTitle>
                  <CardDescription className="text-[10px] font-bold tracking-widest opacity-60">
                    Turn features on or off for each plan. Changes apply to all organizations on that plan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator className="bg-border/10" />
            <CardContent className="p-0 overflow-x-auto no-scrollbar">
              <div className="min-w-[800px]">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_120px_120px_120px] items-center px-8 py-5 border-b border-border/10 bg-muted/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Feature</span>
                  {PLAN_CONFIG.map(plan => (
                    <div key={plan.key} className="text-center">
                      <Badge className={`${plan.bgClass} ${plan.textClass} border text-[9px] font-black tracking-widest uppercase px-3 py-1`}>
                        {plan.label}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Feature Rows */}
                {FEATURES.map((feature, idx) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div
                      key={feature.key}
                      className={`grid grid-cols-[1fr_120px_120px_120px] items-center px-8 py-5 transition-colors hover:bg-primary/[0.02] ${
                        idx < FEATURES.length - 1 ? 'border-b border-border/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                          <FeatureIcon className="w-5 h-5 text-primary/60" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{feature.label}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">{feature.description}</p>
                        </div>
                      </div>
                      {PLAN_CONFIG.map(plan => {
                        const features = getFeatures(plan.key);
                        const isOn = features[feature.key] ?? false;
                        return (
                          <div key={plan.key} className="flex justify-center">
                            <button
                              onClick={() => toggleFeature(plan.key, feature.key)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                isOn
                                  ? `${plan.bgClass} border shadow-sm`
                                  : 'bg-muted/30 border border-border/20 opacity-40 hover:opacity-70'
                              }`}
                            >
                              {isOn ? (
                                <Check className={`w-5 h-5 ${plan.textClass}`} />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_CONFIG.map(plan => {
              const features = getFeatures(plan.key);
              const enabledCount = Object.values(features).filter(Boolean).length;
              return (
                <Card key={plan.key} className={`rounded-2xl border ${plan.bgClass} backdrop-blur-xl p-6 transition-all hover:scale-[1.01] duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <plan.icon className={`w-5 h-5 ${plan.textClass}`} />
                      <span className={`text-sm font-black uppercase tracking-widest ${plan.textClass}`}>{plan.label}</span>
                    </div>
                    <Badge variant="outline" className={`${plan.textClass} border-current text-[10px] font-bold`}>
                      {enabledCount}/{FEATURES.length} features
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 border-current ${plan.textClass} hover:bg-current hover:text-white transition-all`}
                      onClick={() => {
                        const allOn = {};
                        FEATURES.forEach(f => { allOn[f.key] = true; });
                        mark(`${plan.key}_features`, JSON.stringify(allOn));
                      }}
                    >
                      Enable All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 text-muted-foreground border-border/40 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      onClick={() => {
                        const allOff = {};
                        FEATURES.forEach(f => { allOff[f.key] = false; });
                        mark(`${plan.key}_features`, JSON.stringify(allOff));
                      }}
                    >
                      Disable All
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Bar */}
      {dirty && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-black/90 dark:bg-black/95 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center animate-pulse">
                <AlertCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-bold text-sm">Unsaved Changes</h4>
                <p className="text-white/40 text-[10px] font-bold">You have plan changes that haven't been saved yet</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="ghost" className="h-14 rounded-2xl px-8 text-white/60 hover:text-white font-bold text-[11px]" onClick={() => { fetchSettings(); setDirty(false); }}>
                Discard
              </Button>
              <Button className="h-14 rounded-2xl px-12 bg-primary text-white font-bold text-[11px] shadow-xl shadow-primary/30 flex-1 sm:flex-none" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-widest">Client Organizations</CardTitle>
                  <CardDescription className="text-[10px] font-bold tracking-widest opacity-60">
                    See all active organizations, their plans, and customize features exclusively for them.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator className="bg-border/10" />
            <CardContent className="p-0 overflow-x-auto no-scrollbar">
              <div className="min-w-[700px]">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] items-center px-8 py-5 border-b border-border/10 bg-muted/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Organization</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plan</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Custom Overrides</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</span>
                </div>
                
                {loadingOrgs ? (
                  <div className="p-16 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : orgs.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground font-bold text-sm">No organizations found.</div>
                ) : (
                  orgs.map((org, idx) => {
                    const overrides = org.customFeatures || org.custom_features || {};
                    const hasOverrides = Object.keys(overrides).length > 0;
                    const planConfig = PLAN_CONFIG.find(p => p.key === org.plan?.toLowerCase()) || PLAN_CONFIG[0];
                    
                    return (
                      <div
                        key={org.id}
                        className={`grid grid-cols-[2fr_1fr_1fr_auto] items-center px-8 py-5 transition-colors hover:bg-primary/[0.02] ${
                          idx < orgs.length - 1 ? 'border-b border-border/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 border border-border/30">
                            {org.logoUrl ? (
                               <img src={org.logoUrl} alt={org.name} className="w-6 h-6 object-contain" />
                            ) : (
                               <span className="font-black text-sm text-foreground/50">{org.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{org.name}</p>
                            <p className="text-[11px] text-muted-foreground font-medium">{org._count?.users || 0} Users</p>
                          </div>
                        </div>
                        
                        <div>
                           <Badge className={`${planConfig.bgClass} ${planConfig.textClass} border text-[9px] font-black tracking-widest uppercase px-3 py-1`}>
                             {org.plan}
                           </Badge>
                        </div>
                        
                        <div className="text-center">
                          {hasOverrides ? (
                             <Badge variant="outline" className="border-primary text-primary bg-primary/5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                Customized
                             </Badge>
                          ) : (
                             <span className="text-xs text-muted-foreground/60 font-bold">-</span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <Button 
                             variant="outline" 
                             size="sm" 
                             onClick={() => openOrgOverrides(org)}
                             className="h-9 px-4 rounded-xl text-[10px] font-bold tracking-widest uppercase hover:bg-primary hover:text-white transition-all shadow-sm"
                          >
                             Manage Access
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Editor Modal for Org Access */}
      {selectedOrg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-background rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border/20 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-border/10 flex justify-between items-center bg-muted/10">
               <div>
                 <h3 className="text-xl font-black uppercase tracking-widest">Customize {selectedOrg.name}</h3>
                 <p className="text-xs text-muted-foreground mt-2 font-medium">Turn specific features on or off as an exception for this organization only.</p>
               </div>
               <button onClick={() => setSelectedOrg(null)} className="p-3 bg-background hover:bg-muted border border-border/20 rounded-2xl transition-all"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
               {FEATURES.map(feature => {
                  const defaultPlanFeatures = getFeatures(selectedOrg.plan?.toLowerCase() || 'trial');
                  const isDefaultOn = defaultPlanFeatures[feature.key] ?? false;
                  const isOn = orgOverrides[feature.key] ?? isDefaultOn;
                  const isOverridden = orgOverrides[feature.key] !== undefined && orgOverrides[feature.key] !== isDefaultOn;
                  const FeatureIcon = feature.icon;
                  
                  return (
                    <div key={feature.key} className="flex items-center justify-between p-5 mb-2 hover:bg-muted/30 rounded-2xl transition-all border border-transparent hover:border-border/20">
                       <div className="flex gap-4 items-center">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${isOn ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted border-border/20 text-muted-foreground'}`}>
                             <FeatureIcon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-3">
                                <span className="font-bold text-sm tracking-wide">{feature.label}</span>
                                {isOverridden && (
                                   <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest px-1.5 py-0">Custom</Badge>
                                )}
                             </div>
                             <span className="text-xs text-muted-foreground/80 font-medium">{feature.description}</span>
                          </div>
                       </div>
                       <Switch 
                         checked={isOn} 
                         onCheckedChange={(c) => {
                            setOrgOverrides(prev => ({
                               ...prev,
                               [feature.key]: c
                            }));
                         }} 
                       />
                    </div>
                  )
               })}
            </div>
            <div className="p-6 border-t border-border/10 bg-muted/10 flex gap-4 justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10 font-bold uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-primary/20">
               <Button 
                variant="outline" 
                onClick={() => resetOrgOverrides(selectedOrg.id)}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 font-bold uppercase text-[11px] tracking-widest rounded-2xl px-8 h-12"
               >
                 Reset to Plan
               </Button>
               <div className="flex gap-4">
                  <Button variant="ghost" className="rounded-2xl px-8 h-12 font-bold text-[11px] uppercase tracking-widest" onClick={() => setSelectedOrg(null)}>Discard</Button>
                  <Button className="rounded-2xl px-10 h-12 bg-primary font-bold text-[11px] shadow-xl shadow-primary/20 uppercase tracking-widest" onClick={saveOrgOverrides}>Save Customizations</Button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlansAndLimits;
