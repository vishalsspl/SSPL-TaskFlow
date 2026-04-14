import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
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
import { Users, Mail, Shield, Plus, Edit2, Trash2, UserCheck, Clock, Layers, Lock, User, Search, BarChart2, FileSpreadsheet } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import MemberProgress from '@/components/MemberProgress';
import TablePagination from '@/components/ui/table-pagination';
import UserForm from '@/components/forms/UserForm';
import { SearchableSelect } from '@/components/ui/searchable-select';
import UpgradePlanModal from '@/components/ui/UpgradePlanModal';
import ImportUsersDialog from '@/components/ImportUsersDialog';

const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

const Team = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const { setHeader, searchTerm: globalSearch } = useHeaderStore();
  const [users, setUsers] = useState([]);
  const [allMembers, setAllMembers] = useState([]); // Kept for manager card team counts
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Selection State: 'ALL' or managerId
  const [selectedManagerId, setSelectedManagerId] = useState('ALL');
  const [managerTeam, setManagerTeam] = useState([]);
  const [managerTeamCounts, setManagerTeamCounts] = useState({}); // { managerId: count }
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddToTeamDialog, setShowAddToTeamDialog] = useState(false);
  const [addToTeamMemberId, setAddToTeamMemberId] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Progress Panel State
  const [viewingProgressUserId, setViewingProgressUserId] = useState(null);
  const [showProgressPanel, setShowProgressPanel] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
    password: generatePassword(),
    sendEmail: true,
  });
  const [roleCounts, setRoleCounts] = useState({ ALL: 0, MANAGER: 0, CLIENT: 0, MEMBER: 0 });

  // Debounce global search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  useEffect(() => {
    setHeader("Team Management", "Manage your organization's team members and structure", true, "Search by name or email...");
    if (currentUser?.role === 'MANAGER') {
      setSelectedManagerId(currentUser.id);
    }
    fetchUsers();
    fetchAllMembers();
    if (currentUser?.role === 'ADMIN') {
      fetchPendingUsers();
    }
  }, [currentUser, setHeader]);

  useEffect(() => {
    if (selectedManagerId !== 'ALL' && selectedManagerId !== 'PENDING' && selectedManagerId !== 'MANAGERS_LIST' && selectedManagerId !== 'CLIENTS_LIST' && selectedManagerId !== 'MEMBERS_LIST') {
      fetchManagerTeam(selectedManagerId, debouncedSearch);
    } else {
      setManagerTeam([]);
    }
  }, [selectedManagerId, debouncedSearch]);

  // Re-fetch when pagination/search/tab changes (selectedManagerId triggers roleFilter)
  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, debouncedSearch, selectedManagerId]);

  // When MANAGERS_LIST is active AND users have loaded, fetch team counts for each manager
  useEffect(() => {
    if (selectedManagerId === 'MANAGERS_LIST' && users.length > 0) {
      fetchManagerTeamCounts(users);
    }
  }, [selectedManagerId, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };

      // Determine if we need to filter by role on the backend
      if (selectedManagerId === 'MANAGERS_LIST') params.roleFilter = 'MANAGER';
      else if (selectedManagerId === 'CLIENTS_LIST') params.roleFilter = 'CLIENT';
      else if (selectedManagerId === 'MEMBERS_LIST') params.roleFilter = 'MEMBER';

      if (currentUser?.role === 'MANAGER') params.teamOnly = 'true';
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await api.get('/users', { params });
      // Keep only non-admin users if we aren't explicitly asking for a single manager's team
      const allUsers = response.data.data.filter(u => u.role !== 'ADMIN');
      setUsers(allUsers);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.total);
      if (response.data.pagination.counts) {
        setRoleCounts(response.data.pagination.counts);
      }
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

  // Fetch ALL members (no pagination) separately so manager card "team count" is always accurate
  const fetchAllMembers = async () => {
    try {
      const response = await api.get('/users', { params: { roleFilter: 'MEMBER' } });
      // Non-paginated response is an array
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setAllMembers(data.filter(u => u.isApproved));
    } catch (error) {
      console.error('Failed to fetch all members:', error);
    }
  };

  const fetchManagerTeam = async (managerId, search = '') => {
    setLoadingTeam(true);
    try {
      const params = {};
      if (search) params.search = search;
      const response = await api.get(`/users/${managerId}/team`, { params });
      setManagerTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch manager team:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Batch-fetch team counts for all managers in the MANAGERS_LIST view
  const fetchManagerTeamCounts = async (managers) => {
    if (!managers || managers.length === 0) return;
    const counts = {};
    await Promise.all(
      managers.map(async (mgr) => {
        try {
          const res = await api.get(`/users/${mgr.id}/team`);
          counts[mgr.id] = Array.isArray(res.data) ? res.data.length : 0;
        } catch {
          counts[mgr.id] = 0;
        }
      })
    );
    setManagerTeamCounts(counts);
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
      fetchAllMembers();
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

    if (!/^[a-zA-Z0-9\s]+$/.test(formData.name)) {
      toast({
        title: "Validation Error",
        description: "Member name cannot contain special characters. Only alphanumeric characters and spaces are allowed.",
        variant: "destructive",
      });
      return;
    }

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
          sendEmail: formData.sendEmail,
        });
      }

      setShowDialog(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'MEMBER',
        password: generatePassword(),
        sendEmail: true,
      });
      fetchUsers();
      fetchAllMembers();
      toast({
        title: "User Saved",
        description: editingUser ? "Member details updated successfully." : "New member invited successfully.",
      });
    } catch (error) {
      console.error('Failed to save user:', error);
      if (error.response?.status === 403 && error.response?.data?.error?.includes('limit reached')) {
        setShowUpgradeModal(true);
      } else {
        toast({
          title: "Save Failed",
          description: error.response?.data?.error || "Failed to save user details.",
          variant: "destructive",
        });
      }
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
      sendEmail: true,
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
      fetchAllMembers();
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
      password: generatePassword(),
      sendEmail: true,
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

  // Decide which users to show.
  // For MANAGERS_LIST, CLIENTS_LIST, MEMBERS_LIST, ALL:
  //   the backend already sends the right role-filtered users via `roleFilter`.
  //   We just exclude the currently logged-in user.
  // For a specific manager's team drill-down, use managerTeam.
  let displayUsers = users.filter(u => u.id !== currentUser?.id);
  if (selectedManagerId !== 'ALL' && selectedManagerId !== 'PENDING' &&
    selectedManagerId !== 'MANAGERS_LIST' && selectedManagerId !== 'CLIENTS_LIST' && selectedManagerId !== 'MEMBERS_LIST') {
    displayUsers = managerTeam.filter(u => u.id !== currentUser?.id);
  }

  // Filter for Manager: Show only MEMBERS in "All Members" view
  if (currentUser?.role === 'MANAGER' && selectedManagerId === 'ALL') {
    displayUsers = displayUsers.filter(u => u.role === 'MEMBER');
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4">
      {/* ─── Header Section (Fixed) ─── */}
      <div className="flex-none px-2 sm:px-2 space-y-4">
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
              <DialogHeader className="mb-2 sm:mb-4">
                <DialogTitle>{editingUser ? 'Edit Team Member' : 'Add New Member'}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {editingUser
                    ? "Update the user's role and details. Changing the role will affect their permissions immediately."
                    : "Enter the member's details and set a password. They will receive an email with their credentials."}
                </DialogDescription>
              </DialogHeader>
              <UserForm
                formData={formData}
                setFormData={setFormData}
                editingUser={editingUser}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Filter Toolbar ─── */}
        <div className="bg-secondary/40 px-2 py-3 rounded-2xl mb-1 shadow-inner backdrop-blur-sm mt-2" style={{ border: '1px solid var(--table-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
              {/* Mobile Add Member Button */}
              {currentUser?.role === 'ADMIN' && (
                <Button
                  onClick={() => {
                        setEditingUser(null);
                        setFormData({
                            name: '',
                            email: '',
                            role: 'MEMBER',
                            password: generatePassword(),
                            sendEmail: true,
                        });
                        setShowDialog(true);
                  }}
                  className="w-11 h-11 p-0 shrink-0 sm:hidden rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              {currentUser?.role === 'ADMIN' && (
                <Button
                  onClick={() => setShowImportDialog(true)}
                  variant="outline"
                  className="w-11 h-11 p-0 shrink-0 sm:hidden rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary"
                  title="Import from Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filter tabs and Action Button — right side */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                  <>
                    <Button
                      variant="none"
                      onClick={() => { setPage(1); setSelectedManagerId('ALL'); }}
                      className={`group gap-2 h-11 w-full sm:w-[145px] px-2 sm:px-4 justify-center sm:justify-start rounded-xl font-medium transition-all duration-300 text-sm shrink-0 border ${selectedManagerId === 'ALL'
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                        : 'bg-secondary/40 text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'}`}
                      style={selectedManagerId !== 'ALL' ? { borderColor: 'var(--input-border)' } : {}}
                    >
                      <Layers className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span className="truncate">All</span>
                      <Badge variant="none" className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full ${selectedManagerId === 'ALL' ? 'bg-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground'}`}>{roleCounts.ALL}</Badge>
                    </Button>

                    {currentUser?.role === 'ADMIN' && (
                      <Button
                        variant="none"
                        onClick={() => { setPage(1); setSelectedManagerId('MANAGERS_LIST'); }}
                        className={`group gap-2 h-11 w-full sm:w-[145px] px-2 sm:px-4 justify-center sm:justify-start rounded-xl font-medium transition-all duration-300 text-sm shrink-0 border ${selectedManagerId === 'MANAGERS_LIST'
                          ? 'bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]'
                          : 'bg-secondary/40 text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'}`}
                      >
                        <Shield className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span className="truncate">Managers</span>
                        <Badge variant="none" className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full ${selectedManagerId === 'MANAGERS_LIST' ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-muted/30 text-muted-foreground'}`}>{roleCounts.MANAGER}</Badge>
                      </Button>
                    )}
                    {currentUser?.role === 'ADMIN' && (
                      <Button
                        variant="none"
                        onClick={() => { setPage(1); setSelectedManagerId('CLIENTS_LIST'); }}
                        className={`group gap-2 h-11 w-full sm:w-[145px] px-2 sm:px-4 justify-center sm:justify-start rounded-xl font-medium transition-all duration-300 text-sm shrink-0 border ${selectedManagerId === 'CLIENTS_LIST'
                          ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                          : 'bg-secondary/40 text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'}`}
                      >
                        <Users className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span className="truncate">Clients</span>
                        <Badge variant="none" className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full ${selectedManagerId === 'CLIENTS_LIST' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-muted/30 text-muted-foreground'}`}>{roleCounts.CLIENT}</Badge>
                      </Button>
                    )}
                    <Button
                      variant="none"
                      onClick={() => { setPage(1); setSelectedManagerId('MEMBERS_LIST'); }}
                      className={`group gap-2 h-11 w-full sm:w-[145px] px-2 sm:px-4 justify-center sm:justify-start rounded-xl font-medium transition-all duration-300 text-sm shrink-0 border ${selectedManagerId === 'MEMBERS_LIST'
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-secondary/40 text-muted-foreground border-transparent hover:bg-secondary/60 hover:text-foreground'}`}
                    >
                      <User className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span className="truncate">Members</span>
                      <Badge variant="none" className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full ${selectedManagerId === 'MEMBERS_LIST' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-muted/30 text-muted-foreground'}`}>{roleCounts.MEMBER}</Badge>
                    </Button>
                    {(pendingUsers.length > 0 || currentUser?.role === 'ADMIN') && (
                      <Button
                        variant="none"
                        onClick={() => { setPage(1); setSelectedManagerId('PENDING'); }}
                        className={`group gap-2 h-11 w-full sm:w-[145px] px-2 sm:px-4 justify-center sm:justify-start rounded-xl font-medium transition-all duration-300 text-sm shrink-0 border ${selectedManagerId === 'PENDING'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                          : 'bg-secondary/40 text-orange-500/60 border-transparent hover:bg-secondary/60 hover:text-orange-500'}`}
                      >
                        <UserCheck className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span className="truncate">Pending</span>
                        <Badge variant="none" className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full ${selectedManagerId === 'PENDING' ? 'bg-orange-500/20 text-orange-500' : 'bg-muted/30 text-muted-foreground'}`}>{pendingUsers.length}</Badge>
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Desktop Add Member + Import Buttons — Far Right */}
              {currentUser?.role === 'ADMIN' && (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    onClick={() => setShowImportDialog(true)}
                    variant="outline"
                    className="h-11 px-5 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary font-medium transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Import Excel</span>
                  </Button>
                  <Button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({
                            name: '',
                            email: '',
                            role: 'MEMBER',
                            password: generatePassword(),
                            sendEmail: true,
                        });
                        setShowDialog(true);
                    }}
                    className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Member</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Scrollable Content Area ─── */}
      <div className="flex-1 overflow-visible px-2 sm:px-2">
        <div className="space-y-4 pb-24">

          {selectedManagerId === 'MANAGERS_LIST' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map(manager => {
                const teamCount = (managerTeamCounts[manager.id] ?? allMembers.filter(m => m.managerId === manager.id).length);
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
                            className="text-[10px] px-2 py-0.5 font-black bg-accent/20"
                            style={{ color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
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
              {users.length === 0 && (
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
                      <div key={pendingUser.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-background rounded-lg border shadow-sm">
                        <div className="flex items-center gap-3 flex-wrap">
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
                          className="w-full sm:w-auto"
                        >
                          {approving === pendingUser.id ? 'Approving...' : 'Approve'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentUser?.role === 'ADMIN' && !['ALL', 'CLIENTS_LIST', 'MEMBERS_LIST', 'PENDING'].includes(selectedManagerId) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedManagerId('MANAGERS_LIST')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ← Back
                        </Button>
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                            {selectedManagerId === 'ALL'
                              ? (currentUser?.role === 'MANAGER' ? 'My Team' : 'All Members')
                              : selectedManagerId === 'CLIENTS_LIST'
                                ? 'All Clients'
                                : selectedManagerId === 'MEMBERS_LIST'
                                  ? 'Team Members'
                                  : `${allMembers.find(m => m.id === selectedManagerId)?.name || 'Manager'}'s Team`}
                          </span>
                          {!['ALL', 'CLIENTS_LIST', 'MEMBERS_LIST'].includes(selectedManagerId) && managerTeam.length > 0 && (
                            <Badge variant="none" className="text-[10px] px-2 whitespace-nowrap" style={{ background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.2)' }}>
                              {managerTeam.length} {managerTeam.length === 1 ? 'Member' : 'Members'}
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                    {currentUser?.role === 'ADMIN' && !['ALL', 'CLIENTS_LIST', 'MEMBERS_LIST', 'PENDING'].includes(selectedManagerId) && (
                      <Button size="sm" onClick={() => setShowAddToTeamDialog(true)} className="flex items-center justify-center p-2 sm:px-3 sm:py-2">
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Add to Team</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Desktop Table */}
                    <div className="hidden sm:block">
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
                                      {user.role !== 'CLIENT' && (
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
                                      )}
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
                    </div>

                    {/* Mobile Card List */}
                    <div className="sm:hidden space-y-3 p-1">
                      {displayUsers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">No team members found</div>
                      ) : (
                        displayUsers.map((user) => (
                          <div key={user.id} className="p-4 rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border ring-1 ring-white/10 shrink-0">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback style={{ backgroundColor: getRoleBadgeStyle(user.role).backgroundColor, color: getRoleBadgeStyle(user.role).color }}>
                                  {user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                              <Badge
                                className="text-[9px] font-black tracking-widest uppercase rounded-sm shrink-0"
                                style={getRoleBadgeStyle(user.role)}
                              >
                                {user.role}
                              </Badge>
                            </div>
                            {currentUser?.role !== 'CLIENT' && currentUser?.role !== 'MEMBER' && (
                              <div className="flex gap-2 mt-3">
                                {user.role !== 'CLIENT' && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary" onClick={() => { setViewingProgressUserId(user.id); setShowProgressPanel(true); }}>
                                    <BarChart2 className="w-3 h-3 mr-1" /> Progress
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleEdit(user)}>
                                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => handleDelete(user)}>
                                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                  />
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
                  <SearchableSelect
                    value={addToTeamMemberId}
                    onChange={setAddToTeamMemberId}
                    placeholder="Choose a team member..."
                    searchPlaceholder="Search members..."
                    options={allMembers
                      .filter(m => m.managerId !== selectedManagerId)
                      .map(m => {
                        let extra = '';
                        if (m.managerId) {
                          const mgrName = managers.find(mgr => mgr.id === m.managerId)?.name;
                          if (mgrName) extra = ` (currently on ${mgrName}'s team)`;
                        }
                        return { label: m.name + extra, value: m.id };
                      })
                    }
                  />
                  {allMembers.filter(m => m.managerId !== selectedManagerId).length === 0 && (
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

        </div>
      </div>

      <MemberProgress
        userId={viewingProgressUserId}
        open={showProgressPanel}
        onOpenChange={setShowProgressPanel}
      />
      <UpgradePlanModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        limitType="users"
      />
      <ImportUsersDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={() => {
          fetchUsers();
          fetchAllMembers();
        }}
      />
    </div>
  );
};

export default Team;