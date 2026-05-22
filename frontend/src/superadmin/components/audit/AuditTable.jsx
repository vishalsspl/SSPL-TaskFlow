import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

const formatAction = (action) => {
  if (!action) return '-';
  if (action === 'LOGIN_CLOCK_IN') return 'User Login';
  if (action === 'LOGOUT_CLOCK_OUT') return 'User Logout';
  return action.toLowerCase().replace(/_/g, ' ');
};

const formatDetails = (details) => {
  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) return <span className="text-muted-foreground/50 italic">-</span>;
  
  if (typeof details === 'object') {
    return (
      <div className="flex flex-col gap-1.5">
        {Object.entries(details).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
            <span className="text-xs font-semibold text-foreground/90 break-words leading-tight">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-xs font-medium">{String(details)}</span>;
};

const AuditTable = ({ logs, getActionIcon, getStatusBadge, getSeverity, showOrganization = true }) => {
  const getSeverityStyle = (action) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('SUSPEND') || act.includes('REMOVE')) return 'border-red-500 bg-red-500/10';
    if (act.includes('CREATE') || act.includes('ADD')) return 'border-purple-500 bg-purple-500/10';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'border-blue-500 bg-blue-500/10';
    if (act.includes('LOG') || act.includes('TIME')) return 'border-teal-500 bg-teal-500/10';
    if (act.includes('APPROVE') || act.includes('INVITE') || act.includes('ACTIVATE')) return 'border-emerald-500 bg-emerald-500/10';
    return 'border-primary/20 bg-primary/5';
  };

  const getBorderColor = (action) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('SUSPEND')) return '#ef4444'; // red-500
    if (act.includes('CREATE')) return '#a855f7'; // purple-500
    if (act.includes('UPDATE')) return '#3b82f6'; // blue-500
    if (act.includes('LOG') || act.includes('TIME')) return '#14b8a6'; // teal-500
    if (act.includes('APPROVE')) return '#10b981'; // emerald-500
    return '#64748b'; // slate-500
  };

  return (
    <div className="hidden lg:block rounded-2xl border border-border/10 overflow-hidden bg-background/20 backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-secondary/10">
          <TableRow className="hover:bg-transparent border-border/10">
            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Action</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Done By</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">
              {showOrganization ? 'Organization' : 'Project'}
            </TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Date & Time</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left hidden xl:table-cell">Details</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const borderColor = getBorderColor(log.action);
            return (
              <TableRow key={log.id} className="group hover:bg-white/[0.02] border-border/5 h-20 transition-all">
                {/* Action Column with Vertical Bar */}
                <TableCell className="relative">
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5" 
                    style={{ backgroundColor: borderColor }}
                  />
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0" style={{ backgroundColor: `${borderColor}20` }}>
                      <div style={{ color: borderColor }}>
                        {getActionIcon(log.action)}
                      </div>
                    </div>
                    <div className="text-left w-[120px]">
                      <div className="text-sm font-bold tracking-tight text-foreground/90 capitalize truncate">
                        {formatAction(log.action)}
                      </div>
                      <div className="text-[10px] font-medium text-muted-foreground/60 mt-0.5 truncate">
                        {log.entity} {log.entityId ? `#${log.entityId.slice(-6)}` : ''}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Done By Column */}
                <TableCell>
                  <div className="flex items-center justify-center gap-3">
                    <Avatar className="w-10 h-10 rounded-full border-2 border-border/10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shrink-0">
                      <AvatarImage src={log.user?.avatar} />
                      <AvatarFallback className="bg-secondary/50 text-xs font-bold text-primary">
                        {log.user?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left w-[100px]">
                      <div className="text-sm font-bold tracking-tight text-foreground/80 truncate">
                        {log.user?.name || 'System'}
                      </div>
                      <div className="text-[10px] font-medium text-muted-foreground/50 capitalize mt-0.5 truncate">
                        {log.user?.role?.toLowerCase() || 'N/A'}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Organization or Project Column */}
                <TableCell>
                  <div className="text-center flex flex-col items-center">
                    <div className="text-sm font-bold tracking-tight text-foreground/80 truncate max-w-[150px]">
                      {showOrganization 
                        ? (log.organization?.name || 'Global')
                        : (log.project?.name || 'Platform')
                      }
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground/50 mt-0.5 truncate max-w-[150px]">
                      {showOrganization 
                        ? (log.project ? `Project: ${log.project.name}` : (log.organization?.industry || 'Platform Action'))
                        : (log.entity === 'project' ? 'Project Action' : (log.project ? 'Activity Detail' : 'Platform Action'))
                      }
                    </div>
                  </div>
                </TableCell>

                {/* Date & Time Column */}
                <TableCell className="text-center">
                  <div className="text-xs font-semibold text-muted-foreground/80">
                    {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy h:mm a') : '-'}
                  </div>
                </TableCell>

                {/* Details Column */}
                <TableCell className="text-left max-w-[300px] hidden xl:table-cell align-top py-3">
                  <div className="max-h-24 overflow-y-auto custom-scrollbar bg-secondary/5 p-3 rounded-xl border border-border/10 shadow-inner">
                    {formatDetails(log.details)}
                  </div>
                </TableCell>

                {/* Status Column */}
                <TableCell className="text-center">
                  {getStatusBadge(getSeverity(log.action))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default AuditTable;
