import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { User, Mail, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/authStore';

const UserForm = ({ formData, setFormData, editingUser, onSubmit, onCancel, onSendResetLink, customRoles = [] }) => {
  const { user: currentUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(!editingUser);

  return (
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

        {/* Custom Role */}
        <div className="space-y-2">
          <Label htmlFor="customRole" className="text-foreground/90 font-semibold mobile-reduce-label">Custom Role (Optional)</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
            <SearchableSelect
              value={formData.customRoleId}
              onChange={(value) => setFormData({ ...formData, customRoleId: value })}
              options={[
                { label: 'None', value: '' },
                ...customRoles.map(cr => ({ label: cr.name, value: cr.id }))
              ]}
              placeholder="Select Custom Role"
              className="!pl-10 relative mobile-reduce-input"
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
  );
};

export default UserForm;