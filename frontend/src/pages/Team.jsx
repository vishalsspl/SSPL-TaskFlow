import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
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
import { Users, Mail, Shield, Plus, Edit2, Trash2, UserCheck, Clock, Layers, Lock, User, Search } from 'lucide-react';

const Team = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Selection State: 'ALL' or managerId
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');
  const [managerTeam, setManagerTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      const response = await api.get('/users');
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
      fetchUsers(); // Refresh approved users list
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
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
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Failed to save user: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddToTeam = async (userId) => {
    try {
      await api.put(`/users/${userId}`, { managerId: currentUser.id });
      // Refresh the full user list (updates + button state) AND the manager's team list (updates team count)
      await fetchUsers();
      if (currentUser?.id) fetchManagerTeam(currentUser.id);
    } catch (error) {
      console.error('Failed to add user to team:', error);
      alert('Failed to add user to team: ' + (error.response?.data?.error || error.message));
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

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user: ' + (error.response?.data?.error || error.message));
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

  const getRoleBadgeColor = (role) => {
    const colors = {
      ADMIN: 'default', // primary
      MANAGER: 'secondary', // secondary
      MEMBER: 'outline', // outline
      CLIENT: 'secondary',
    };
    return colors[role] || 'outline';
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
          <h2 className="text-3xl font-bold tracking-tight">Team Members</h2>
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
                : "New members will receive an email invitation to set up their account."}
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

            {editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave empty to keep current"
                    className="pl-9"
                  />
                </div>
              </div>
            )}

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
                  variant={selectedManagerId === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setSelectedManagerId('ALL')}
                  className="gap-2"
                >
                  <Layers className="w-4 h-4" />
                  All Members
                  <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary-foreground/80 hover:bg-primary/30">{users.length}</Badge>
                </Button>
                {currentUser?.role === 'MANAGER' && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'MEMBER' }));
                      setShowDialog(true);
                    }}
                    title="Add New Member"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {currentUser?.role === 'ADMIN' && (
                <Button
                  variant={selectedManagerId === 'MANAGERS_LIST' ? 'default' : 'outline'}
                  onClick={() => setSelectedManagerId('MANAGERS_LIST')}
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Managers
                  <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary-foreground/80 hover:bg-primary/30">{managers.length}</Badge>
                </Button>
              )}
              <Button
                variant={selectedManagerId === 'CLIENTS_LIST' ? 'default' : 'outline'}
                onClick={() => setSelectedManagerId('CLIENTS_LIST')}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                Clients
                <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary-foreground/80 hover:bg-primary/30">{clients.length}</Badge>
              </Button>
              <Button
                variant={selectedManagerId === 'MEMBERS_LIST' ? 'default' : 'outline'}
                onClick={() => setSelectedManagerId('MEMBERS_LIST')}
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Members
                <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary-foreground/80 hover:bg-primary/30">{members.length}</Badge>
              </Button>
              {pendingUsers.length > 0 && (
                <Button
                  variant={selectedManagerId === 'PENDING' ? 'destructive' : 'outline'}
                  onClick={() => setSelectedManagerId('PENDING')}
                  className="gap-2 border-orange-200 hover:bg-orange-50 text-orange-700 hover:text-orange-800"
                >
                  <UserCheck className="w-4 h-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1 bg-white/20 text-inherit">{pendingUsers.length}</Badge>
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
          {managers.map(manager => (
            <Card
              key={manager.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedManagerId(manager.id)}
            >
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={manager.avatar} alt={manager.name} />
                  <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{manager.name}</CardTitle>
                  <CardDescription>{manager.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Manager Role
                </div>
              </CardContent>
            </Card>
          ))}
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
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeColor(user.role)}>{user.role}</Badge>
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
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeColor(user.role)}>{user.role}</Badge>
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
                      <Avatar>
                        <AvatarFallback>{pendingUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{pendingUser.name}</p>
                        <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                      </div>
                      <Badge variant={getRoleBadgeColor(pendingUser.role)}>{pendingUser.role}</Badge>
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
              <CardTitle>
                {selectedManagerId === 'ALL'
                  ? 'All Members'
                  : selectedManagerId === 'CLIENTS_LIST'
                    ? 'All Clients'
                    : selectedManagerId === 'MEMBERS_LIST'
                      ? 'Team Members'
                      : `${managers.find(m => m.id === selectedManagerId)?.name}'s Team`}
              </CardTitle>
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
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeColor(user.role)}>{user.role}</Badge>
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
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} className="text-destructive hover:text-destructive/90">
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
    </div >
  );
};

export default Team;
