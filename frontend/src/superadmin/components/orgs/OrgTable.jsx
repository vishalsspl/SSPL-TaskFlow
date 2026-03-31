import { Card } from '@/components/ui/card';
import {
 Table, TableBody, TableCell, TableHead,
 TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Building2, ShieldAlert, Edit2, Globe, Trash2 } from 'lucide-react';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem,
 DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OrgTable = ({
 orgs,
 getStatusBadge,
 getPlanBadge,
 onEdit,
 onSuspend,
 onApprove,
 onDelete,
}) => {
 const PROJECT_COLORS = [
 '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#F97316', '#D946EF'
 ];
 return (
 <div className="hidden sm:block">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-[300px] text-xs font-medium py-5 px-8">Asset Details</TableHead>
 <TableHead className="text-xs font-medium">Service Tier</TableHead>
 <TableHead className="text-xs font-medium">Live Status</TableHead>
 <TableHead className="text-xs font-medium text-center">Quota (U/P)</TableHead>
 <TableHead className="text-xs font-medium">Registration</TableHead>
 <TableHead className="text-right text-xs font-medium pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {orgs.map((org, idx) => {
 const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
 return (
 <TableRow key={org.id} className="cursor-pointer transition-all hover:scale-[1.002] border-b border-border/10" style={{ borderLeft: `4px solid ${rowColor}`, background: `${rowColor}0d` }}>
 <TableCell className="py-5 px-8">
 <div className="flex items-center gap-4">
 <div
 className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border border-primary/10 shadow-inner group-hover:scale-110 transition-transform duration-500"
 style={{ background: `linear-gradient(135deg, ${org.themeColor || '#15803d'}22, ${org.themeColor || '#15803d'}44)` }}
 >
 <Building2 className="w-6 h-6 text-primary/80" />
 </div>
 <div className="min-w-0">
 <p className="font-semibold text-sm text-foreground break-words">{org.name}</p>
 <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 mt-1">
 <Globe className="w-3 h-3 text-primary" />
 {org.industry || 'General Operations'}
 </p>
 </div>
 </div>
 </TableCell>
 <TableCell>{getPlanBadge(org.plan)}</TableCell>
 <TableCell>{getStatusBadge(org.status)}</TableCell>
 <TableCell className="text-center">
 <div className="flex flex-col items-center">
 <span className="text-xs font-semibold text-foreground">{org._count?.users ?? 0} <span className="text-muted-foreground font-normal">/</span> {org.maxUsers}</span>
 <div className="w-16 h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
 <div className="h-full bg-primary" style={{ width: `${Math.min(((org._count?.users ?? 0) / (org.maxUsers || 1)) * 100, 100)}%` }} />
 </div>
 </div>
 </TableCell>
 <TableCell className="text-muted-foreground text-xs font-bold font-mono">
 {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}
 </TableCell>
 <TableCell className="text-right pr-8">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
 <MoreHorizontal className="h-5 w-5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56 rounded-lg shadow-2xl border-border/40 bg-black/90 backdrop-blur-xl p-2">
 <DropdownMenuLabel className="text-xs font-medium text-primary/60 px-3 py-2">
 Administrative Tools
 </DropdownMenuLabel>
 <DropdownMenuSeparator className="bg-primary/10" />
 {org.status === 'PENDING' ? (
 <>
 <DropdownMenuItem className="text-green-500 hover:text-white hover:bg-green-500 rounded-xl cursor-pointer font-semibold text-xs py-3 mb-1" onClick={() => onApprove(org)}>
 <ShieldAlert className="w-4 h-4 mr-3" /> Approve Portfolio
 </DropdownMenuItem>
 <DropdownMenuItem className="text-red-500 hover:text-white hover:bg-red-500 rounded-xl cursor-pointer font-semibold text-xs py-3" onClick={() => onDelete(org)}>
 <Trash2 className="w-4 h-4 mr-3" /> Purge Request
 </DropdownMenuItem>
 </>
 ) : (
 <>
 <DropdownMenuItem className="rounded-xl cursor-pointer font-semibold text-xs py-3 mb-1 transition-all" onClick={() => onEdit(org)}>
 <Edit2 className="w-4 h-4 mr-3 text-primary" /> Modify Asset
 </DropdownMenuItem>
 <DropdownMenuItem
 className="text-orange-500 hover:text-white hover:bg-orange-500 rounded-xl cursor-pointer font-semibold text-xs py-3 mb-1 transition-all"
 onClick={() => onSuspend(org)}
 >
 <ShieldAlert className="w-4 h-4 mr-3" />
 {org.status === 'SUSPENDED' ? 'Legacy Restore' : 'Security Freeze'}
 </DropdownMenuItem>
 <DropdownMenuSeparator className="bg-primary/10" />
 <DropdownMenuItem
 className="text-red-500 hover:text-white hover:bg-red-500 rounded-xl cursor-pointer font-semibold text-xs py-3 transition-all"
 onClick={() => onDelete(org)}
 >
 <Trash2 className="w-4 h-4 mr-3" /> Delete Permanent
 </DropdownMenuItem>
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 );
};

export default OrgTable;
