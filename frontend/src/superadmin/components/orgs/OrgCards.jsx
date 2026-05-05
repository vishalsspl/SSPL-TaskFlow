import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Building2, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OrgCards = ({ orgs, getStatusBadge, getPlanBadge, onEdit, onSuspend, onApprove, onDelete }) => {
  return (
    <div className="sm:hidden grid grid-cols-1 gap-4">
      {orgs.map((org) => (
        <Card key={org.id} className="border-border/40 shadow-xl bg-white/50 dark:bg-[#0A0A0A]/40 backdrop-blur-md rounded-xl overflow-hidden p-4 sm:p-5 relative group border-l-4 sm:border-l-0 sm:border-t-4"
          style={{ borderTopColor: window.innerWidth >= 640 ? (org.themeColor || 'hsl(var(--primary))') : 'transparent', borderLeftColor: window.innerWidth < 640 ? (org.themeColor || 'hsl(var(--primary))') : 'transparent' }}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3 pr-6 w-full">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
                {org.logoUrl ? (
                  <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm break-words leading-tight">{org.name}</h4>
                <div className="flex gap-1.5 mt-1 sm:mt-1.5 flex-wrap">
                  {getPlanBadge(org.plan)}
                  {getStatusBadge(org.status)}
                </div>
              </div>
            </div>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-primary/5">
                    <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl bg-background dark:bg-black/95 backdrop-blur-xl border-border/40 p-2 font-montserrat">
                  {org.status === 'PENDING' ? (
                    <>
                      <DropdownMenuItem className="text-green-500 rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer focus:bg-green-500 focus:text-white transition-all" onClick={() => onApprove(org)}>
                        <ShieldAlert className="w-4 h-4 mr-3" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500 rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer focus:bg-red-500 focus:text-white transition-all" onClick={() => onDelete(org)}>
                        <Trash2 className="w-4 h-4 mr-3" /> Reject & Delete
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem className="rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer text-foreground dark:text-white focus:bg-primary/10 transition-all font-black" onClick={() => onEdit(org)}>
                        <Edit2 className="w-4 h-4 mr-3 text-primary" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-orange-500 rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer focus:bg-orange-500 focus:text-white transition-all" 
                        onClick={() => onSuspend(org)}
                      >
                        <ShieldAlert className="w-4 h-4 mr-3" /> 
                        {org.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500 rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer focus:bg-red-500 focus:text-white transition-all" onClick={() => onDelete(org)}>
                        <Trash2 className="w-4 h-4 mr-3" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-border/10">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground opacity-60">Industry</p>
              <p className="text-[11px] sm:text-xs font-bold truncate">{org.industry || 'General'}</p>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground opacity-60">Plan</p>
              <p className="text-[11px] sm:text-xs font-bold uppercase">{org.plan}</p>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground opacity-60">Users</p>
              <p className="text-[11px] sm:text-xs font-bold">{org._count?.users ?? 0}/{org.maxUsers} Users</p>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground opacity-60">Joined</p>
              <p className="text-[11px] sm:text-xs font-mono font-bold">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default OrgCards;
