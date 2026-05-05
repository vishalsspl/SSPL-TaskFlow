import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Zap,
  Users,
  Briefcase,
  CheckCircle2,
  Search,
  LayoutDashboard,
  ShieldCheck,
  Activity,
  MessageSquare,
  ClipboardList,
  Ticket,
  Kanban,
  Flag,
  Globe,
  Settings2,
  Mail,
  Github,
  Save,
  Check,
  ArrowLeft
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PlansAndLimits = () => {
  const { setHeader } = useHeaderStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('companies');

  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [currentOrg, setCurrentOrg] = useState(null);
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  const [globalTiers, setGlobalTiers] = useState({
    FREE: { maxUsers: 10, maxProjects: 3, pricePerUser: 0, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true, github: true } },
    STARTER: { maxUsers: 30, maxProjects: 5, pricePerUser: 10, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true, github: true } },
    PRO: { maxUsers: 100, maxProjects: 50, pricePerUser: 10, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true, github: true } },
    ENTERPRISE: { maxUsers: 1000, maxProjects: 500, pricePerUser: 0, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true, github: true } }
  });
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);

  useEffect(() => {
    setHeader('Plans & Limits', 'Manage organization resource quotas and feature access');
    fetchOrgs();
    fetchGlobalTiers();
  }, [setHeader]);

  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await api.get('/organizations');
      setOrgs(res.data.data || res.data || []);
    } catch {
      toast({ title: 'Failed to load organisations', variant: 'destructive' });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchGlobalTiers = async () => {
    setLoadingTiers(true);
    try {
      const res = await api.get('/superadmin/settings');
      const s = res.data || {};
      const newTiers = { ...globalTiers };
      ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].forEach(p => {
        const lp = p.toLowerCase();
        if (s[`${lp}_max_users`]) newTiers[p].maxUsers = Number(s[`${lp}_max_users`]);
        if (s[`${lp}_max_projects`]) newTiers[p].maxProjects = Number(s[`${lp}_max_projects`]);
        if (s[`${lp}_per_user_price`] !== undefined) newTiers[p].pricePerUser = Number(s[`${lp}_per_user_price`]);
        if (s[`${lp}_features`]) {
          try {
            newTiers[p].features = typeof s[`${lp}_features`] === 'string'
              ? JSON.parse(s[`${lp}_features`])
              : s[`${lp}_features`];
          } catch (e) {
            console.error(`Failed to parse features for ${p}`, e);
          }
        }
      });
      setGlobalTiers(newTiers);
    } catch (e) {
      console.error('Failed to fetch global tiers:', e);
    } finally {
      setLoadingTiers(false);
    }
  };

  const selectOrg = (org) => {
    setSelectedOrgId(org.id);
    setCurrentOrg({
      ...org,
      customFeatures: org.customFeatures || {
        projects: true, kanban: true, tasks: true, tickets: true,
        team: true, chat: true, performance: true, timesheets: true, github: true
      }
    });
  };

  const handlePlanSelection = (planId) => {
    const defaults = globalTiers[planId];
    if (!defaults) return;
    console.log('[Plan Switch]', planId, 'defaults:', defaults.maxUsers, defaults.maxProjects);
    setCurrentOrg(prev => ({
      ...prev,
      plan: planId,
      maxUsers: Number(defaults.maxUsers),
      maxProjects: Number(defaults.maxProjects),
      customFeatures: { ...(prev.customFeatures || {}), ...defaults.features }
    }));
  };

  const handleUpdateOrg = async () => {
    if (!currentOrg) return;
    setSavingOrg(true);
    try {
      await api.put(`/superadmin/orgs/${currentOrg.id}`, {
        plan: currentOrg.plan,
        maxUsers: Number(currentOrg.maxUsers),
        maxProjects: Number(currentOrg.maxProjects),
        customFeatures: currentOrg.customFeatures
      });
      toast({ title: 'Organization updated', description: `${currentOrg.name} has been updated successfully.` });
      fetchOrgs();
    } catch (err) {
      toast({ title: 'Failed to update', description: err.response?.data?.error, variant: 'destructive' });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleUpdateGlobalTiers = async () => {
    setSavingTiers(true);
    try {
      const payload = {};
      Object.entries(globalTiers).forEach(([p, data]) => {
        const lp = p.toLowerCase();
        payload[`${lp}_max_users`] = data.maxUsers;
        payload[`${lp}_max_projects`] = data.maxProjects;
        payload[`${lp}_per_user_price`] = data.pricePerUser;
        payload[`${lp}_features`] = JSON.stringify(data.features);
      });
      await api.put('/superadmin/settings', payload);
      toast({ title: 'Global Tiers updated', description: 'New organization defaults have been synchronized.' });
    } catch (err) {
      toast({ title: 'Failed to update global tiers', variant: 'destructive' });
    } finally {
      setSavingTiers(false);
    }
  };

  const toggleOrgFeature = (key) => {
    setCurrentOrg(prev => ({
      ...prev,
      customFeatures: {
        ...(prev.customFeatures || {}),
        [key]: prev.customFeatures?.[key] === false ? true : false
      }
    }));
  };

  const toggleGlobalFeature = (plan, key) => {
    setGlobalTiers(prev => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        features: { ...prev[plan].features, [key]: !prev[plan].features[key] }
      }
    }));
  };

  const FEATURES = [
    { key: 'projects', label: 'Projects', icon: LayoutDashboard },
    { key: 'kanban', label: 'Kanban Board', icon: Kanban },
    { key: 'tasks', label: 'Tasks', icon: ClipboardList },
    { key: 'tickets', label: 'Tickets', icon: Ticket },
    { key: 'team', label: 'Team', icon: Users },
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'performance', label: 'Performance', icon: Activity },
    { key: 'timesheets', label: 'Timesheets', icon: ShieldCheck },
    { key: 'emailSupport', label: 'Email Support', icon: Mail },
    { key: 'github', label: 'Github', icon: Github },
  ];

  const PLANS = [
    { id: 'FREE', name: 'Free', color: 'bg-slate-500' },
    { id: 'STARTER', name: 'Starter', color: 'bg-blue-500' },
    { id: 'PRO', name: 'Pro', color: 'bg-indigo-600' },
    { id: 'ENTERPRISE', name: 'Enterprise', color: 'bg-amber-600' }
  ];

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
    o.industry?.toLowerCase().includes(orgSearchTerm.toLowerCase())
  );

  /* ─── Toggle Switch Component ──────────────────────────── */
  const Toggle = ({ enabled, size = 'sm' }) => {
    const sizes = {
      sm: { track: 'w-8 h-[18px]', thumb: 'w-3.5 h-3.5' },
      xs: { track: 'w-7 h-4', thumb: 'w-3 h-3' },
    };
    const s = sizes[size];
    return (
      <div className={cn(s.track, "rounded-full flex items-center transition-all duration-200 px-0.5 shrink-0 cursor-pointer", enabled ? "bg-primary justify-end" : "bg-muted justify-start")}>
        <div className={cn(s.thumb, "rounded-full bg-white shadow-sm transition-all")} />
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="rounded-xl bg-secondary/10 p-1 border border-border/10 h-9">
            <TabsTrigger value="companies" className="rounded-lg px-5 font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white h-full">
              <Building2 className="w-3.5 h-3.5 mr-1.5" /> Organizations
            </TabsTrigger>
            <TabsTrigger value="tiers" className="rounded-lg px-5 font-semibold text-xs data-[state=active]:bg-primary data-[state=active]:text-white h-full">
              <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Plan Tiers
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ORGANIZATIONS TAB ──────────────────────────────── */}
        <TabsContent value="companies" className="m-0 p-0 outline-none ring-0">
          <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-180px)]">

            {/* Left Sidebar: Company List */}
            <Card className={cn(
              "w-full lg:w-64 flex flex-col rounded-xl border-border/30 bg-background shrink-0 overflow-hidden",
              currentOrg ? "hidden lg:flex" : "flex"
            )}>
              <CardHeader className="p-3 pb-2 border-b border-border/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Companies</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 h-5 rounded-md">{orgs.length}</Badge>
                </div>
                <Input
                  placeholder="Search..."
                  className="h-8 text-xs rounded-lg border-border/30 bg-secondary/10"
                  value={orgSearchTerm}
                  onChange={(e) => setOrgSearchTerm(e.target.value)}
                />
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                  {loadingOrgs ? (
                    <div className="p-8 text-center"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div>
                  ) : (
                    filteredOrgs.map(o => (
                      <div
                        key={o.id}
                        onClick={() => selectOrg(o)}
                        className={cn(
                          "px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2",
                          selectedOrgId === o.id
                            ? "bg-primary text-white shadow-md"
                            : "hover:bg-secondary/30"
                        )}
                      >
                        <span className="text-xs font-semibold truncate">{o.name}</span>
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-4 px-1.5 font-bold uppercase shrink-0",
                          selectedOrgId === o.id ? "border-white/40 text-white" : "border-border/30 opacity-60"
                        )}>{o.plan}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Right Content: Organization Detail */}
            <div className="flex-1 lg:overflow-y-auto">
              {currentOrg ? (
                <div className="space-y-3 animate-in slide-in-from-right-4 duration-400">

                  {/* Org Header Bar */}
                  <Card className="rounded-xl border-border/30 overflow-hidden">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 shrink-0" onClick={() => { setSelectedOrgId(''); setCurrentOrg(null); }}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold truncate">{currentOrg.name}</h2>
                          <div className="flex gap-2 sm:gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                            {currentOrg.country && <span className="flex items-center gap-1 whitespace-nowrap"><Flag className="w-3 h-3" />{currentOrg.country}</span>}
                            {currentOrg.industry && <span className="flex items-center gap-1 whitespace-nowrap"><Briefcase className="w-3 h-3" />{currentOrg.industry}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                        <Badge className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-bold uppercase",
                          currentOrg.status === 'ACTIVE' ? 'bg-primary text-white' : 'bg-orange-500 text-white'
                        )}>{currentOrg.status}</Badge>
                        <Button onClick={handleUpdateOrg} disabled={savingOrg} size="sm" className="h-8 rounded-lg text-xs font-semibold gap-1.5 flex-1 sm:flex-none">
                          {savingOrg ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Main Grid: Plan + Quotas + Features */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">

                    {/* Plan Selection + Quotas */}
                    <div className="xl:col-span-4 space-y-3">
                      <Card className="rounded-xl border-border/30">
                        <CardHeader className="p-3 pb-2 border-b border-border/10">
                          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> Plan
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1">
                          {PLANS.map(p => (
                            <div
                              key={p.id}
                              onClick={() => handlePlanSelection(p.id)}
                              className={cn(
                                "px-3 py-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                currentOrg.plan === p.id
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent hover:bg-secondary/20"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", p.color)} />
                                <span className="text-xs font-semibold">{p.name}</span>
                              </div>
                              {currentOrg.plan === p.id && <Check className="w-3.5 h-3.5 text-primary" />}
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border-border/30">
                        <CardHeader className="p-3 pb-2 border-b border-border/10">
                          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Resource Limits
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">Max Users</Label>
                            <Input
                              type="number"
                              value={currentOrg.maxUsers}
                              onChange={e => setCurrentOrg(p => ({ ...p, maxUsers: e.target.value }))}
                              className="h-8 rounded-lg text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">Max Projects</Label>
                            <Input
                              type="number"
                              value={currentOrg.maxProjects}
                              onChange={e => setCurrentOrg(p => ({ ...p, maxProjects: e.target.value }))}
                              className="h-8 rounded-lg text-sm font-semibold"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Feature Toggles - COMPACT */}
                    <Card className="xl:col-span-8 rounded-xl border-border/30">
                      <CardHeader className="p-3 pb-2 border-b border-border/10">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Settings2 className="w-3.5 h-3.5" /> Feature Access
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {FEATURES.map(f => {
                            const isEnabled = currentOrg.customFeatures?.[f.key] !== false;
                            return (
                              <div
                                key={f.key}
                                onClick={() => toggleOrgFeature(f.key)}
                                className={cn(
                                  "px-3 py-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2",
                                  isEnabled
                                    ? "border-primary/20 bg-primary/5"
                                    : "border-border/10 opacity-40 grayscale"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <f.icon className={cn("w-3.5 h-3.5 shrink-0", isEnabled ? "text-primary" : "text-muted-foreground")} />
                                  <span className="text-[10px] font-semibold truncate">{f.label}</span>
                                </div>
                                <Toggle enabled={isEnabled} size="xs" />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-20 opacity-30 text-center">
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto border-2 border-dashed border-border/40">
                      <Search className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Select an Organization</h3>
                      <p className="text-xs mt-1 opacity-60">Choose a company from the list to manage its plan and features</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── PLAN TIERS TAB ─────────────────────────────────── */}
        <TabsContent value="tiers" className="m-0 p-0 outline-none ring-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            {PLANS.map(p => (
              <Card key={p.id} className="rounded-xl border-border/30 overflow-hidden">
                <CardHeader className="p-4 pb-3 border-b border-border/10">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", p.color)}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                      <CardDescription className="text-[10px]">Global defaults</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium opacity-60">Max Users</Label>
                      <Input
                        type="number"
                        value={globalTiers[p.id].maxUsers}
                        onChange={e => setGlobalTiers(prev => ({ ...prev, [p.id]: { ...prev[p.id], maxUsers: e.target.value } }))}
                        className="h-8 rounded-lg text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-medium opacity-60">Max Projects</Label>
                      <Input
                        type="number"
                        value={globalTiers[p.id].maxProjects}
                        onChange={e => setGlobalTiers(prev => ({ ...prev, [p.id]: { ...prev[p.id], maxProjects: e.target.value } }))}
                        className="h-8 rounded-lg text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {/* Price Per User */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium opacity-60">Price Per User / Month (₹)</Label>
                    {p.id === 'FREE' ? (
                      <Input
                        type="text"
                        value="₹0 (Free)"
                        disabled
                        className="h-8 rounded-lg text-sm font-semibold opacity-50"
                      />
                    ) : p.id === 'ENTERPRISE' ? (
                      <Input
                        type="text"
                        value="Custom Pricing"
                        disabled
                        className="h-8 rounded-lg text-sm font-semibold opacity-50"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary shrink-0">₹</span>
                        <Input
                          type="number"
                          min="0"
                          value={globalTiers[p.id].pricePerUser}
                          onChange={e => setGlobalTiers(prev => ({ ...prev, [p.id]: { ...prev[p.id], pricePerUser: e.target.value } }))}
                          className="h-8 rounded-lg text-sm font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-primary">Default Features</span>
                    <div className="space-y-1">
                      {FEATURES.map(f => {
                        const isEnabled = globalTiers[p.id].features[f.key] !== false;
                        return (
                          <div
                            key={f.key}
                            onClick={() => toggleGlobalFeature(p.id, f.key)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-md border cursor-pointer transition-all flex items-center justify-between gap-2",
                              isEnabled
                                ? "border-primary/15 bg-primary/5"
                                : "border-border/10 opacity-40"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <f.icon className={cn("w-3 h-3 shrink-0", isEnabled ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-[10px] font-medium truncate">{f.label}</span>
                            </div>
                            <Toggle enabled={isEnabled} size="xs" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 mb-10 max-w-sm mx-auto">
            <Button
              onClick={handleUpdateGlobalTiers}
              disabled={savingTiers}
              className="w-full h-10 rounded-xl font-semibold text-sm"
            >
              {savingTiers ? 'Saving...' : 'Save Tier Settings'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlansAndLimits;
