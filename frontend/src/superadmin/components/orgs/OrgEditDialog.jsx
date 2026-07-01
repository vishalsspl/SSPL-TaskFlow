import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Target, Zap, Users, Briefcase, User, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const OrgEditDialog = ({ editOrg, setEditOrg, onSave, saving, globalTiers }) => {
  if (!editOrg) return null;

  return (
    <Dialog open={!!editOrg} onOpenChange={(open) => !open && setEditOrg(null)}>
      <DialogContent className="rounded-xl max-w-2xl p-0 border border-border/40 shadow-2xl backdrop-blur-2xl bg-white/95 dark:bg-black/95 overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shadow-inner">
              <Edit2 className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-medium">Edit Organization</DialogTitle>
              <DialogDescription className="text-xs font-bold tracking-widest text-muted-foreground opacity-60">
                Update settings for {editOrg?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 pt-4 space-y-8">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label className="text-xs font-medium ml-1 opacity-70">Organization Name</Label>
              <div className="relative">
                <Input
                  value={editOrg?.name || ''}
                  onChange={(e) => setEditOrg({ ...editOrg, name: e.target.value })}
                  className="px-4 h-12 bg-background/50 border-border/40 font-bold focus-visible:ring-primary/20 text-xs rounded-lg"
                  placeholder="Organization Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium ml-1 opacity-70">Status</Label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 z-10" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background/50 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer flex items-center justify-between pr-4 group">
                        <span>{editOrg?.status}</span>
                        <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-lg shadow-2xl border-border/40 bg-background dark:bg-black/95 backdrop-blur-xl p-2">
                      {['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].map((s) => (
                        <DropdownMenuItem
                          key={s}
                          className={cn(
                            "rounded-xl cursor-pointer font-semibold text-xs py-3 mb-1 transition-all text-foreground dark:text-white",
                            editOrg?.status === s ? "bg-orange-500 text-white dark:text-white" : "hover:bg-primary/10 focus:bg-primary/10"
                          )}
                          onClick={() => setEditOrg((p) => ({ ...p, status: s }))}
                        >
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-2">
                <Label className="text-xs font-medium ml-1 opacity-70">Plan</Label>
                <div className="relative">
                  <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 z-10" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background/50 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer flex items-center justify-between pr-4 group">
                        <span>{editOrg?.plan}</span>
                        <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-lg shadow-2xl border-border/40 bg-background dark:bg-black/95 backdrop-blur-xl p-2">
                      {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((planVal) => (
                        <DropdownMenuItem
                          key={planVal}
                          className={cn(
                            "rounded-xl cursor-pointer font-semibold text-xs py-3 mb-1 transition-all text-foreground dark:text-white",
                            editOrg?.plan === planVal ? "bg-orange-500 text-white dark:text-white" : "hover:bg-primary/10 focus:bg-primary/10"
                          )}
                          onClick={() => {
                            const planId = planVal;
                            const defaults = globalTiers?.[planId];
                            setEditOrg((prev) => ({
                              ...prev,
                              plan: planId,
                              ...(defaults && {
                                maxUsers: defaults.maxUsers,
                                maxProjects: defaults.maxProjects,
                                customFeatures: {
                                  ...(prev.customFeatures || {}),
                                  ...defaults.features
                                }
                              })
                            }));
                          }}
                        >
                          {planVal}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Quotas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium ml-1 opacity-70 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Max Users
                </Label>
                <Input
                  type="number"
                  value={editOrg?.maxUsers}
                  min={1}
                  onChange={(e) => setEditOrg((p) => ({ ...p, maxUsers: e.target.value }))}
                  className="h-12 rounded-lg border-border/40 bg-background/50 px-4 font-semibold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium ml-1 opacity-70 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" /> Max Projects
                </Label>
                <Input
                  type="number"
                  value={editOrg?.maxProjects}
                  min={1}
                  onChange={(e) => setEditOrg((p) => ({ ...p, maxProjects: e.target.value }))}
                  className="h-12 rounded-lg border-border/40 bg-background/50 px-4 font-semibold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>


            {/* Feature Access */}
            <div className="pt-6 border-t border-border/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-medium text-primary">Feature Access Control</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'projects', label: 'Projects' },
                  { key: 'kanban', label: 'Kanban Board' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'tickets', label: 'Tickets' },
                  { key: 'team', label: 'Team' },
                  { key: 'chat', label: 'Chat' },
                  { key: 'performance', label: 'Performance' },
                  { key: 'timesheets', label: 'Timesheets' },
                  { key: 'github', label: 'Github Integration' },
                ].map(({ key, label }) => {
                  const isEnabled = editOrg?.customFeatures?.[key] !== false;
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer select-none',
                        isEnabled
                          ? 'border-primary/20 bg-primary/5'
                          : 'border-border/30 bg-muted/30 opacity-60'
                      )}
                      onClick={() =>
                        setEditOrg((prev) => ({
                          ...prev,
                          customFeatures: {
                            ...(prev.customFeatures || {}),
                            [key]: !isEnabled,
                          },
                        }))
                      }
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <div
                        className={cn(
                          'w-9 h-5 rounded-full flex items-center transition-colors duration-200 px-0.5',
                          isEnabled ? 'bg-primary justify-end' : 'bg-border justify-start'
                        )}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Section */}
            {editOrg?.adminId && (
              <div className="pt-6 border-t border-border/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-xs font-medium text-primary">Admin Account Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium ml-1 opacity-50">Admin Name</Label>
                    <Input
                      value={editOrg.adminName || ''}
                      onChange={(e) => setEditOrg((p) => ({ ...p, adminName: e.target.value }))}
                      className="h-11 rounded-xl border-border/20 bg-background/80 px-4 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium ml-1 opacity-50">Admin Email</Label>
                    <Input
                      value={editOrg.adminEmail || ''}
                      onChange={(e) => setEditOrg((p) => ({ ...p, adminEmail: e.target.value }))}
                      className="h-11 rounded-xl border-border/20 bg-background/80 px-4 font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-8 pt-6 flex sm:justify-between items-center gap-4 border-t border-border/10">
          <Button variant="ghost" className="rounded-lg font-semibold text-xs tracking-widest h-12 px-6" onClick={() => setEditOrg(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-lg px-12 h-14 font-semibold text-sm tracking-widest shadow-xl shadow-primary/30 min-w-[200px]"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrgEditDialog;