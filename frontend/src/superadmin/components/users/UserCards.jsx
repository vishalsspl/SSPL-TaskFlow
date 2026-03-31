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
 <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
 {users.map((u) => (
 <Card key={u.id} className="rounded-xl border-border/40 shadow-xl bg-white/50 dark:bg-black/40 backdrop-blur-xl p-6 relative overflow-hidden group">
 <div className="flex justify-between items-start mb-6">
 <div className="flex items-center gap-4">
 <Avatar className="h-14 w-14 rounded-lg border border-primary/10 shadow-md">
 <AvatarImage src={u.avatar} />
 <AvatarFallback className="bg-primary/5 text-primary text-base font-semibold ">{u.name?.charAt(0)}</AvatarFallback>
 </Avatar>
 <div className="min-w-0">
 <h4 className="font-semibold text-sm truncate pr-4">{u.name}</h4>
 <div className="flex items-center gap-2 mt-1">
 {getRoleBadge(u.role)}
 <div className={cn("w-2 h-2 rounded-full", u.isApproved ? 'bg-green-500' : 'bg-slate-400')} />
 </div>
 </div>
 </div>
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 shrink-0">
 <MoreVertical className="h-5 w-5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56 rounded-lg shadow-2xl bg-black/90 p-2 border-white/10">
 <DropdownMenuItem className="rounded-xl py-3 font-semibold text-xs " onClick={() => onForceReset(u)}>
 <Key className="w-4 h-4 mr-3" /> Key Override
 </DropdownMenuItem>
 <DropdownMenuItem className="text-red-500 rounded-xl py-3 font-semibold text-xs " onClick={() => onDelete(u)}>
 <UserX className="w-4 h-4 mr-3" /> Purge Entity
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 <div className="space-y-4 pt-4 border-t border-border/10">
 <div className="flex items-center justify-between text-sm">
 <span className="font-medium text-muted-foreground opacity-50">Signal</span>
 <span className="font-mono font-bold truncate max-w-[200px]">{u.email}</span>
 </div>
 <div className="flex items-center justify-between text-sm">
 <span className="font-medium text-muted-foreground opacity-50">Affiliation</span>
 <span className="font-bold flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {u.organization?.name || 'Independent'}</span>
 </div>
 </div>
 </Card>
 ))}
 </div>
 );
};

export default UserCards;
