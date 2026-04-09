import { useEffect, useState } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, History, Lock, Shield, User, Database, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Sub-components (Reused from superadmin audit components)
import AuditFilters from '@/superadmin/components/audit/AuditFilters';
import AuditTable from '@/superadmin/components/audit/AuditTable';
import AuditCards from '@/superadmin/components/audit/AuditCards';

const ActivityLog = () => {
  const { setHeader, searchTerm: globalSearch } = useHeaderStore();
  const { toast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotal] = useState(1);

  useEffect(() => {
    setHeader('Activity Logs', 'Track all administrative actions and changes within your organization', {
      showSearch: true,
      searchPlaceholder: 'Search by action or user...'
    });
  }, [setHeader]);

  useEffect(() => {
    setPage(1);
  }, [action, globalSearch]);

  useEffect(() => {
    fetchLogs();
  }, [page, action, globalSearch]);

  // ── API calls ─────────────────────────────────────────────────────────

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations/activity-logs', {
        params: {
          page, 
          limit: 10,
          action: action || undefined,
          search: globalSearch || undefined,
        },
      });
      const data = res.data;
      setLogs(data.data || []);
      setTotal(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast({ title: 'Could not load activity logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/organizations/activity-logs', {
        params: {
          action: action || undefined,
          search: globalSearch || undefined,
          limit: 1000 
        },
      });

      const exportData = res.data.data || [];
      if (exportData.length === 0) {
        toast({ title: 'No logs found to export', variant: 'destructive' });
        return;
      }

      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Context', 'Details'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(log => [
          new Date(log.createdAt).toLocaleString(),
          log.user?.name || 'System',
          log.user?.role || 'N/A',
          log.action,
          log.entity,
          log.project?.name || 'Platform',
          JSON.stringify(log.details || {}).replace(/,/g, ';')
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity-log-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Activity log exported successfully' });
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
    if (actionLower.includes('message')) return <History className="w-4 h-4 text-teal-500" />;
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

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
          
          <div className="bg-secondary/10 p-2 rounded-2xl mb-8 border border-border/5 shadow-inner mt-4">
            <AuditFilters
              action={action}
              setAction={setAction}
              setPage={setPage}
              onExport={handleExportCSV}
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-primary/10">
            {loading ? (
              <div className="h-96 rounded-2xl bg-muted/5 border border-dashed border-border/20 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Activity className="w-12 h-12 text-primary animate-pulse" />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
                </div>
                <p className="font-bold tracking-widest text-xs uppercase opacity-40 Montserrat animate-pulse">Syncing Audit Trail...</p>
              </div>
            ) : logs.length === 0 ? (
              <Card className="p-32 text-center rounded-3xl border-dashed border-2 border-border/10 bg-muted/5">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-20 h-20 bg-primary/5 rounded-3xl mx-auto flex items-center justify-center border border-primary/10">
                    <History className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground/70 uppercase tracking-widest Montserrat">No Activity Yet</h3>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed font-medium">Log search returned no results. Try adjusting your filters.</p>
                </div>
              </Card>
            ) : (
              <>
                <AuditTable
                  logs={logs}
                  getActionIcon={getActionIcon}
                  getStatusBadge={getStatusBadge}
                  getSeverity={getSeverity}
                  showOrganization={false}
                />
                <AuditCards 
                  logs={logs} 
                  getActionIcon={getActionIcon} 
                  getStatusBadge={getStatusBadge} 
                  getSeverity={getSeverity} 
                  showOrganization={false}
                />
              </>
            )}
          </div>

          {/* Pagination Footer */}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4 py-4 border-t border-border/10 bg-card/50 backdrop-blur-md rounded-b-2xl mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 Montserrat">
                Showing {Math.min(logs.length, 10)} Events • Page {page} of {totalPages}
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

export default ActivityLog;
