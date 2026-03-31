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
 <div className="hidden sm:block">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs font-medium pl-10 text-muted-foreground">User</TableHead>
 <TableHead className="text-xs font-medium text-muted-foreground">Organization</TableHead>
 <TableHead className="text-xs font-medium text-muted-foreground">Role</TableHead>
 <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
 <TableHead className="text-right text-xs font-medium pr-10 text-muted-foreground">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {users.map((u, idx) => {
 const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
 return (
 <TableRow key={u.id} className="group cursor-pointer transition-all hover:scale-[1.002] border-b border-border/10 last:border-0 h-24" style={{ borderLeft: `4px solid ${rowColor}`, background: `${rowColor}0d` }}>
 <TableCell className="pl-10">
 <div className="flex items-center gap-4">
 <div className="relative group">
 <Avatar className="h-14 w-14 rounded-lg border-2 border-primary/10 shadow-lg transition-transform group-hover:scale-105">
 <AvatarImage src={u.avatar} />
 <AvatarFallback className="bg-primary/5 text-primary text-lg font-semibold ">
 {u.name?.charAt(0)}
 </AvatarFallback>
 </Avatar>
 {u.isApproved && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-background rounded-full" />}
 </div>
 <div className="flex flex-col min-w-0">
 <p className="font-semibold text-sm text-foreground/90 leading-tight">{u.name}</p>
 <p className="text-sm text-muted-foreground font-mono font-medium opacity-60 flex items-center gap-1.5 mt-1">
 <Mail className="w-3 h-3" /> {u.email}
 </p>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col">
 <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
 <Building2 className="w-3.5 h-3.5 text-primary/60" />
 <span>{u.organization?.name || 'No Organization'}</span>
 </div>
 <p className="text-xs font-bold text-muted-foreground/50 mt-1 ml-5">Organization</p>
 </div>
 </TableCell>
 <TableCell>{getRoleBadge(u.role)}</TableCell>
 <TableCell>
 <div className="flex items-center gap-3">
 <div className={cn("w-2 h-2 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)]", u.isApproved ? 'bg-green-500 shadow-green-500/40' : 'bg-slate-400 opacity-50')} />
 <span className={cn("text-xs font-medium", u.isApproved ? 'text-green-600' : 'text-muted-foreground/60')}>
 {u.isApproved ? 'Active' : 'Pending'}
 </span>
 </div>
 </TableCell>
 <TableCell className="text-right pr-10">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity">
 <MoreVertical className="h-5 w-5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56 rounded-lg shadow-2xl bg-black/90 dark:bg-black/95 backdrop-blur-xl border-white/10 p-2">
 <DropdownMenuItem
 className="rounded-xl py-3 font-semibold text-xs cursor-pointer focus:bg-primary/20 focus:text-white"
 onClick={() => onForceReset(u)}
 >
 <Key className="w-4 h-4 mr-3 text-primary" /> Reset Password
 </DropdownMenuItem>
 <DropdownMenuSeparator className="bg-white/5 opacity-50" />
 <DropdownMenuItem
 className="text-red-500 rounded-xl py-3 font-semibold text-xs cursor-pointer focus:bg-red-500 focus:text-white"
 onClick={() => onDelete(u)}
 >
 <UserX className="w-4 h-4 mr-3" /> Delete User
 </DropdownMenuItem>
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

export default UserTable;
