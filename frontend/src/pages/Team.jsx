import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Mail, Shield, Plus, Edit2, Trash2, UserCheck, Clock, Layers, Lock, User, Search, BarChart2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import MemberProgress from '@/components/MemberProgress';

const Team = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Selection State: 'ALL' or managerId
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');
  const [managerTeam, setManagerTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddToTeamDialog, setShowAddToTeamDialog] = useState(false);
  const [addToTeamMemberId, setAddToTeamMemberId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Progress Panel State
  const [viewingProgressUserId, setViewingProgressUserId] = useState(null);
  const [showProgressPanel, setShowProgressPanel] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
    password: '',
  });

  useEffect(() => {
    if (currentUser?.role === 'MANAGER') {
      setSelectedManagerId(currentUser.id);
    }
    fetchUsers();
    if (currentUser?.role === 'ADMIN') {
      fetchPendingUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedManagerId !== 'ALL' && selectedManagerId !== 'PENDING' && selectedManagerId !== 'MANAGERS_LIST') {
      fetchManagerTeam(selectedManagerId);
    } else {
      setManagerTeam([]);
    }
  }, [selectedManagerId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = currentUser?.role === 'MANAGER' ? { teamOnly: 'true' } : {};
      const response = await api.get('/users', { params });
      setUsers(response.data.filter(u => u.isApproved && u.role !== 'ADMIN'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await api.get('/users?pending=true');
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    }
  };

  const fetchManagerTeam = async (managerId) => {
    setLoadingTeam(true);
    try {
      const response = await api.get(`/users/${managerId}/team`);
      setManagerTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch manager team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleApprove = async (userId) => {
    setApproving(userId);
    try {
      await api.put(`/users/${userId}/approve`);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      toast({
        title: "User Approved",
        description: "The team member has been approved successfully.",
      });
      fetchUsers(); // Refresh approved users list
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't send password if not changing
        }
        await api.put(`/users/${editingUser.id}`, updateData);
      } else {
        // Create new user via invite
        await api.post('/auth/invite', {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        });
      }

      setShowDialog(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'MEMBER',
        password: '',
      });
      fetchUsers();
      toast({
        title: "User Saved",
        description: editingUser ? "Member details updated successfully." : "New member invited successfully.",
      });
    } catch (error) {
      console.error('Failed to save user:', error);
      toast({
        title: "Save Failed",
        description: error.response?.data?.error || "Failed to save user details.",
        variant: "destructive",
      });
    }
  };

  const handleAddToTeam = async (userId) => {
    try {
      await api.put(`/users/${userId}`, { managerId: currentUser.id });
      // Refresh the full user list (updates + button state) AND the manager's team list (updates team count)
      await fetchUsers();
      if (currentUser?.id) fetchManagerTeam(currentUser.id);
      toast({
        title: "Team Updated",
        description: "Member has been added to your team.",
      });
    } catch (error) {
      console.error('Failed to add user to team:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.error || "Failed to add user to team.",
        variant: "destructive",
      });
    }
  };

  const handleAdminAddToTeam = async () => {
    if (!addToTeamMemberId || !selectedManagerId) return;
    try {
      await api.put(`/users/${addToTeamMemberId}`, { managerId: selectedManagerId });
      setShowAddToTeamDialog(false);
      setAddToTeamMemberId('');
      await fetchUsers();
      fetchManagerTeam(selectedManagerId);
      toast({
        title: "Team Updated",
        description: "Member has been added to this manager's team.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.error || "Failed to add member to team.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      isApproved: user.isApproved,
    });
    setShowDialog(true);
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await api.delete(`/users/${userToDelete.id}`);
      toast({
        title: "User Deleted",
        description: `${userToDelete.name} has been removed successfully.`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.error || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'MEMBER',
      password: '',
    });
  };

  const ROLE_CONFIG = {
    ADMIN: {
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.1)',
      border: 'rgba(139,92,246,0.2)',
      text: '#A78BFA',
      label: 'Admin'
    },
    MANAGER: {
      color: '#0EA5E9',
      bg: 'rgba(14,165,233,0.1)',
      border: 'rgba(14,165,233,0.2)',
      text: '#7DD3FC',
      label: 'Manager'
    },
    MEMBER: {
      color: '#10B981',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.2)',
      text: '#6EE7B7',
      label: 'Member'
    },
    CLIENT: {
      color: '#F43F5E',
      bg: 'rgba(244,63,94,0.1)',
      border: 'rgba(244,63,94,0.2)',
      text: '#FDA4AF',
      label: 'Client'
    }
  };

  const getRoleBadgeStyle = (role) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.MEMBER;
    return {
      backgroundColor: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading team...</div>
      </div>
    );
  }

  // Derived state for managers and clients
  const managers = users.filter(u => u.role === 'MANAGER');
  const clients = users.filter(u => u.role === 'CLIENT');
  const members = users.filter(u => u.role === 'MEMBER');

  // Decide which users to show
  let displayUsers = users.filter(u => u.id !== currentUser?.id);
  if (selectedManagerId === 'MANAGERS_LIST') {
    displayUsers = managers.filter(u => u.id !== currentUser?.id);
  } else if (selectedManagerId === 'CLIENTS_LIST') {
    displayUsers = clients.filter(u => u.id !== currentUser?.id);
  } else if (selectedManagerId === 'MEMBERS_LIST') {
    displayUsers = members.filter(u => u.id !== currentUser?.id);
  } else if (selectedManagerId !== 'ALL' && selectedManagerId !== 'PENDING') {
    displayUsers = managerTeam.filter(u => u.id !== currentUser?.id);
  }

  // Apply search filter
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    displayUsers = displayUsers.filter(
      u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }

  // Filter for Manager: Show only MEMBERS in "All Members" view
  if (currentUser?.role === 'MANAGER' && selectedManagerId === 'ALL') {
    displayUsers = displayUsers.filter(u => u.role === 'MEMBER');
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <p className="text-muted-foreground">
            Manage your organization's team members and structure
          </p>
        </div>
        {currentUser?.role === 'ADMIN' && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Member
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Team Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update the user's role and details. Changing the role will affect their permissions immediately."
                : "Enter the member's details and set a password. They will receive an email with their credentials."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                    disabled={!!editingUser}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="pl-9 relative">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUser?.role === 'ADMIN' && (
                      <>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                      </>
                    )}
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{editingUser ? 'New Password' : 'Set Demo Password *'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Leave empty to keep current' : '••••••••'}
                  required={!editingUser}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update Member' : 'Add Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Navigation Buttons + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
            <>
              <div className="flex items-center gap-1">
                <Button
                  variant="none"
                  onClick={() => setSelectedManagerId('ALL')}
                  className={`gap-2 h-10 px-4 rounded-xl Montserrat font-bold transition-all duration-300 ${selectedManagerId === 'ALL'
                    ? 'bg-primary/20 text-primary ring-1 ring-primary/50 shadow-[0_0_20px_rgba(72,161,17,0.15)]'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                >
                  <Layers className="w-4 h-4" />
                  {currentUser?.role === 'MANAGER' ? 'My Team' : 'All Members'}
                  <Badge variant="none" className="ml-1 bg-white/10 text-inherit text-[10px] px-1.5">{users.length}</Badge>
                </Button>
              </div>
              {currentUser?.role === 'ADMIN' && (
                <Button
                  variant="none"
                  onClick={() => setSelectedManagerId('MANAGERS_LIST')}
                  className={`gap-2 h-10 px-4 rounded-xl Montserrat font-bold transition-all duration-300 ${selectedManagerId === 'MANAGERS_LIST'
                    ? 'bg-[#0EA5E9]/20 text-[#0EA5E9] ring-1 ring-[#0EA5E9]/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                >
                  <Shield className="w-4 h-4" />
                  Managers
                  <Badge variant="none" className="ml-1 bg-white/10 text-inherit text-[10px] px-1.5">{managers.length}</Badge>
                </Button>
              )}
              {currentUser?.role === 'ADMIN' && (
                <Button
                  variant="none"
                  onClick={() => setSelectedManagerId('CLIENTS_LIST')}
                  className={`gap-2 h-10 px-4 rounded-xl Montserrat font-bold transition-all duration-300 ${selectedManagerId === 'CLIENTS_LIST'
                    ? 'bg-[#F43F5E]/20 text-[#F43F5E] ring-1 ring-[#F43F5E]/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                >
                  <Users className="w-4 h-4" />
                  Clients
                  <Badge variant="none" className="ml-1 bg-white/10 text-inherit text-[10px] px-1.5">{clients.length}</Badge>
                </Button>
              )}
              {currentUser?.role === 'ADMIN' && (
                <Button
                  variant="none"
                  onClick={() => setSelectedManagerId('MEMBERS_LIST')}
                  className={`gap-2 h-10 px-4 rounded-xl Montserrat font-bold transition-all duration-300 ${selectedManagerId === 'MEMBERS_LIST'
                    ? 'bg-[#10B981]/20 text-[#10B981] ring-1 ring-[#10B981]/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                >
                  <User className="w-4 h-4" />
                  Members
                  <Badge variant="none" className="ml-1 bg-white/10 text-inherit text-[10px] px-1.5">{members.length}</Badge>
                </Button>
              )}
              {pendingUsers.length > 0 && (
                <Button
                  variant="none"
                  onClick={() => setSelectedManagerId('PENDING')}
                  className={`gap-2 h-10 px-4 rounded-xl Montserrat font-bold transition-all duration-300 ${selectedManagerId === 'PENDING'
                    ? 'bg-orange-500/20 text-orange-500 ring-1 ring-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                    : 'bg-white/5 text-orange-500/60 hover:bg-white/10 hover:text-orange-500'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  Pending
                  <Badge variant="none" className="ml-1 bg-white/10 text-inherit text-[10px] px-1.5">{pendingUsers.length}</Badge>
                </Button>
              )}
            </>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {selectedManagerId === 'MANAGERS_LIST' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {managers.map(manager => {
            // Count team members assigned to this manager
            const teamCount = members.filter(m => m.managerId === manager.id).length;
            return (
              <Card
                key={manager.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedManagerId(manager.id)}
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <Avatar className="h-12 w-12 border-2 border-[#0A0A0A] ring-1 ring-white/10 shadow-lg">
                    <AvatarImage src={manager.avatar} alt={manager.name} />
                    <AvatarFallback style={{ backgroundColor: ROLE_CONFIG.MANAGER.bg, color: ROLE_CONFIG.MANAGER.color }}>
                      {manager.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base">{manager.name}</CardTitle>
                    <CardDescription>{manager.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Manager Role
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="none"
                        className="text-[10px] px-2 py-0.5 font-black"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.2)' }}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {teamCount} {teamCount === 1 ? 'Member' : 'Members'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingProgressUserId(manager.id);
                          setShowProgressPanel(true);
                        }}
                        title="View Progress"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {managers.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <p>No managers found</p>
            </div>
          )}
        </div>
      )}

      {/* Logic for MEMBER role: Split into Managers and Clients tables */}
      {currentUser?.role === 'MEMBER' ? (
        <div className="space-y-6">
          {/* Managers Table */}
          <Card>
            <CardHeader>
              <CardTitle>My Managers</CardTitle>
              <CardDescription>Managers associated with your projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No managers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayUsers.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN').map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-[#0A0A0A] ring-1 ring-white/10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback style={{ backgroundColor: getRoleBadgeStyle(user.role).backgroundColor, color: getRoleBadgeStyle(user.role).color }}>
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            className="text-[9px] font-black tracking-widest uppercase rounded-sm"
                            style={getRoleBadgeStyle(user.role)}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle>My Clients</CardTitle>
              <CardDescription>Clients associated with your projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.filter(u => u.role === 'CLIENT').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No clients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayUsers.filter(u => u.role === 'CLIENT').map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-[#0A0A0A] ring-1 ring-white/10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback style={{ backgroundColor: getRoleBadgeStyle(user.role).backgroundColor, color: getRoleBadgeStyle(user.role).color }}>
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            className="text-[9px] font-black tracking-widest uppercase rounded-sm"
                            style={getRoleBadgeStyle(user.role)}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Existing Logic for ADMIN/MANAGER */
        selectedManagerId !== 'MANAGERS_LIST' && (selectedManagerId === 'PENDING' ? (
          <Card className="border-orange-200 bg-orange-50/10">
            <CardHeader>
              <CardTitle className="text-orange-900">Pending Approvals</CardTitle>
              <CardDescription>Review and approve new user signups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.id} className="flex items-center justify-between p-4 bg-background rounded-lg border shadow-sm">
                    <div className="flex items-center gap-4">
                      <Avatar className="border border-[#0A0A0A] ring-1 ring-white/10">
                        <AvatarFallback style={{ backgroundColor: getRoleBadgeStyle(pendingUser.role).backgroundColor, color: getRoleBadgeStyle(pendingUser.role).color }}>
                          {pendingUser.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{pendingUser.name}</p>
                        <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                      </div>
                      <Badge
                        className="text-[9px] font-black tracking-widest uppercase rounded-sm"
                        style={getRoleBadgeStyle(pendingUser.role)}
                      >
                        {pendingUser.role}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(pendingUser.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleApprove(pendingUser.id)}
                      disabled={approving === pendingUser.id}
                      size="sm"
                    >
                      {approving === pendingUser.id ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser?.role === 'ADMIN' && !['ALL', 'CLIENTS_LIST', 'MEMBERS_LIST', 'PENDING'].includes(selectedManagerId) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedManagerId('MANAGERS_LIST')}
                      className="text-muted-foreground hover:text-white"
                    >
                      ← Back
                    </Button>
                  )}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedManagerId === 'ALL'
                        ? (currentUser?.role === 'MANAGER' ? 'My Team' : 'All Members')
                        : selectedManagerId === 'CLIENTS_LIST'
                          ? 'All Clients'
                          : selectedManagerId === 'MEMBERS_LIST'
                            ? 'Team Members'
                            : `${managers.find(m => m.id === selectedManagerId)?.name}'s Team`}
                      {!['ALL', 'CLIENTS_LIST', 'MEMBERS_LIST'].includes(selectedManagerId) && managerTeam.length > 0 && (
                        <Badge variant="none" className="ml-2 text-[10px] px-2" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {managerTeam.length} {managerTeam.length === 1 ? 'Member' : 'Members'}
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </div>
                {currentUser?.role === 'ADMIN' && !['ALL', 'CLIENTS_LIST', 'MEMBERS_LIST', 'PENDING'].includes(selectedManagerId) && (
                  <Button size="sm" onClick={() => setShowAddToTeamDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add to Team
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    {selectedManagerId !== 'CLIENTS_LIST' && (
                      <TableHead>{selectedManagerId !== 'ALL' && selectedManagerId !== 'MEMBERS_LIST' ? 'Clients' : 'Managers'}</TableHead>
                    )}
                    {currentUser?.role !== 'CLIENT' && currentUser?.role !== 'MEMBER' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={selectedManagerId === 'CLIENTS_LIST' ? 4 : 5} className="text-center py-8 text-muted-foreground">
                        No team members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {currentUser?.role === 'MANAGER' && selectedManagerId === 'ALL' && user.role === 'MEMBER' && user.managerId !== currentUser.id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 -ml-2"
                                onClick={() => handleAddToTeam(user.id)}
                                title="Add to My Team"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            <Avatar className="h-8 w-8 border border-[#0A0A0A] ring-1 ring-white/10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback style={{ backgroundColor: getRoleBadgeStyle(user.role).backgroundColor, color: getRoleBadgeStyle(user.role).color }}>
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            className="text-[9px] font-black tracking-widest uppercase rounded-sm"
                            style={getRoleBadgeStyle(user.role)}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        {selectedManagerId !== 'CLIENTS_LIST' && (
                          <TableCell>
                            {selectedManagerId !== 'ALL' && selectedManagerId !== 'MEMBERS_LIST' ? (
                              (user.clients && user.clients.length > 0) ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.clients.map((client, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{client}</Badge>
                                  ))}
                                </div>
                              ) : <span className="text-muted-foreground text-xs">-</span>
                            ) : (
                              (user.managers && user.managers.length > 0) ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.managers.map(manager => (
                                    <Badge key={manager.id} variant="secondary" className="text-xs">{manager.name}</Badge>
                                  ))}
                                </div>
                              ) : <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        )}
                        {currentUser?.role !== 'CLIENT' && currentUser?.role !== 'MEMBER' && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setViewingProgressUserId(user.id);
                                  setShowProgressPanel(true);
                                }}
                                title="View Progress"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} className="text-destructive hover:text-destructive/90">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )))
      }
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Member?"
        description={`Are you sure you want to remove "${userToDelete?.name}" from the organization?`}
        confirmText="Yes, Remove"
      />

      {/* Add to Manager Team Dialog */}
      <Dialog open={showAddToTeamDialog} onOpenChange={(open) => { setShowAddToTeamDialog(open); if (!open) setAddToTeamMemberId(''); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Member to {managers.find(m => m.id === selectedManagerId)?.name}'s Team</DialogTitle>
            <DialogDescription>
              Select a member to assign to this manager. They will appear in the manager's team view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={addToTeamMemberId} onValueChange={setAddToTeamMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member..." />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter(m => m.managerId !== selectedManagerId)
                    .map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.managerId && (
                            <span className="text-xs text-muted-foreground">
                              (currently on {managers.find(mgr => mgr.id === m.managerId)?.name}'s team)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {members.filter(m => m.managerId !== selectedManagerId).length === 0 && (
                <p className="text-xs text-muted-foreground pt-1">All members are already on this manager's team.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowAddToTeamDialog(false); setAddToTeamMemberId(''); }}>
                Cancel
              </Button>
              <Button onClick={handleAdminAddToTeam} disabled={!addToTeamMemberId}>
                Add to Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MemberProgress
        userId={viewingProgressUserId}
        open={showProgressPanel}
        onOpenChange={setShowProgressPanel}
      />
    </div >
  );
};

export default Team;
