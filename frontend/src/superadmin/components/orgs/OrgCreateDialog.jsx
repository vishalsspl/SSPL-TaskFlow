import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Zap, User, ChevronDown } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const OrgCreateDialog = ({ open, onOpenChange, newOrg, setNewOrg, onProvision, saving }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-2xl p-0 border border-border/40 shadow-2xl backdrop-blur-2xl bg-white/95 dark:bg-black/95 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left font-montserrat">
              <DialogTitle className="text-lg font-bold tracking-tight">Create New Organization</DialogTitle>
              <DialogDescription className="text-[10px] font-bold tracking-widest text-muted-foreground opacity-50 uppercase">Set up a new organization with an admin account</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-50 leading-none">Organization Name *</Label>
              <Input placeholder="Cyberdyne Systems" className="h-10 rounded-xl bg-background/50 border-border/40 px-4 font-bold text-sm"
                value={newOrg.name} onChange={e => setNewOrg(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-50 leading-none">Plan</Label>
              <div className="relative">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60 z-10" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="w-full pl-11 h-10 rounded-xl border border-border/40 bg-background/50 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer flex items-center justify-between pr-4 group">
                      <span>{newOrg.plan}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-2xl border-border/40 bg-black/90 backdrop-blur-xl p-2 font-montserrat">
                    {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map(planVal => (
                      <DropdownMenuItem key={planVal}
                        className={cn("rounded-lg cursor-pointer font-bold text-xs py-2.5 mb-1 transition-all", newOrg.plan === planVal ? "bg-primary text-white" : "hover:bg-primary/10")}
                        onClick={() => setNewOrg(prev => ({ ...prev, plan: planVal }))}>
                        {planVal}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Admin section */}
          <div className="p-5 rounded-xl bg-primary/[0.03] border border-primary/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Admin Account</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-40 leading-none">Admin Name</Label>
                <Input placeholder="Sarah Connor" className="h-10 rounded-xl border-border/20 bg-background/80 px-4 font-bold text-sm"
                  value={newOrg.adminName} onChange={e => setNewOrg(p => ({ ...p, adminName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-40 leading-none">Admin Email</Label>
                <Input placeholder="sarah@resistance.io" type="email" className="h-10 rounded-xl border-border/20 bg-background/80 px-4 font-bold text-sm"
                  value={newOrg.adminEmail} onChange={e => setNewOrg(p => ({ ...p, adminEmail: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-40 leading-none">Password</Label>
              <Input placeholder="••••••••" type="password" className="h-10 rounded-xl border-border/20 bg-background/80 px-4 font-bold text-sm font-mono"
                value={newOrg.adminPassword} onChange={e => setNewOrg(p => ({ ...p, adminPassword: e.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 flex sm:justify-between items-center gap-4 border-t border-border/10">
          <Button variant="ghost" className="rounded-xl font-bold text-[10px] tracking-widest h-10 px-6 uppercase text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onProvision}
            disabled={saving}
            className="rounded-xl px-12 h-10 font-bold text-[10px] tracking-widest shadow-lg shadow-primary/20 min-w-[200px] uppercase"
          >
            {saving ? 'Creating...' : 'Create Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrgCreateDialog;
