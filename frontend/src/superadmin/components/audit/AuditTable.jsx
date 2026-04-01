import { Card } from '@/components/ui/card';
import {
 Table, TableBody, TableCell, TableHead,
 TableHeader, TableRow,
} from '@/components/ui/table';
import { Building2 } from 'lucide-react';
import { format } from 'date-fns';

const AuditTable = ({ logs, getActionIcon, getStatusBadge, getSeverity, onOrgFilter }) => {
  const PROJECT_COLORS = [
    '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#F97316', '#D946EF'
  ];
  return (
     <div className="hidden sm:block overflow-x-auto w-full">
      <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-[11px] font-semibold text-muted-foreground px-4">Action</TableHead>
 <TableHead className="text-[11px] font-semibold text-muted-foreground px-4">Done By</TableHead>
 <TableHead className="text-[11px] font-semibold text-muted-foreground px-4">Organization</TableHead>
 <TableHead className="text-[11px] font-semibold text-muted-foreground px-4">Date & Time</TableHead>
 <TableHead className="text-[11px] font-semibold text-muted-foreground px-4 text-right">Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {logs.map((log, idx) => {
 const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
 return (
 <TableRow key={log.id || idx} className="cursor-pointer transition-all hover:scale-[1.002] border-b border-border/10" style={{ borderLeft: `4px solid ${rowColor}`, background: `${rowColor}0d` }}><TableCell className="px-4 py-3 align-middle">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 {getActionIcon(log.action)}
 </div>
 <div className="flex flex-col">
 <p className="font-semibold text-sm text-foreground capitalize">
 {log.action?.replace(/_/g, ' ').toLowerCase() || 'Operation'}
 </p>
 <p className="text-[11px] text-muted-foreground">
 {log.entity || 'System'} {log.entityId ? `#${log.entityId.slice(0, 6)}` : ''}
 </p>
 </div>
 </div>
 </TableCell>
 <TableCell className="px-4 py-3 align-middle">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
 {log.user?.name?.charAt(0) || 'S'}
 </div>
 <div className="flex flex-col">
 <p className="text-sm font-medium text-foreground">{log.user?.name || 'System'}</p>
 <p className="text-[11px] text-muted-foreground capitalize">{log.user?.role?.toLowerCase() || 'System'}</p>
 </div>
 </div>
 </TableCell>
 <TableCell className="px-4 py-3 align-middle">
 <button
 onClick={() => onOrgFilter(log.organizationId || '')}
 className="flex flex-col items-start hover:bg-muted/50 p-1.5 -ml-1.5 rounded transition-colors group/btn"
 >
 <div className="flex flex-col text-left">
 <span className="text-sm font-medium text-foreground group-hover/btn:text-primary transition-colors">
 {log.organization?.name || 'Platform'}
 </span>
 {log.project && (
 <span className="text-[11px] text-muted-foreground shrink-0 max-w-[200px] truncate">
 Project: {log.project.name}
 </span>
 )}
 </div>
 </button>
 </TableCell>
 <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground whitespace-nowrap">
 {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
 </TableCell>
 <TableCell className="px-4 py-3 align-middle text-right">
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
