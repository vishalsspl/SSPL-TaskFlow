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
    <div className="hidden sm:block overflow-x-auto w-full">
      <Table>
        <TableHeader className="bg-secondary/10 border-border/10">
          <TableRow>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center py-4">Organization</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Plan</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Status</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Users / Limit</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Joined</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center pr-8">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgs.map((org, idx) => {
            const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
            return (
              <TableRow key={org.id} className="cursor-pointer transition-all hover:bg-white/[0.02] border-b border-border/5" style={{ borderLeft: `4px solid ${rowColor}`, background: `${rowColor}0d` }}>
                <TableCell className="py-5">
                  <div className="flex items-center justify-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-primary/10 shadow-inner group-hover:scale-110 transition-transform duration-500 overflow-hidden"
                      style={{ background: org.logoUrl ? 'transparent' : `linear-gradient(135deg, ${org.themeColor || '#15803d'}22, ${org.themeColor || '#15803d'}44)` }}
                    >
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary/80" />
                      )}
                    </div>
                    <div className="min-w-0 text-left w-[180px]">
                      <p className="font-bold text-sm text-foreground truncate">{org.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 mt-1 truncate">
                        <Globe className="w-3 h-3 text-primary" />
                        {org.industry || 'General'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">{getPlanBadge(org.plan)}</TableCell>
                <TableCell className="text-center">{getStatusBadge(org.status)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-foreground">{org._count?.users ?? 0} <span className="text-muted-foreground font-normal opacity-40">/</span> {org.maxUsers}</span>
                    <div className="w-16 h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(((org._count?.users ?? 0) / (org.maxUsers || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest">
                    {org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-center pr-8">
                  <div className="flex items-center justify-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-border/40 bg-background dark:bg-black/95 backdrop-blur-xl p-2 font-montserrat">
                        <DropdownMenuLabel className="text-[10px] font-black tracking-widest uppercase text-primary/60 px-3 py-2">
                          Actions
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/10 dark:bg-white/5" />
                        {org.status === 'PENDING' ? (
                          <>
                            <DropdownMenuItem className="text-green-500 hover:text-white hover:bg-green-500 rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-3 mb-1 transition-all" onClick={() => onApprove(org)}>
                              <ShieldAlert className="w-4 h-4 mr-3" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 hover:text-white hover:bg-red-500 rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-3 transition-all" onClick={() => onDelete(org)}>
                              <Trash2 className="w-4 h-4 mr-3" /> Reject & Delete
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem className="text-foreground dark:text-white rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-3 mb-1 transition-all focus:bg-primary/10" onClick={() => onEdit(org)}>
                              <Edit2 className="w-4 h-4 mr-3 text-primary" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-orange-500 hover:text-white hover:bg-orange-500 rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-3 mb-1 transition-all"
                              onClick={() => onSuspend(org)}
                            >
                              <ShieldAlert className="w-4 h-4 mr-3" />
                              {org.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/10 dark:bg-white/5" />
                            <DropdownMenuItem
                              className="text-red-500 hover:text-white hover:bg-red-500 rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-3 transition-all"
                              onClick={() => onDelete(org)}
                            >
                              <Trash2 className="w-4 h-4 mr-3" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
