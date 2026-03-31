import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Building2, Edit2, Trash2 } from 'lucide-react';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OrgCards = ({ orgs, getStatusBadge, getPlanBadge, onEdit, onDelete }) => {
 return (
 <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
 {orgs.map((org) => (
 <Card key={org.id} className="border-border/40 shadow-xl bg-white/50 dark:bg-[#0A0A0A]/40 backdrop-blur-md rounded-xl overflow-hidden p-6 relative group border-t-4"
 style={{ borderTopColor: org.themeColor || 'hsl(var(--primary))' }}>
 <div className="flex justify-between items-start mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
 <Building2 className="w-6 h-6 text-primary" />
 </div>
 <div className="min-w-0">
 <h4 className="font-semibold text-sm break-words pr-8">{org.name}</h4>
 <div className="flex gap-2 mt-1.5 flex-wrap">
 {getPlanBadge(org.plan)}
 {getStatusBadge(org.status)}
 </div>
 </div>
 </div>
 <div className="absolute top-4 right-4">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5">
 <MoreHorizontal className="h-5 w-5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56 rounded-lg shadow-2xl bg-black/90 backdrop-blur-xl border-white/10 p-2">
 <DropdownMenuItem className="rounded-xl py-3 font-semibold text-xs " onClick={() => onEdit(org)}>
 <Edit2 className="w-4 h-4 mr-3" /> Quick Edit
 </DropdownMenuItem>
 <DropdownMenuItem className="text-red-500 rounded-xl py-3 font-semibold text-xs " onClick={() => onDelete(org)}>
 <Trash2 className="w-4 h-4 mr-3" /> Terminate Org
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/10">
 <div className="space-y-1">
 <p className="text-xs font-medium text-muted-foreground opacity-60">Industry Sector</p>
 <p className="text-xs font-bold truncate">{org.industry || 'General'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-medium text-muted-foreground opacity-60">System Quota</p>
 <p className="text-xs font-bold">{org._count?.users ?? 0}/{org.maxUsers} Users</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-medium text-muted-foreground opacity-60">Joined Date</p>
 <p className="text-xs font-mono font-bold ">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}</p>
 </div>
 <div className="space-y-1">
 <p className="text-xs font-medium text-muted-foreground opacity-60">Record ID</p>
 <p className="text-xs font-mono opacity-50 truncate">#{org.id.slice(0, 8)}</p>
 </div>
 </div>
 </Card>
 ))}
 </div>
 );
};

export default OrgCards;
