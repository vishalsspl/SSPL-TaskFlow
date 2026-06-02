import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const formatAction = (action) => {
  if (!action) return '-';
  if (action === 'LOGIN_CLOCK_IN') return 'User Login';
  if (action === 'LOGOUT_CLOCK_OUT') return 'User Logout';
  return action.toLowerCase().replace(/_/g, ' ');
};

const formatValue = (val) => {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.length ? val.join(', ') : 'None';
  if (typeof val === 'object') {
    return (
      <div className="mt-1 pl-2 border-l-2 border-primary/20 space-y-1">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="text-[11px] leading-tight">
            <span className="font-bold text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}: </span>
            <span className="text-foreground/90">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (String(val) === 'automatic_login') return 'Login';
  return String(val);
};

const formatDetails = (details) => {
  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) return <span className="text-muted-foreground/50 italic">-</span>;
  
  if (typeof details === 'object') {
    return (
      <div className="flex flex-col gap-1.5">
        {Object.entries(details).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
            <div className="text-xs font-semibold text-foreground/90 break-words leading-tight">
              {formatValue(val)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-xs font-medium">{String(details)}</span>;
};

const AuditCards = ({ logs, getActionIcon, getStatusBadge, getSeverity, showOrganization = true }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:hidden">
      {logs.map((log) => {
        const severity = getSeverity(log.action);
        return (
          <Card key={log.id} className="p-4 rounded-2xl border-border/10 bg-background/40 hover:bg-primary/[0.02] transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{getActionIcon(log.action)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-bold capitalize truncate">{formatAction(log.action)}</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                  </div>
                </div>
              </div>
              {getStatusBadge(severity)}
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">User</span>
                <span className="text-[11px] font-semibold truncate">{log.user?.name || 'System'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {showOrganization ? 'Org' : 'Project'}
                </span>
                <span className="text-[11px] font-semibold truncate">
                  {showOrganization 
                    ? (log.organization?.name || 'Global')
                    : (log.project?.name || 'Platform')
                  }
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Entity</span>
                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0">
                  {log.entity || 'N/A'}
                </Badge>
              </div>
              <div className="pt-2 border-t border-border/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Details</div>
                <div className="bg-secondary/5 p-3 rounded-xl border border-border/10 shadow-inner max-h-24 overflow-y-auto custom-scrollbar">
                  {formatDetails(log.details)}
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

