import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Mail, MoreVertical, Key, UserX } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const UserTable = ({ users, getRoleBadge, onForceReset, onDelete }) => {
  const PROJECT_COLORS = [
    '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#F97316', '#D946EF'
  ];
  return (
    <div className="hidden sm:block overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/10 border-border/10">
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center py-4">User</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Organization</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Role</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Status</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center pr-10">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u, idx) => {
            const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
            return (
              <TableRow key={u.id} className="group cursor-pointer transition-all hover:bg-white/[0.02] border-b border-border/5 last:border-0 h-24" style={{ borderLeft: `4px solid ${rowColor}`, background: `${rowColor}0d` }}>
                <TableCell className="">
                  <div className="flex items-center justify-center gap-4">
                    <div className="relative group shrink-0">
                      <Avatar className="h-14 w-14 rounded-xl border-2 border-primary/10 shadow-lg transition-transform group-hover:scale-105">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-semibold ">
                          {u.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {u.isApproved && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-background rounded-full" />}
                    </div>
                    <div className="flex flex-col min-w-0 text-left w-[150px]">
                      <p className="font-bold text-sm text-foreground/90 leading-tight truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold opacity-60 flex items-center gap-1.5 mt-1 truncate">
                        <Mail className="w-3 h-3" /> {u.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                      <Building2 className="w-3.5 h-3.5 text-primary/60" />
                      <span className="truncate max-w-[150px]">{u.organization?.name || 'No Organization'}</span>
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Organization</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">{getRoleBadge(u.role)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)]", u.isApproved ? 'bg-green-500 shadow-green-500/40' : 'bg-slate-400 opacity-50')} />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", u.isApproved ? 'text-green-600' : 'text-muted-foreground/60')}>
                      {u.isApproved ? 'Active' : 'Pending'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center pr-10">
                  <div className="flex items-center justify-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 transition-opacity">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl bg-background dark:bg-black/95 backdrop-blur-xl border-border/40 p-2 font-montserrat">
                        <DropdownMenuItem
                          className="rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer text-foreground dark:text-white focus:bg-primary/10 transition-all"
                          onClick={() => onForceReset(u)}
                        >
                          <Key className="w-4 h-4 mr-3 text-primary" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/10 dark:bg-white/5" />
                        <DropdownMenuItem
                          className="text-red-500 rounded-xl py-3 font-bold text-[10px] tracking-widest uppercase cursor-pointer focus:bg-red-500 focus:text-white transition-all"
                          onClick={() => onDelete(u)}
                        >
                          <UserX className="w-4 h-4 mr-3" /> Delete User
                        </DropdownMenuItem>
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

export default UserTable;
