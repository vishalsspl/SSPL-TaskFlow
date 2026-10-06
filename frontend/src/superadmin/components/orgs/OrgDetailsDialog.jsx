import { Button } from '@/components/ui/button';
import { Building2, Globe, Users, Briefcase, Mail, MapPin, Clock, Calendar, CheckCircle2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const InfoField = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-4 p-4 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors">
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground break-words">{value || 'N/A'}</p>
    </div>
  </div>
);

const OrgDetailsDialog = ({ org, setOrg, getPlanBadge, getStatusBadge }) => {
  if (!org) return null;

  return (
    <Dialog open={!!org} onOpenChange={(open) => !open && setOrg(null)}>
      <DialogContent className="rounded-xl max-w-2xl p-0 border border-border/40 shadow-2xl backdrop-blur-2xl bg-white/95 dark:bg-black/95 overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">{org.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                Organization Details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/40 bg-secondary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                <div>{getStatusBadge ? getStatusBadge(org.status) : <Badge>{org.status}</Badge>}</div>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/40 bg-secondary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plan</p>
                <div>{getPlanBadge ? getPlanBadge(org.plan) : <Badge>{org.plan}</Badge>}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest px-1 opacity-70">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField icon={Building2} label="Organization Name" value={org.name} />
                <InfoField icon={Briefcase} label="Industry" value={org.industry} />
                <InfoField icon={Users} label="Company Size" value={org.size} />
                <InfoField icon={Globe} label="Website" value={org.website} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest px-1 opacity-70">Location & Time</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField icon={MapPin} label="Country" value={org.country} />
                <InfoField icon={Clock} label="Timezone" value={org.timezone} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest px-1 opacity-70">Admin Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField icon={User} label="Admin Name" value={org.users?.[0]?.name} />
                <InfoField icon={Mail} label="Admin Email" value={org.users?.[0]?.email} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest px-1 opacity-70">System Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField icon={Calendar} label="Registered On" value={org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'} />
                <InfoField icon={CheckCircle2} label="Tenant DB ID" value={org.tenantDbId} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border/10 flex justify-end bg-secondary/5">
          <Button variant="outline" onClick={() => setOrg(null)} className="rounded-xl px-8 shadow-sm">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrgDetailsDialog;
