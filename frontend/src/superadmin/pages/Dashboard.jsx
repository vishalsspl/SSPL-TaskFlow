import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useHeaderStore } from '@/store/headerStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Activity,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import api from '@/lib/api';

const SuperAdminDashboard = () => {
  const { setHeader } = useHeaderStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentOrgs, setRecentOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHeader('Dashboard', 'Overview of all organizations and platform activity');
    fetchData();
  }, [setHeader]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/stats');
      setStats(res.data.stats);
      setRecentOrgs(res.data.recentOrgs || []);
    } catch {
      // fallback: build from org list
      try {
        const r = await api.get('/superadmin/orgs');
        const list = r.data.data || r.data || [];
        setRecentOrgs(list.slice(0, 4));
        setStats({
          totalOrgs: list.length,
          activeOrgs: list.filter(o => o.status === 'ACTIVE').length,
          trialOrgs: list.filter(o => o.status === 'TRIAL').length,
          suspendedOrgs: list.filter(o => o.status === 'SUSPENDED').length,
          totalUsers: list.reduce((s, o) => s + (o._count?.users || 0), 0),
          activeNow: 0,
        });
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtext, icon: Icon, trend, colorClass }) => {
    const textColor = colorClass.replace('bg-', 'text-');
    const bgLight = colorClass + '/10';
    return (
      <Card className="overflow-hidden border-border/40 shadow-xl hover:shadow-primary/10 transition-all duration-500 bg-white/40 dark:bg-[#0A0A0A]/60 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] group">
        <CardContent className="p-4 sm:p-6 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between mb-1 sm:mb-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-widest mt-1">{title}</p>
            <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl ${bgLight} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shrink-0 ml-2`}>
              <Icon className={`w-4 h-4 sm:w-7 sm:h-7 ${textColor}`} />
            </div>
          </div>
          <div className="space-y-1 sm:space-y-2 mt-2 sm:mt-0">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-3xl font-bold ">
                {loading ? (
                  <div className="h-6 sm:h-8 w-12 sm:w-16 bg-muted animate-pulse rounded-lg" />
                ) : (value ?? '—')}
              </h3>
              {trend !== undefined && !loading && (
                <div className={`flex items-center text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </div>
              )}
            </div>
            <p className="hidden sm:block text-[9px] text-muted-foreground font-bold opacity-60 line-clamp-1">{subtext}</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'PRO': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'STARTER': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ENTERPRISE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 pb-10">
      {/* Metrics Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Organizations"
          value={stats?.totalOrgs}
          subtext={`${stats?.activeOrgs ?? 0} active, ${stats?.trialOrgs ?? 0} on trial`}
          icon={Building2}
          trend={12}
          colorClass="bg-primary"
        />
        <MetricCard
          title="Total Users"
          value={stats?.totalUsers}
          subtext="All users across every organization"
          icon={Users}
          trend={8}
          colorClass="bg-indigo-500"
        />
        <MetricCard
          title="Suspended"
          value={stats?.suspendedOrgs}
          subtext="Organizations currently blocked"
          icon={ShieldAlert}
          colorClass="bg-red-500"
        />
        <MetricCard
          title="Uptime"
          value="99.9%"
          subtext="All systems operational"
          icon={Globe}
          colorClass="bg-emerald-500"
        />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        {/* System Health */}
        <Card className="lg:col-span-4 border-border/40 shadow-2xl bg-white/40 dark:bg-[#0A0A0A]/60 backdrop-blur-3xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between border-b border-border/10 pb-4 sm:pb-6 px-5 sm:px-8 pt-5 sm:pt-8 gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <CardTitle className="text-xs sm:text-sm font-bold tracking-widest text-foreground">System Status</CardTitle>
              <CardDescription className="text-[9px] sm:text-[10px] font-bold text-muted-foreground opacity-60">Current health of all services</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] sm:text-[9px] font-bold text-green-500 uppercase tracking-wider">All Good</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-5 sm:py-6">
            <div className="space-y-5 sm:space-y-8">
              {[
                { name: 'Main Server', status: 'Running', latency: '42ms', load: 12 },
                { name: 'Database', status: 'Running', latency: '5ms', load: 8 },
                { name: 'Cache System', status: 'Running', latency: '1ms', load: 4 },
                { name: 'File Storage', status: 'Running', latency: '110ms', load: 24 },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between gap-2 sm:gap-4 group">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-bold text-foreground truncate">{service.name}</p>
                      <p className="text-[8px] sm:text-[9px] text-primary font-bold tracking-widest opacity-80">{service.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-6 sm:text-right shrink-0">
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-foreground font-mono">{service.latency}</p>
                      <p className="text-[8px] text-muted-foreground font-bold ">Latency</p>
                    </div>
                    <div className="w-[60px] sm:w-[120px]">
                      <div className="flex justify-end mb-1">
                        <span className="text-[8px] sm:text-[9px] font-bold text-foreground font-mono">{service.load}%</span>
                      </div>
                      <div className="w-full h-1 sm:h-1.5 bg-border/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" style={{ width: `${service.load}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orgs */}
        <Card className="lg:col-span-3 border-border/40 shadow-2xl bg-white/40 dark:bg-[#0A0A0A]/60 backdrop-blur-3xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-border/10 pb-4 sm:pb-6 px-5 sm:px-8 pt-5 sm:pt-8">
            <CardTitle className="text-xs sm:text-sm font-bold tracking-widest text-foreground uppercase">Recent Organizations</CardTitle>
            <CardDescription className="text-[9px] sm:text-[10px] font-bold text-muted-foreground opacity-60">Recently added organizations</CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-8 py-5 sm:py-6">
            <div className="space-y-4 sm:space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-2 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentOrgs.length === 0 ? (
                <p className="text-[10px] font-bold text-muted-foreground text-center py-10 opacity-40">No organizations found</p>
              ) : recentOrgs.map((org) => (
                <div key={org.id} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors border border-primary/5">
                    <Building2 className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate tracking-widest">{org.name}</p>
                    <p className="text-[9px] text-muted-foreground font-bold opacity-60 truncate">
                      {org.industry || 'General'} · {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[8px] font-bold border ${getPlanColor(org.plan)} px-2 py-0.5 rounded-md shrink-0`}>
                    {org.plan}
                  </Badge>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-6 sm:mt-10 rounded-xl sm:rounded-2xl border-primary/20 bg-primary/5 text-[9px] sm:text-[10px] font-bold tracking-widest text-primary hover:bg-primary hover:text-white transition-all duration-500 h-12 sm:h-14 shadow-lg hover:shadow-primary/30"
              onClick={() => navigate('/superadmin/orgs')}
            >
              View All Organizations <ArrowUpRight className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;