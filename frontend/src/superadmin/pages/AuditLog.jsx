import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, History, Lock, Shield, User, Database, Building2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Sub-components
import AuditFilters from '@/superadmin/components/audit/AuditFilters';
import AuditTable from '@/superadmin/components/audit/AuditTable';
import AuditCards from '@/superadmin/components/audit/AuditCards';

const AuditLog = () => {
  const { setHeader, setSearchTerm, searchTerm: globalSearch } = useHeaderStore();
  const { toast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotal] = useState(1);
  const [orgs, setOrgs] = useState([]);
  // 'ALL' means global audit logs (no organizationId filter)
  // '' means "pick an organization" screen
  const [selectedOrgId, setSelectedOrgId] = useState('ALL');

  useEffect(() => {
    setHeader('Activity Log', 'Track all admin actions and changes across the platform', {
      showSearch: true,
      searchPlaceholder: 'Search by action, user, or date...'
    });
    // Avoid stale searchTerm from other pages hiding logs.
    setSearchTerm('');
    fetchOrgs();
  }, [setHeader, setSearchTerm]);

  useEffect(() => {
    setPage(1);
  }, [action, globalSearch, selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchLogs();
    }
  }, [page, action, selectedOrgId, globalSearch]);

  // ── API calls ─────────────────────────────────────────────────────────

  const fetchOrgs = async () => {
    try {
      const res = await api.get('/superadmin/orgs');
      setOrgs(res.data || []);
    } catch {
      toast({ title: 'Could not load organizations', variant: 'destructive' });
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/audit', {
        params: {
          page, limit: 10,
          action: action || undefined,
          search: globalSearch || undefined,
          organizationId: selectedOrgId && selectedOrgId !== 'ALL' ? selectedOrgId : undefined
        },
      });
      const data = res.data;
      setLogs(data.data || data || []);
      setTotal(Math.min(data.pagination?.totalPages || 1, 50));
    } catch {
      toast({ title: 'Could not load activity logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOrgFilter = (orgId) => { setSelectedOrgId(orgId); setPage(1); };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/superadmin/audit', {
        params: {
          action: action || undefined,
          search: globalSearch || undefined,
          organizationId: selectedOrgId && selectedOrgId !== 'ALL' ? selectedOrgId : undefined,
          limit: 1000 // Fetch a larger set for export
        },
      });

      const exportData = res.data.data || res.data || [];
      if (exportData.length === 0) {
        toast({ title: 'No logs found to export', variant: 'destructive' });
        return;
      }

      const headers = ['Timestamp', 'User', 'Role', 'Organization', 'Action', 'Entity', 'Details'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(log => [
          `"${new Date(log.createdAt).toLocaleString()}"`,
          `"${log.user?.name || 'System'}"`,
          `"${log.user?.role || 'N/A'}"`,
          `"${log.organization?.name || 'Global'}"`,
          `"${log.action}"`,
          `"${log.entity}"`,
          `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Audit log exported successfully' });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const getActionIcon = (act) => {
    if (!act) return <Activity className="w-4 h-4 text-primary/60" />;
    const actionLower = act.toLowerCase();
    if (actionLower.includes('suspend') || actionLower.includes('delete')) return <Lock className="w-4 h-4 text-red-500" />;
    if (actionLower.includes('upgrade') || actionLower.includes('plan')) return <Shield className="w-4 h-4 text-blue-500" />;
    if (actionLower.includes('user') || actionLower.includes('invite') || actionLower.includes('member')) return <User className="w-4 h-4 text-emerald-500" />;
    if (actionLower.includes('database') || actionLower.includes('backup') || actionLower.includes('time')) return <Database className="w-4 h-4 text-purple-500" />;
    return <Activity className="w-4 h-4 text-primary/60" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CRITICAL': return <Badge variant="destructive" className="text-xs font-semibold rounded-lg shadow-sm shadow-red-500/20">Critical</Badge>;
      case 'WARNING': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-xs font-semibold rounded-lg shadow-sm">Warning</Badge>;
      case 'INFO': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs font-semibold rounded-lg shadow-sm">Info</Badge>;
      case 'SUCCESS': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs font-semibold rounded-lg shadow-sm">Success</Badge>;
      default: return <Badge variant="secondary" className="text-xs font-semibold rounded-lg">{status || 'Info'}</Badge>;
    }
  };

  const getSeverity = (act) => {
    if (!act) return 'INFO';
    const actUpper = act.toUpperCase();
    if (actUpper.includes('DELETE') || actUpper.includes('SUSPEND') || actUpper.includes('REMOVED')) return 'CRITICAL';
    if (actUpper.includes('SECURITY') || actUpper.includes('RESET') || actUpper.includes('WARNING')) return 'WARNING';
    if (actUpper.includes('BACKUP') || actUpper.includes('CREATED') || actUpper.includes('ADDED') || actUpper === 'SUCCESS' || actUpper.includes('LOGGED')) return 'SUCCESS';
    return 'INFO';
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (selectedOrgId === '') {
    return (
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
          <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
            <div className="flex flex-col mb-8 p-1 mt-4">
              <h2 className="text-2xl font-bold mb-1 tracking-widest uppercase">Select Organization</h2>
              <p className="text-muted-foreground text-xs font-medium">Choose an organization to view its activity log.</p>
            </div>

            {orgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-xl">
                <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">No organizations found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                <Card
                  key="__all_orgs__"
                  className="p-6 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col gap-4"
                  onClick={() => { setSelectedOrgId('ALL'); setPage(1); }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">All Organizations</h3>
                    <p className="text-[10px] font-bold opacity-50">Global</p>
                  </div>
                </Card>

                {orgs.map((org) => (
                  <Card
                    key={org.id}
                    className="p-6 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col gap-4"
                    onClick={() => { setSelectedOrgId(org.id); setPage(1); }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight mb-1">{org.name}</h3>
                      <p className="text-[10px] font-bold opacity-50">{org.status || 'Active'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex-none px-0 sm:px-0">
        <div className="bg-secondary/40 p-2 rounded-2xl mb-2 shadow-inner backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
          <AuditFilters
            action={action}
            setAction={setAction}
            setPage={setPage}
            onExport={handleExportCSV}
          />
        </div>
      </div>
      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 sm:mb-10 mt-4 sm:mt-6 px-1">
            <Button
              variant="ghost"
              onClick={() => { setSelectedOrgId(''); setPage(1); setLogs([]); }}
              className="h-10 rounded-xl px-4 sm:px-5 font-black text-[9px] sm:text-[10px] tracking-widest uppercase border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-2 sm:gap-3 group shadow-xl shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              CHANGE ORG
            </Button>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-0 sm:ml-4 min-w-0 flex-1">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#48A111] shrink-0" />
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground dark:text-white Montserrat truncate">
                {selectedOrgId === 'ALL'
                  ? 'All Organizations'
                  : orgs.find(o => o.id === selectedOrgId)?.name}
              </h1>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-primary/10">
            {loading ? (
              <div className="h-96 rounded-2xl bg-muted/5 border border-dashed border-border/20 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Activity className="w-12 h-12 text-primary animate-pulse" />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
                </div>
                <p className="font-bold tracking-widest text-xs uppercase opacity-40 Montserrat animate-pulse">Synchronizing Activity...</p>
              </div>
            ) : logs.length === 0 ? (
              <Card className="p-32 text-center rounded-3xl border-dashed border-2 border-border/10 bg-muted/5">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-20 h-20 bg-primary/5 rounded-3xl mx-auto flex items-center justify-center border border-primary/10">
                    <History className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground/70 uppercase tracking-widest Montserrat">No Events Found</h3>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed font-medium">We couldn't find any activity logs matching your current filters.</p>
                </div>
              </Card>
            ) : (
              <>
                <AuditTable
                  logs={logs}
                  getActionIcon={getActionIcon}
                  getStatusBadge={getStatusBadge}
                  getSeverity={getSeverity}
                  onOrgFilter={handleOrgFilter}
                />
                <AuditCards logs={logs} getActionIcon={getActionIcon} getStatusBadge={getStatusBadge} getSeverity={getSeverity} />
              </>
            )}
          </div>

          {/* Persistent Pagination Footer */}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4 py-4 border-t border-border/10 bg-card/50 backdrop-blur-md rounded-b-2xl mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 Montserrat">
                Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, (page - 1) * 10 + logs.length)} of {totalPages * 10}+ Events
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="h-10 rounded-lg px-6 border border-border/10 font-bold text-[10px] tracking-widest uppercase hover:bg-primary/5 transition-all Montserrat"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Prev
                </Button>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded-lg border border-border/10">
                  <span className="text-[10px] font-black Montserrat">PAGE</span>
                  <span className="text-xs font-black text-primary Montserrat">{page}</span>
                  <span className="text-[10px] font-black text-muted-foreground Montserrat">/</span>
                  <span className="text-[10px] font-black text-muted-foreground Montserrat">{totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  className="h-10 rounded-lg px-6 shadow-sm font-bold text-[10px] tracking-widest uppercase transition-all hover:bg-primary hover:text-white Montserrat"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                  <ArrowLeft className="w-3 h-3 ml-2 rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
