import { Card } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const AuditCards = ({ logs, getActionIcon, getStatusBadge, getSeverity }) => {
 return (
  <div className="sm:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
 {logs.map((log, i) => (
 <Card key={log.id || i} className="rounded-xl border-border/40 shadow-xl bg-white/50 dark:bg-black/40 backdrop-blur-xl p-6 relative overflow-hidden group">
 <div className="flex justify-between items-start mb-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shadow-inner">
 {getActionIcon(log.action)}
 </div>
 <div className="min-w-0">
 <h4 className="font-semibold text-sm truncate pr-4">{log.action?.replace(/_/g, ' ')}</h4>
 <p className="text-xs font-medium text-muted-foreground/60">{log.entity || 'System'}</p>
 </div>
 </div>
 {getStatusBadge(getSeverity(log.action))}
 </div>

 <div className="space-y-4 pt-6 mt-6 border-t border-border/10">
 <div className="flex items-center justify-between text-sm">
 <span className="font-medium text-muted-foreground opacity-50">Done By</span>
 <span className="font-bold ">{log.user?.name || 'System'}</span>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="font-medium text-muted-foreground opacity-50">Organization</span>
 <span className="font-bold flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {log.organization?.name || 'Platform'}</span>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="font-medium text-muted-foreground opacity-50">Date & Time</span>
 <span className="font-mono text-xs opacity-60">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A'}</span>
 </div>
 </div>
 </Card>
 ))}
 </div>
 );
};

export default AuditCards;
