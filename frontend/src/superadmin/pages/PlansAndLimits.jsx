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
  ListFilter
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
  
  // Organization States
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [currentOrg, setCurrentOrg] = useState(null);
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  // Global Plan Tiers States
  const [globalTiers, setGlobalTiers] = useState({
    FREE: { maxUsers: 10, maxProjects: 3, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true } },
    STARTER: { maxUsers: 30, maxProjects: 5, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true } },
    PRO: { maxUsers: 100, maxProjects: 50, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true } },
    ENTERPRISE: { maxUsers: 1000, maxProjects: 500, features: { projects: true, kanban: true, tasks: true, tickets: true, team: true, chat: true, performance: true, timesheets: true } }
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
        team: true, chat: true, performance: true, timesheets: true
      }
    });
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
        features: {
          ...prev[plan].features,
          [key]: !prev[plan].features[key]
        }
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
  ];

  const PLANS = [
    { id: 'FREE', name: 'Free', color: 'bg-slate-500', desc: 'Basic for small teams' },
    { id: 'STARTER', name: 'Starter', color: 'bg-blue-500', desc: 'Essential tools' },
    { id: 'PRO', name: 'Pro', color: 'bg-indigo-600', desc: 'Advanced features' },
    { id: 'ENTERPRISE', name: 'Enterprise', color: 'bg-amber-600', desc: 'Ultimate control' }
  ];

  const filteredOrgs = orgs.filter(o => 
    o.name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
    o.industry?.toLowerCase().includes(orgSearchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="rounded-2xl bg-secondary/10 p-1 border border-border/10 h-11">
            <TabsTrigger value="companies" className="rounded-xl px-8 font-bold text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all h-full">
              <Building2 className="w-4 h-4 mr-2" /> Organizations
            </TabsTrigger>
            <TabsTrigger value="tiers" className="rounded-xl px-8 font-bold text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm transition-all h-full">
              <Settings2 className="w-4 h-4 mr-2" /> Plan Tiers
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── COMPANY LIST & DETAIL VIEW ─────────────────────────────────── */}
        <TabsContent value="companies" className="m-0 p-0 outline-none ring-0">
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] overflow-hidden">
            <Card className="w-full lg:w-80 h-full flex flex-col rounded-[2.5rem] border-border/40 bg-background/50 backdrop-blur-xl shrink-0 border overflow-hidden">
              <CardHeader className="p-6 border-b border-border/10">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center justify-between">
                  Companies
                  <Badge variant="secondary" className="text-[9px] px-2 rounded-lg">{orgs.length}</Badge>
                </CardTitle>
                <div className="relative">
                  <Input 
                    placeholder="Search companies..." 
                    className="h-11 px-4 rounded-xl border-border/40 bg-background/50 font-bold text-[11px] Montserrat focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                    value={orgSearchTerm}
                    onChange={(e) => setOrgSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1">
                  {loadingOrgs ? (
                    <div className="p-10 text-center space-y-3 opacity-20">
                      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                  ) : (
                    filteredOrgs.map(o => (
                      <div 
                        key={o.id}
                        onClick={() => selectOrg(o)}
                        className={cn(
                          "p-4 rounded-2xl cursor-pointer group transition-all duration-300 relative flex flex-col gap-1.5",
                          selectedOrgId === o.id ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black truncate leading-none uppercase tracking-tight">{o.name}</span>
                          <Badge variant="outline" className={cn("text-[8px] h-4 px-1.5 font-extrabold uppercase", selectedOrgId === o.id ? "border-white/40 text-white" : "border-border/30 opacity-70")}>{o.plan}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar outline-none ring-0">
              {currentOrg ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in slide-in-from-right-4 duration-500 pb-10">
                  <Card className="xl:col-span-3 rounded-[2.5rem] border-border/40 shadow-xl bg-background/50 backdrop-blur-xl border border-primary/5">
                    <CardContent className="p-8 flex items-center justify-between">
                      <div className="flex items-center gap-6 font-montserrat">
                        <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/5 shadow-inner">
                          <Building2 className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black tracking-tighter uppercase">{currentOrg.name}</h2>
                          <div className="flex gap-4 text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">
                             <span><Flag className="w-3 h-3 inline mr-1" /> {currentOrg.country || 'N/A'}</span>
                             <span><Briefcase className="w-3 h-3 inline mr-1" /> {currentOrg.industry}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={cn("px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest", currentOrg.status === 'ACTIVE' ? 'bg-[#48A111] text-white shadow-lg shadow-green-500/20' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20')}>{currentOrg.status}</Badge>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="rounded-[2.5rem] border-border/40 bg-background/50 backdrop-blur-xl border border-secondary">
                      <CardHeader className="p-8 pb-4 border-b border-border/5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Zap className="w-4 h-4" /> Subscription Payload</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-3">
                        {PLANS.map(p => (
                          <div key={p.id} onClick={() => setCurrentOrg(prev => ({ ...prev, plan: p.id }))} className={cn("p-4 rounded-2xl border-2 cursor-pointer transition-all", currentOrg.plan === p.id ? "border-primary bg-primary/5 shadow-lg" : "border-border/10 bg-muted/5")}>
                            <span className={cn("text-[9px] font-black px-3 py-1 rounded-full text-white uppercase", p.color)}>{p.name} tier</span>
                            <p className="text-[10px] font-bold mt-2 opacity-50 uppercase tracking-tighter">{p.desc}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    
                    <Card className="rounded-[2.5rem] border-border/40 bg-background/50 border overflow-hidden">
                      <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-primary/70 ml-2 tracking-widest">Access Ceiling (Users)</Label>
                          <Input type="number" value={currentOrg.maxUsers} onChange={e => setCurrentOrg(p => ({ ...p, maxUsers: e.target.value }))} className="h-14 rounded-[1.5rem] border-border/40 bg-background px-6 font-black text-lg focus:ring-4 focus:ring-primary/10 shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-primary/70 ml-2 tracking-widest">Access Ceiling (Projects)</Label>
                          <Input type="number" value={currentOrg.maxProjects} onChange={e => setCurrentOrg(p => ({ ...p, maxProjects: e.target.value }))} className="h-14 rounded-[1.5rem] border-border/40 bg-background px-6 font-black text-lg focus:ring-4 focus:ring-primary/10 shadow-inner" />
                        </div>
                        <Button onClick={handleUpdateOrg} disabled={savingOrg} className="w-full h-15 py-7 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">{savingOrg ? 'Synchronizing Pipeline...' : 'Deploy Access Overrides'}</Button>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="xl:col-span-2 rounded-[3rem] border-border/40 bg-background shadow-2xl border overflow-hidden">
                    <CardHeader className="p-8 border-b border-border/5 bg-secondary/5">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2"><Settings2 className="w-5 h-5" /> Feature Gate Matrix</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {FEATURES.map(f => {
                        const isEnabled = currentOrg.customFeatures?.[f.key] !== false;
                        return (
                          <div key={f.key} onClick={() => toggleOrgFeature(f.key)} className={cn("p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between", isEnabled ? "border-primary/20 bg-background shadow-md" : "border-border/10 opacity-30 grayscale")}>
                            <div className="flex items-center gap-5">
                              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", isEnabled ? "bg-primary/10 text-primary" : "bg-muted")}>
                                <f.icon className="w-5 h-5" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-tight">{f.label}</span>
                            </div>
                            <div className={cn("w-10 h-6 rounded-full flex items-center transition-all px-1", isEnabled ? "bg-[#48A111] justify-end shadow-inner" : "bg-muted justify-start")}>
                              <div className="w-4 h-4 rounded-full bg-white shadow-xl" />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-20 opacity-30 text-center animate-pulse">
                  <div className="space-y-6">
                    <div className="w-32 h-32 bg-secondary rounded-[2.5rem] flex items-center justify-center mx-auto border-4 border-dashed border-border/50 rotate-12 transition-transform hover:rotate-0"><Search className="w-12 h-12" /></div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black uppercase tracking-widest">Select Enterprise Entity</h3>
                       <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Awaiting company selection for access configuration</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── GLOBAL PLAN TIERS VIEW ────────────────────────────────────── */}
        <TabsContent value="tiers" className="m-0 p-0 outline-none ring-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2 animate-in slide-in-from-bottom-6 duration-700">
            {PLANS.map(p => (
              <Card key={p.id} className="rounded-3xl border-border/40 shadow-xl bg-background border overflow-hidden">
                <CardHeader className="p-6 border-b border-border/10 bg-secondary/5">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md", p.color)}>
                         <Zap className="w-5 h-5" />
                       </div>
                       <div>
                         <CardTitle className="text-lg font-bold">{p.name} Tier</CardTitle>
                         <CardDescription className="text-xs text-muted-foreground">Global defaults definition</CardDescription>
                       </div>
                     </div>
                     <Badge variant="outline" className="h-7 px-3 rounded-md font-semibold text-[10px] border-primary/20 text-primary">Defaults</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold opacity-70 ml-1">Default Max Users</Label>
                        <Input type="number" value={globalTiers[p.id].maxUsers} onChange={e => setGlobalTiers(prev => ({ ...prev, [p.id]: { ...prev[p.id], maxUsers: e.target.value } }))} className="h-10 rounded-lg bg-secondary/5 border-border/20 px-4 font-medium text-sm focus:ring-2 focus:ring-primary/20 shadow-inner" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold opacity-70 ml-1">Default Max Projects</Label>
                        <Input type="number" value={globalTiers[p.id].maxProjects} onChange={e => setGlobalTiers(prev => ({ ...prev, [p.id]: { ...prev[p.id], maxProjects: e.target.value } }))} className="h-10 rounded-lg bg-secondary/5 border-border/20 px-4 font-medium text-sm focus:ring-2 focus:ring-primary/20 shadow-inner" />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                        <h4 className="text-xs font-semibold text-primary whitespace-nowrap bg-primary/5 px-4 py-1 rounded-full border border-primary/10">Default Permissions</h4>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {FEATURES.map(f => {
                          const isEnabled = globalTiers[p.id].features[f.key] !== false;
                          return (
                            <div key={f.key} onClick={() => toggleGlobalFeature(p.id, f.key)} className={cn("p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between", isEnabled ? "border-primary/20 bg-background shadow-sm" : "border-border/10 opacity-40 grayscale")}>
                               <div className="flex items-center gap-3">
                                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", isEnabled ? "bg-primary/10 text-primary" : "bg-muted")}>
                                     <f.icon className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-xs font-medium">{f.label}</span>
                               </div>
                               <div className={cn("w-7 h-4 rounded-full flex items-center transition-all px-0.5", isEnabled ? "bg-[#48A111] justify-end shadow-inner" : "bg-muted")}>
                                  <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                               </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 mb-20 max-w-md mx-auto">
             <Button 
               onClick={handleUpdateGlobalTiers} 
               disabled={savingTiers} 
               className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm shadow-md hover:bg-primary/90 transition-all"
             >
                {savingTiers ? 'Synchronizing Tiers...' : 'Save Tier Settings'}
             </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlansAndLimits;
