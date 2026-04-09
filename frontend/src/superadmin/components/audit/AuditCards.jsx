import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const safeJson = (v) => {
  try {
    if (!v) return '';
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const AuditCards = ({ logs, getActionIcon, getStatusBadge, getSeverity, showOrganization = true }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:hidden">
      {logs.map((log) => {
        const severity = getSeverity(log.action);
        return (
          <Card key={log.id} className="p-5 rounded-2xl border-border/10 bg-background/40 hover:bg-primary/[0.02] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{getActionIcon(log.action)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{log.action}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                  </div>
                </div>
              </div>
              {getStatusBadge(severity)}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">User</span>
                <span className="text-xs font-semibold truncate">{log.user?.name || 'System'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {showOrganization ? 'Org' : 'Project'}
                </span>
                <span className="text-xs font-semibold truncate">
                  {showOrganization 
                    ? (log.organization?.name || 'Global')
                    : (log.project?.name || 'Platform')
                  }
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Entity</span>
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">
                  {log.entity || 'N/A'}
                </Badge>
              </div>
              <div className="pt-2 border-t border-border/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Details</div>
                <div className="text-[10px] text-muted-foreground font-mono bg-secondary/10 p-2 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap break-all custom-scrollbar">
                  {safeJson(log.details)}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default AuditCards;

