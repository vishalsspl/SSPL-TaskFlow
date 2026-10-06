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
  Plus,
  UsersRound,
  Settings,
  Server,
  Database,
  Cpu,
  RefreshCw
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

  const getPlanColor = (plan) => {
    switch (plan?.toUpperCase()) {
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'PRO': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'FREE':
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-[#48A111]/10 text-[#48A111] border-[#48A111]/30';
      case 'TRIAL': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'SUSPENDED': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const isLoading = loading || !stats;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 min-h-full animate-in fade-in duration-500">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-border/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#48A111]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">Good morning, Superadmin!</h1>
          <p className="text-slate-500 dark:text-muted-foreground mt-1">{currentDate} • Your platform is running smoothly.</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <Button onClick={() => navigate('/superadmin/orgs/new')} className="bg-[#48A111] hover:bg-[#3d8c0e] text-white shadow-md hover:shadow-lg transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
          <Button variant="outline" size="icon" onClick={fetchData} className="border-slate-200 dark:border-border/40 text-slate-600 dark:text-muted-foreground hover:text-[#48A111] hover:border-[#48A111]/30 hover:bg-[#48A111]/5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-border/40 hover:border-[#48A111]/50 group" onClick={() => navigate('/superadmin/orgs')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#48A111]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="h-5 w-5 text-[#48A111]" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-foreground">Manage Organizations</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">View and edit org details</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-border/40 hover:border-blue-500/50 group" onClick={() => navigate('/superadmin/users')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UsersRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-foreground">Global Users</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">Monitor user activity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-border/40 hover:border-purple-500/50 group" onClick={() => navigate('/superadmin/settings')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-foreground">Platform Settings</p>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">Configure global limits</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Organizations"
          value={stats?.totalOrgs || 0}
          subtitle={<span className="text-[#48A111] flex items-center text-xs mt-1"><ArrowUpRight className="h-3 w-3 mr-1"/> {stats?.activeOrgs || 0} Active</span>}
          icon={Building2}
          loading={isLoading}
          gradient="from-[#48A111]/20 to-transparent"
          iconColor="text-[#48A111]"
          iconBg="bg-[#48A111]/10"
        />
        <MetricCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          subtitle={<span className="text-slate-500 text-xs mt-1">Across all organizations</span>}
          icon={Users}
          loading={isLoading}
          gradient="from-blue-500/20 to-transparent"
          iconColor="text-blue-500"
          iconBg="bg-blue-100"
        />
        <MetricCard
          title="Suspended"
          value={stats?.suspendedOrgs || 0}
          subtitle={<span className="text-red-500 flex items-center text-xs mt-1"><ArrowDownRight className="h-3 w-3 mr-1"/> Needs attention</span>}
          icon={ShieldAlert}
          loading={isLoading}
          gradient="from-red-500/20 to-transparent"
          iconColor="text-red-500"
          iconBg="bg-red-100"
        />
        <MetricCard
          title="Uptime"
          value="99.9%"
          subtitle={<span className="text-[#48A111] flex items-center text-xs mt-1">All systems normal</span>}
          icon={Activity}
          loading={isLoading}
          gradient="from-emerald-500/20 to-transparent"
          iconColor="text-emerald-500"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Two Column Layout for the rest */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Recent Organizations Section */}
        <Card className="lg:col-span-8 shadow-sm border-slate-200 dark:border-border/40 overflow-hidden flex flex-col">
          <CardHeader className="bg-white dark:bg-card border-b border-slate-100 dark:border-border/20 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-slate-800 dark:text-foreground">Recent Organizations</CardTitle>
                <CardDescription>Latest organizations added to the platform</CardDescription>
              </div>
              <Button variant="ghost" className="text-[#48A111] hover:bg-[#48A111]/10 hover:text-[#48A111]" onClick={() => navigate('/superadmin/orgs')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-muted-foreground">Loading organizations...</div>
            ) : recentOrgs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-muted-foreground">No organizations found.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-border/20">
                {recentOrgs.map((org, i) => (
                  <div key={org.id || i} className="p-4 hover:bg-slate-50 dark:hover:bg-secondary/20 transition-colors flex items-center justify-between group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#48A111] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-secondary/40 border border-slate-200 dark:border-border/40 flex items-center justify-center text-slate-400 dark:text-muted-foreground group-hover:bg-[#48A111]/5 group-hover:text-[#48A111] transition-colors">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-foreground">{org.name}</p>
                        <div className="flex items-center text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                          <Globe className="h-3 w-3 mr-1" />
                          {org.industry || 'General'} · {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`font-medium shadow-sm ${getPlanColor(org.plan)}`}>
                        {org.plan || 'FREE'}
                      </Badge>
                      <Badge variant="outline" className={`font-medium shadow-sm ${getStatusColor(org.status)}`}>
                        {org.status || 'ACTIVE'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status Section */}
        <Card className="lg:col-span-4 shadow-sm border-slate-200 dark:border-border/40 overflow-hidden">
          <CardHeader className="bg-white dark:bg-card border-b border-slate-100 dark:border-border/20 pb-4">
            <CardTitle className="text-lg text-slate-800 dark:text-foreground">System Status</CardTitle>
            <CardDescription>Platform services health</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <StatusRow name="API Gateway" status="Operational" icon={Server} ping="12ms" />
            <StatusRow name="Database Cluster" status="Operational" icon={Database} ping="45ms" />
            <StatusRow name="Storage Service" status="Operational" icon={Database} ping="18ms" />
            <StatusRow name="Background Workers" status="High Load" icon={Cpu} ping="85ms" warning />
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon, loading, gradient, iconColor, iconBg }) => (
  <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 border-slate-200 dark:border-border/40 hover:border-slate-300 dark:hover:border-border/60">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            {loading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-muted animate-pulse rounded" />
            ) : (
              <h3 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-foreground">{value}</h3>
            )}
          </div>
          <div>{subtitle}</div>
        </div>
        <div className={`p-3 rounded-xl shadow-sm ${iconBg} dark:bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusRow = ({ name, status, icon: Icon, ping, warning }) => (
  <div className="bg-white dark:bg-card p-3 rounded-xl border border-slate-200 dark:border-border/40 shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${warning ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-foreground">{name}</p>
        <p className={`text-xs ${warning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{status}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 dark:text-muted-foreground font-mono">{ping}</span>
      <span className="relative flex h-2.5 w-2.5">
        {!warning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${warning ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
      </span>
    </div>
  </div>
);

export default SuperAdminDashboard;