import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const OrgCreateDialog = ({ open, onOpenChange, newOrg, setNewOrg, onProvision, saving }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-2xl w-[95vw] max-h-[90vh] p-0 border border-border bg-background shadow-2xl flex flex-col overflow-hidden font-montserrat outline-none ring-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0 border-b border-border/50 bg-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Create New Organization</DialogTitle>
              <DialogDescription className="text-[10px] font-bold tracking-widest text-muted-foreground opacity-60 uppercase">Set up a new workspace with an admin account</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Using standard overflow-y-auto for better mobile browser compatibility */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 custom-scrollbar">
          <div className="space-y-6 py-6 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Organization Name *</Label>
                <Input placeholder="Enter organization name" className="h-11 px-4 rounded-xl bg-background border-border font-medium text-sm placeholder:font-normal placeholder:text-muted-foreground/40 focus-visible:ring-primary/20"
                  value={newOrg.name} onChange={e => setNewOrg(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Plan *</Label>
                <Select value={newOrg.plan} onValueChange={v => setNewOrg(p => ({ ...p, plan: v }))}>
                  <SelectTrigger className="w-full px-4 h-11 rounded-xl border-border bg-background text-sm font-medium outline-none text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-xl">
                    {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map(p => (
                      <SelectItem key={p} value={p} className="rounded-lg text-sm transition-colors">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Industry *</Label>
                <Select value={newOrg.industry} onValueChange={v => setNewOrg(p => ({ ...p, industry: v }))}>
                  <SelectTrigger className="w-full px-4 h-11 rounded-xl border-border bg-background text-sm font-medium outline-none text-left">
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-xl">
                    {['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Real Estate', 'Media', 'Other'].map(i => (
                      <SelectItem key={i} value={i} className="rounded-lg text-sm">{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Company Size *</Label>
                <Select value={newOrg.size} onValueChange={v => setNewOrg(p => ({ ...p, size: v }))}>
                  <SelectTrigger className="w-full px-4 h-11 rounded-xl border-border bg-background text-sm font-medium outline-none text-left">
                    <SelectValue placeholder="Select Size" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-xl">
                    {['1-10', '11-50', '51-200', '201-500', '500+'].map(s => (
                      <SelectItem key={s} value={s} className="rounded-lg text-sm">{s} employees</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Website (Optional)</Label>
                <Input placeholder="https://company.com" className="h-11 px-4 rounded-xl bg-background border-border font-medium text-sm placeholder:font-normal placeholder:text-muted-foreground/40"
                  value={newOrg.website} onChange={e => setNewOrg(p => ({ ...p, website: e.target.value }))} />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Country *</Label>
                <Select value={newOrg.country} onValueChange={v => setNewOrg(p => ({ ...p, country: v }))}>
                  <SelectTrigger className="w-full px-4 h-11 rounded-xl border-border bg-background text-sm font-medium outline-none text-left">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-xl h-[200px]">
                    <ScrollArea className="h-full w-full">
                      {['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'UAE', 'Other'].map(c => (
                        <SelectItem key={c} value={c} className="rounded-lg text-sm transition-colors">{c}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">Admin Account Account Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Admin Name *</Label>
                  <Input placeholder="Enter admin name" className="h-11 px-4 rounded-xl bg-background border-border font-medium text-sm placeholder:font-normal placeholder:text-muted-foreground/40"
                    value={newOrg.adminName} onChange={e => setNewOrg(p => ({ ...p, adminName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Admin Email *</Label>
                  <Input placeholder="admin@domain.io" type="email" className="h-11 px-4 rounded-xl bg-background border-border font-medium text-sm placeholder:font-normal placeholder:text-muted-foreground/40"
                    value={newOrg.adminEmail} onChange={e => setNewOrg(p => ({ ...p, adminEmail: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 ml-1">Password *</Label>
                <Input placeholder="••••••••" type="password" className="h-11 px-4 rounded-xl bg-background border-border font-medium text-sm font-mono placeholder:font-normal placeholder:text-muted-foreground/40"
                  value={newOrg.adminPassword} onChange={e => setNewOrg(p => ({ ...p, adminPassword: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 pt-4 flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-3 border-t border-border bg-secondary/5 shrink-0">
          <Button variant="ghost" className="w-full sm:w-auto rounded-xl font-bold text-[10px] tracking-widest h-11 px-8 uppercase text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onProvision}
            disabled={saving}
            className="w-full sm:w-[260px] rounded-xl px-0 h-11 font-bold text-[10px] tracking-widest shadow-lg shadow-primary/10 uppercase transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </div>
            ) : 'Create Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrgCreateDialog;
