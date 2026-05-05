import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, MoreVertical, Key, UserX } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const UserCards = ({ users, getRoleBadge, onForceReset, onDelete }) => {
  return (
    <div className="sm:hidden grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
      {users.map((u) => (
        <Card key={u.id} className="rounded-xl border-border/40 shadow-xl bg-white/50 dark:bg-black/40 backdrop-blur-xl p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 w-full pr-6">
              <Avatar className="h-10 w-10 rounded-lg border border-primary/10 shadow-md">
                <AvatarImage src={u.avatar} />
                <AvatarFallback className="bg-primary/5 text-primary text-sm font-semibold ">{u.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h4 className="font-semibold text-xs leading-tight truncate pr-2">{u.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge(u.role)}
                  <div className={cn("w-2 h-2 rounded-full", u.isApproved ? 'bg-green-500' : 'bg-slate-400')} />
                </div>
              </div>
            </div>
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/5 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl bg-background dark:bg-black/95 backdrop-blur-xl border-border/40 p-2">
                <DropdownMenuItem className="rounded-xl py-3 font-semibold text-xs cursor-pointer text-foreground dark:text-white focus:bg-primary/10 transition-all" onClick={() => onForceReset(u)}>
                  <Key className="w-4 h-4 mr-3 text-primary" /> Reset Password
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500 rounded-xl py-3 font-semibold text-xs cursor-pointer focus:bg-red-500 focus:text-white transition-all" onClick={() => onDelete(u)}>
                  <UserX className="w-4 h-4 mr-3" /> Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/10">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-medium text-muted-foreground opacity-60 uppercase tracking-widest">Email</span>
              <span className="font-mono font-bold truncate text-[11px] opacity-80">{u.email}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-medium text-muted-foreground opacity-60 uppercase tracking-widest">Org</span>
              <span className="text-[11px] font-bold flex items-center gap-1.5 truncate"><Building2 className="w-3 h-3 shrink-0" /> {u.organization?.name || 'No Organization'}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default UserCards;
