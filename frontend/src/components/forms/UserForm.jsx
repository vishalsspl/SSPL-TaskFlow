import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { User, Mail, Shield, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const UserForm = ({ formData, setFormData, editingUser, onSubmit, onCancel, onSendResetLink, customRoles = [], fixedRole = false, onRoleCreated }) => {
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(!editingUser);

  // Local roles list to allow immediate selection of freshly created profiles
  const [localRoles, setLocalRoles] = useState(customRoles || []);
  const [showAddProfileDialog, setShowAddProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newProfileCanAssign, setNewProfileCanAssign] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);

  useEffect(() => {
    if (customRoles && customRoles.length > 0) {
      setLocalRoles(customRoles);
    } else if (currentUser?.role === 'ADMIN') {
      api.get('/roles')
        .then(res => setLocalRoles(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Failed to fetch roles:', err));
    }
  }, [customRoles, currentUser]);

  const handleOpenAddProfile = (initialName = '') => {
    setNewProfileName(typeof initialName === 'string' ? initialName.trim() : '');
    setNewProfileDesc('');
    setNewProfileCanAssign(false);
    setShowAddProfileDialog(true);
  };

  const handleCreateProfile = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const trimmedName = newProfileName.trim();
    if (!trimmedName) {
      toast({ title: 'Profile name is required', variant: 'destructive' });
      return;
    }

    if (!/[a-zA-Z\p{L}]/u.test(trimmedName)) {
      toast({ title: 'Profile name must contain at least one letter', variant: 'destructive' });
      return;
    }

    if (trimmedName.length > 50) {
      toast({ title: 'Profile name cannot exceed 50 characters', variant: 'destructive' });
      return;
    }

    if (newProfileDesc && newProfileDesc.length > 500) {
      toast({ title: 'Profile description cannot exceed 500 characters', variant: 'destructive' });
      return;
    }

    const isDuplicate = localRoles.some(
      r => r.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      toast({ title: 'A profile with this name already exists', variant: 'destructive' });
      return;
    }

    try {
      setCreatingProfile(true);
      const response = await api.post('/roles', {
        name: trimmedName,
        description: newProfileDesc.trim() || undefined,
        permissions: { canAssignTasks: newProfileCanAssign },
      });

      const createdRole = response.data;
      setLocalRoles(prev => [...prev, createdRole]);
      onRoleCreated?.(createdRole);

      // Automatically select the new profile in the form
      setFormData(prev => ({ ...prev, customRoleId: createdRole.id }));

      toast({
        title: 'Profile created',
        description: `"${createdRole.name}" has been created and selected.`,
      });

      setShowAddProfileDialog(false);
      setNewProfileName('');
      setNewProfileDesc('');
      setNewProfileCanAssign(false);
    } catch (error) {
      console.error('Failed to create profile:', error);
      toast({
        title: 'Failed to create profile',
        description: error.response?.data?.error || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setCreatingProfile(false);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4 mobile-reduce-spacing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mobile-reduce-grid">

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground/90 font-semibold mobile-reduce-label">Full Name <span className="text-red-500">*</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
                className="!pl-10 transition-all focus:ring-2 focus:ring-primary/20 mobile-reduce-input"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/90 font-semibold mobile-reduce-label">Email Address <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
                disabled={!!editingUser && currentUser?.role !== 'ADMIN'}
                className="!pl-10 transition-all focus:ring-2 focus:ring-primary/20 mobile-reduce-input"
              />
            </div>
          </div>

          {/* Role */}
          {!fixedRole && (
          <div className="space-y-2">
            <Label htmlFor="role" className="text-foreground/90 font-semibold mobile-reduce-label">Role <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
              <SearchableSelect
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value })}
                options={[
                  ...(currentUser?.role === 'ADMIN' ? [{ label: 'Manager', value: 'MANAGER' }] : []),
                  { label: 'Member', value: 'MEMBER' },
                  { label: 'Client', value: 'CLIENT' }
                ]}
                placeholder="Select Role"
                className="!pl-10 relative mobile-reduce-input"
              />
            </div>
          </div>
          )}

          {/* Profile */}
          <div className="space-y-2">
            <Label htmlFor="customRole" className="text-foreground/90 font-semibold mobile-reduce-label">Profile (Optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
              <SearchableSelect
                value={formData.customRoleId}
                onChange={(value) => setFormData({ ...formData, customRoleId: value })}
                options={[
                  { label: 'None', value: '' },
                  ...localRoles.map(cr => ({ label: cr.name, value: cr.id }))
                ]}
                placeholder="Select Profile"
                className="!pl-10 relative mobile-reduce-input"
                onAddClick={currentUser?.role === 'ADMIN' ? handleOpenAddProfile : undefined}
                addLabel="Add Profile"
              />
            </div>
          </div>

          {/* Password / Reset Link */}
          <div className="space-y-2">
            {editingUser ? (
              <>
                <Label className="text-foreground/90 font-semibold mobile-reduce-label">Password Management</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/5 h-10"
                  onClick={() => onSendResetLink?.(formData.email)}
                >
                  <Lock className="w-4 h-4" />
                  Send Password Reset Link
                </Button>
              </>
            ) : (
              <>
                <Label htmlFor="password" news className="text-foreground/90 font-semibold mobile-reduce-label">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="!pl-10 !pr-10 transition-all focus:ring-2 focus:ring-primary/20 mobile-reduce-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Email Notification Toggle - Only show when inviting new user */}
        {!editingUser && currentUser?.activeFeatures?.emailsupport !== false && (
          <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="sendEmail" className="text-sm font-semibold cursor-pointer">Invitation Email</Label>
                <p className="text-xs text-muted-foreground">Send login credentials to the new member</p>
              </div>
            </div>
            <Switch
              id="sendEmail"
              checked={formData.sendEmail}
              onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t mt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="hover:bg-gray-50 h-8 sm:h-10 text-xs sm:text-sm">
            Cancel
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-md h-8 sm:h-10 text-xs sm:text-sm px-6">
            {editingUser ? 'Update Member' : 'Add Member'}
          </Button>
        </div>
      </form>

      {/* Quick Create Profile Dialog */}
      <Dialog open={showAddProfileDialog} onOpenChange={setShowAddProfileDialog}>
        <DialogContent className="sm:max-w-[460px] z-[70] border border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold">Create New Profile</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Quickly create a profile / designation for team members without leaving this page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1.5">
              <Label htmlFor="quick-profile-name" className="text-xs font-semibold">
                Profile Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quick-profile-name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g. Frontend Developer, QA Engineer"
                maxLength={50}
                className="h-9 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateProfile();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-profile-desc" className="text-xs font-semibold">
                Description (Optional)
              </Label>
              <Textarea
                id="quick-profile-desc"
                value={newProfileDesc}
                onChange={(e) => setNewProfileDesc(e.target.value)}
                placeholder="Brief description of responsibilities..."
                maxLength={500}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/40">
              <div>
                <Label htmlFor="quick-profile-can-assign" className="text-xs font-semibold cursor-pointer">
                  Can Assign Tasks
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Allow members with this profile to assign tasks to others
                </p>
              </div>
              <Switch
                id="quick-profile-can-assign"
                checked={newProfileCanAssign}
                onCheckedChange={setNewProfileCanAssign}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddProfileDialog(false)}
              disabled={creatingProfile}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateProfile}
              disabled={creatingProfile}
              className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90"
            >
              {creatingProfile ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Profile'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserForm;