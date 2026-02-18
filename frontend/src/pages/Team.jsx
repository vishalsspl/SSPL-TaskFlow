import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Mail, Shield, Plus, X, Edit2, Trash2, UserCheck, Clock, Layers, Lock, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const Team = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Selection State: 'ALL' or managerId
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');
  const [managerTeam, setManagerTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
    password: '',
  });

  useEffect(() => {
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

      setShowForm(false);
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

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      isApproved: user.isApproved,
    });
    setShowForm(true);
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
    setShowForm(false);
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
      ADMIN: 'bg-purple-100 text-purple-700',
      MANAGER: 'bg-blue-100 text-blue-700',
      MEMBER: 'bg-green-100 text-green-700',
      CLIENT: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || colors.MEMBER;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading team...</div>
      </div>
    );
  }

  // Derived state for managers
  const managers = users.filter(u => u.role === 'MANAGER');

  // Decide which users to show
  let displayUsers = users;
  if (selectedManagerId === 'MANAGERS_LIST') {
    displayUsers = managers;
  } else if (selectedManagerId !== 'ALL' && selectedManagerId !== 'PENDING') {
    displayUsers = managerTeam;
  }

  return (
    <div className="p-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your organization's team members and structure
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-105">
            <Plus className="w-4 h-4 mr-2" /> Add Member
          </Button>
        </div>

        {/* Manager Navigation Bar */}
        <div className="mb-6 overflow-x-auto pb-4 pt-1 flex gap-4 no-scrollbar">
          <button
            onClick={() => setSelectedManagerId('ALL')}
            className={`
               flex items-center gap-3 px-5 py-3 rounded-xl border transition-all whitespace-nowrap min-w-fit
               ${selectedManagerId === 'ALL'
                ? "bg-primary text-white border-primary shadow-lg ring-2 ring-primary/20 ring-offset-2"
                : "bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:bg-gray-50 shadow-sm"}
             `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${selectedManagerId === 'ALL' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}
            `}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold">All Members</span>
              <span className={`text-xs opacity-90 block ${selectedManagerId === 'ALL' ? "text-white/80" : "text-gray-500"}`}>
                {users.length} Users
              </span>
            </div>
          </button>

          <button
            onClick={() => setSelectedManagerId('MANAGERS_LIST')}
            className={`
               flex items-center gap-3 px-5 py-3 rounded-xl border transition-all whitespace-nowrap min-w-fit
               ${selectedManagerId === 'MANAGERS_LIST'
                ? "bg-primary text-white border-primary shadow-lg ring-2 ring-primary/20 ring-offset-2"
                : "bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:bg-gray-50 shadow-sm"}
             `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${selectedManagerId === 'MANAGERS_LIST' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}
            `}>
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold">Managers</span>
              <span className={`text-xs opacity-90 block ${selectedManagerId === 'MANAGERS_LIST' ? "text-white/80" : "text-gray-500"}`}>
                {managers.length} Users
              </span>
            </div>
          </button>

          {/* Pending Users Tab (Admin Only) */}
          {currentUser?.role === 'ADMIN' && pendingUsers.length > 0 && (
            <button
              onClick={() => setSelectedManagerId('PENDING')}
              className={`
                flex items-center gap-3 px-5 py-3 rounded-xl border transition-all whitespace-nowrap min-w-fit
                ${selectedManagerId === 'PENDING'
                  ? "bg-orange-500 text-white border-orange-600 shadow-lg ring-2 ring-orange-500/20 ring-offset-2"
                  : "bg-white text-gray-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50 shadow-sm"}
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                ${selectedManagerId === 'PENDING' ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"}
              `}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold">Pending</span>
                <span className={`text-xs opacity-90 block ${selectedManagerId === 'PENDING' ? "text-white/80" : "text-orange-600"}`}>
                  {pendingUsers.length} Requests
                </span>
              </div>
            </button>
          )}


        </div>

        {/* Add/Edit Form Modal */}
        <Modal
          isOpen={showForm}
          onClose={handleCancel}
          title={editingUser ? 'Edit Team Member' : 'Add New Member'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6 flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Member Access Control</p>
                <p className="opacity-90">
                  {editingUser
                    ? "Update the user's role and details. Changing the role will affect their permissions immediately."
                    : "New members will receive an email invitation to set up their account."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">Full Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                    disabled={!!editingUser}
                    className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">Role <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="MEMBER">Member</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
              </div>

              {editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave empty to keep current"
                      className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-2">
              <Button type="button" variant="outline" onClick={handleCancel} className="hover:bg-gray-50">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-md">
                {editingUser ? 'Update Member' : 'Add Member'}
              </Button>
            </div>
          </form>
        </Modal>

        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedManagerId === 'MANAGERS_LIST' && (
            <div className="h-full overflow-y-auto">
              <div className="mb-6 animate-in fade-in px-1">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                    <Shield className="w-4 h-4" />
                  </span>
                  Managers
                </h2>
                <p className="text-sm text-gray-500 ml-10">
                  Select a manager to view their team
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                {managers.map(manager => (
                  <Card
                    key={manager.id}
                    className="cursor-pointer hover:shadow-lg transition-all border-none shadow-sm bg-white group"
                    onClick={() => setSelectedManagerId(manager.id)}
                  >
                    <CardContent className="p-6 flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {manager.avatar ? (
                          <img src={manager.avatar} alt={manager.name} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                          manager.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{manager.name}</h3>
                        <p className="text-sm text-gray-500">{manager.email}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-400">
                          Click to view team
                          <Layers className="w-3 h-3 ml-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {managers.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
                    <Shield className="w-12 h-12 mb-4 text-gray-300" />
                    <p className="font-medium">No managers found</p>
                    <p className="text-sm">Assign the Manager role to users to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedManagerId !== 'ALL' && selectedManagerId !== 'PENDING' && selectedManagerId !== 'MANAGERS_LIST' && (
            <div className="mb-4 animate-in fade-in px-1">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  {managers.find(m => m.id === selectedManagerId)?.name.charAt(0)}
                </span>
                {managers.find(m => m.id === selectedManagerId)?.name}'s Team
              </h2>
              <p className="text-sm text-gray-500 ml-10">
                Viewing members managed by this user
              </p>
            </div>
          )}

          {selectedManagerId !== 'MANAGERS_LIST' && (selectedManagerId === 'PENDING' ? (
            <Card className="flex-1 overflow-hidden flex flex-col border-none shadow-sm bg-orange-50/50">
              <CardHeader className="bg-orange-50/50 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-orange-900">
                      <UserCheck className="w-5 h-5 mr-2" />
                      Pending Approvals
                    </CardTitle>
                    <p className="text-sm text-orange-700 mt-1">
                      Review and approve new user signups
                    </p>
                  </div>
                  <Badge className="bg-orange-200 text-orange-900 border-none">
                    {pendingUsers.length} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 overflow-auto">
                <div className="space-y-3">
                  {pendingUsers.map((pendingUser) => (
                    <div
                      key={pendingUser.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-lg font-bold">
                          {pendingUser.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{pendingUser.name}</p>
                          <p className="text-sm text-gray-600">{pendingUser.email}</p>
                        </div>
                        <Badge className={getRoleBadgeColor(pendingUser.role)}>
                          {pendingUser.role}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(pendingUser.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleApprove(pendingUser.id)}
                        disabled={approving === pendingUser.id}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white border-none"
                      >
                        {approving === pendingUser.id ? 'Approving...' : 'Approve'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 overflow-hidden flex flex-col border shadow-sm bg-white">
              <CardContent className="p-0 flex-1 overflow-auto">
                {loadingTeam ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p>Loading team members...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50/95 backdrop-blur z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[300px]">Member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>{selectedManagerId !== 'ALL' ? 'Clients' : 'Managers'}</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20">
                            <div className="flex flex-col items-center justify-center text-gray-500">
                              <Users className="w-12 h-12 mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No team members found</p>
                              <p className="text-sm">{selectedManagerId === 'ALL' ? "Try adding some members to your organization." : "This manager doesn't have any active team members yet."}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayUsers.map((user) => (
                          <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {user.avatar ? (
                                  <img
                                    className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
                                    src={user.avatar}
                                    alt={user.name}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {user.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-gray-900">{user.name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-gray-600">
                                <Mail className="w-4 h-4 mr-2 opacity-70" />
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getRoleBadgeColor(user.role)} shadow-sm border-0`}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {selectedManagerId !== 'ALL' ? (
                                  // Show Clients for Manager View
                                  (user.clients && user.clients.length > 0) ? (
                                    user.clients.map((client, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                        {client}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )
                                ) : (
                                  // Show Managers for All Members View
                                  (user.managers && user.managers.length > 0) ? (
                                    user.managers.map(manager => (
                                      <span key={manager.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                        {manager.name}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                                  className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 text-gray-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Team;
