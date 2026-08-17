import { useState, useEffect } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Shield, Settings2, Users, MoreVertical } from 'lucide-react';
import api from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const RolesSettings = () => {
  const { setHeader } = useHeaderStore();
  const { toast } = useToast();
  
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: { canAssignTasks: false } });
  const [isSaving, setIsSaving] = useState(false);

  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [selectedRoleForUsers, setSelectedRoleForUsers] = useState(null);
  const [roleUsers, setRoleUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setHeader("Custom Roles", "Manage organizational custom roles and assignments");
    fetchRoles();
  }, [setHeader]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (error) {
      toast({
        title: "Failed to load roles",
        description: error.response?.data?.error || "An error occurred while fetching roles.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role = null) => {
    if (role) {
      setCurrentRole(role);
      setFormData({ 
        name: role.name, 
        description: role.description || '',
        permissions: role.permissions || { canAssignTasks: false }
      });
    } else {
      setCurrentRole(null);
      setFormData({ name: '', description: '', permissions: { canAssignTasks: false } });
    }
    setIsDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      setIsSaving(true);
      if (currentRole) {
        await api.put(`/roles/${currentRole.id}`, formData);
        toast({ title: 'Role updated successfully' });
      } else {
        await api.post('/roles', formData);
        toast({ title: 'Role created successfully' });
      }
      setIsDialogOpen(false);
      fetchRoles();
    } catch (error) {
      toast({
        title: "Failed to save role",
        description: error.response?.data?.error || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm('Are you sure you want to delete this role? Users assigned to this role will lose this assignment.')) return;
    
    try {
      await api.delete(`/roles/${id}`);
      toast({ title: 'Role deleted successfully' });
      fetchRoles();
    } catch (error) {
      toast({
        title: "Failed to delete role",
        description: error.response?.data?.error || "An error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleViewUsers = async (role) => {
    setSelectedRoleForUsers(role);
    setIsUsersDialogOpen(true);
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      // Filter users by customRoleId
      const usersInRole = res.data.filter(u => u.customRoleId === role.id);
      setRoleUsers(usersInRole);
    } catch (error) {
      toast({
        title: "Failed to load users",
        description: "An error occurred while fetching users.",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <div className="flex-1 p-0 sm:p-2 pt-2 overflow-y-auto h-full space-y-6">
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground/90 Montserrat">Custom Roles</h2>
          <p className="text-muted-foreground text-sm">Define specialized roles like "Developer" or "Designer" for task assignments.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="font-bold Montserrat rounded-xl px-6 h-11 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-muted-foreground col-span-full">Loading roles...</p>
        ) : roles.length === 0 ? (
          <div className="col-span-full p-12 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-card/50 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Settings2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground/90 Montserrat">No Custom Roles</h3>
            <p className="text-muted-foreground text-sm max-w-md mt-2">
              Create custom roles to assign specialized titles to your team members, making it easier to filter and assign tasks.
            </p>
          </div>
        ) : (
          roles.map(role => (
            <Card 
              key={role.id} 
              className="hover:shadow-md transition-shadow relative overflow-hidden group border-border/50 cursor-pointer"
              onClick={() => handleViewUsers(role)}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="Montserrat text-lg text-foreground/90">{role.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleOpenDialog(role)} className="cursor-pointer gap-2">
                        <Pencil className="h-4 w-4" />
                        <span>Edit Role</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteRole(role.id)} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Role</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {role.description || <span className="italic opacity-50">No description provided</span>}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {currentRole ? 'Update the details for this custom role.' : 'Add a new custom role to your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/90 font-semibold">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Frontend Developer"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground/90 font-semibold">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
                className="h-11"
              />
            </div>
            <div className="flex items-center justify-between mt-2 p-4 border rounded-xl bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Assign Tasks</Label>
                <p className="text-[13px] text-muted-foreground">
                  Allow members with this role to assign tasks to other users.
                </p>
              </div>
              <Switch
                checked={formData.permissions.canAssignTasks}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  permissions: { ...formData.permissions, canAssignTasks: checked }
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={isSaving || !formData.name.trim()}>
              {isSaving ? 'Saving...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedRoleForUsers?.name} - Assigned Users</DialogTitle>
            <DialogDescription>
              A list of users assigned to the '{selectedRoleForUsers?.name}' role.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 py-4">
            {loadingUsers ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading users...</p>
            ) : roleUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No users are currently assigned to this role.</p>
            ) : (
              roleUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-none">{user.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{user.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesSettings;
