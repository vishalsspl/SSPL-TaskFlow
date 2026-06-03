import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MultiSearchableSelect } from "@/components/ui/multi-searchable-select";
import CreateProjectForm from '@/components/forms/CreateProjectForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, FolderKanban, Eye, Edit2, Trash2, Search, Filter, Layers, FileText, Users, Briefcase, Target, Calendar, FileSpreadsheet, UserPlus, RefreshCw, Mail, ShieldCheck, ShieldX, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect } from '@/components/ui/searchable-select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProjectOverview from '@/components/ProjectOverview';
import TablePagination from '@/components/ui/table-pagination';
import { DatePicker } from '@/components/ui/date-picker';
import ImportProjectsDialog from '@/components/ImportProjectsDialog';
import { Switch } from '@/components/ui/switch';
const getContrastColor = (hexColor) => {
  if (!hexColor || hexColor === '#111113') return '#FFFFFF';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const ProjectsList = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  const canCreate = user?.role === 'ADMIN' || user?.permissions?.['projects.create'];
  const canEdit = user?.role === 'ADMIN' || user?.permissions?.['projects.edit'];
  const canDelete = user?.role === 'ADMIN' || user?.permissions?.['projects.delete'];
  const canManageMembers = user?.role === 'ADMIN' || user?.permissions?.['projects.manageMembers'];

  const { setHeader, searchTerm: globalSearch, setSearchTerm: setGlobalSearch } = useHeaderStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectedOverviewProject, setSelectedOverviewProject] = useState(null);
  const [showOverviewDialog, setShowOverviewDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedProjectForMember, setSelectedProjectForMember] = useState(null);
  const [memberToAddId, setMemberToAddId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    managerId: '',
    startDate: '',
    endDate: '',
    totalBudget: '',
    status: 'PLANNING',
    category: 'INTERNAL',
    allowMemberTaskCreation: false,
    sendEmail: localStorage.getItem('preferNoEmail') !== 'true',
  });

  // Search and Filter states
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [managerFilter, setManagerFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filteredClientIds, setFilteredClientIds] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Advanced Filters State
  const [selectedManagerIds, setSelectedManagerIds] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [startDateFrom, setStartDateFrom] = useState(null);
  const [startDateTo, setStartDateTo] = useState(null);
  const [tasksMin, setTasksMin] = useState('');
  const [tasksMax, setTasksMax] = useState('');
  const [allProjects, setAllProjects] = useState([]); // For the project filter dropdown

  // Debounce global search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, page, pageSize, debouncedSearch, sortBy, sortOrder, selectedManagerIds, selectedProjectIds, startDateFrom, startDateTo, tasksMin, tasksMax]);

  useEffect(() => {
    setHeader("All Projects", "Manage and monitor all your organization's projects", true, "Search projects...");
    fetchUsers();
    fetchAllProjectsForFilter();
  }, [setHeader]);

  const fetchAllProjectsForFilter = async () => {
    try {
      const response = await api.get('/projects'); // No page param = all projects
      setAllProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch all projects for filters:', error);
    }
  };

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    try {
      const params = { page, limit: pageSize, sortBy, sortOrder };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      if (selectedManagerIds.length > 0) params.managerIds = selectedManagerIds.join(',');
      if (selectedProjectIds.length > 0) params.projectIds = selectedProjectIds.join(',');
      if (startDateFrom) params.startDateFrom = startDateFrom.toISOString();
      if (startDateTo) params.startDateTo = startDateTo.toISOString();
      if (tasksMin !== '') params.tasksMin = tasksMin;
      if (tasksMax !== '') params.tasksMax = tasksMax;

      const response = await api.get('/projects', { params });
      setProjects(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline-block" /> : <ArrowDown className="w-3 h-3 ml-1 inline-block" />;
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      clientId: project.clientId || '',
      managerId: project.managerId || '',
      startDate: project.startDate ? new Date(project.startDate) : null,
      endDate: project.endDate ? new Date(project.endDate) : null,
      totalBudget: project.totalBudget || '',
      status: project.status,
      category: project.category,
      allowMemberTaskCreation: project.allowMemberTaskCreation || false,
      sendEmail: localStorage.getItem('preferNoEmail') !== 'true',
    });
    setShowEditDialog(true);
  };

  const handleDelete = (projectId, projectName) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await api.delete(`/projects/${projectToDelete.id}`);
      toast({
        title: "Project Deleted",
        description: `Project "${projectToDelete.name}" has been removed.`,
      });
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.error || "Failed to delete project.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate budget
    if (formData.totalBudget && parseFloat(formData.totalBudget) < 0) {
      toast({
        variant: "destructive",
        title: "Invalid Budget",
        description: "Budget cannot be negative",
      });
      return;
    }

    try {
      const payload = {
        ...formData,
        category: formData.clientId ? 'CLIENT' : 'INTERNAL',
        clientId: formData.clientId || undefined,
        managerId: formData.managerId || undefined,
        totalBudget: formData.totalBudget && formData.totalBudget !== '' ? formData.totalBudget : undefined,
        startDate: formData.startDate ? format(new Date(formData.startDate), 'yyyy-MM-dd') : null,
        endDate: formData.endDate ? format(new Date(formData.endDate), 'yyyy-MM-dd') : null,
      };

      await api.put(`/projects/${editingProject.id}`, payload);
      setShowEditDialog(false);
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        clientId: '',
        managerId: '',
        startDate: '',
        endDate: '',
        totalBudget: '',
        status: 'PLANNING',
        category: 'INTERNAL',
        allowMemberTaskCreation: false,
        sendEmail: localStorage.getItem('preferNoEmail') !== 'true',
      });
      toast({
        title: "Project Updated",
        description: `Project "${editingProject.name}" has been updated successfully.`,
      });
      fetchProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.error || "Failed to update project.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    fetchProjects();
  };

  const handleAddMember = async () => {
    if (!memberToAddId) {
      toast({ title: 'Error', description: 'Please select a member to add', variant: 'destructive' });
      return;
    }
    setAddingMember(true);
    try {
      const response = await api.post(`/projects/${selectedProjectForMember.id}/members`, { userId: memberToAddId });
      
      if (response.data.alreadyAdded) {
        toast({ title: 'Info', description: 'already added' });
      } else {
        toast({ title: 'Success', description: 'Member added to project successfully' });
      }

      setShowAddMemberDialog(false);
      setMemberToAddId('');
      setSelectedProjectForMember(null);
      fetchProjects();
    } catch (error) {
      console.error('Failed to add member:', error);
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to add member', variant: 'destructive' });
    } finally {
      setAddingMember(false);
    }
  };

  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchProjectMembers = async (projectId) => {
    setLoadingMembers(true);
    try {
      const response = await api.get(`/dashboard/${projectId}`);
      setProjectMembers(response.data.workloads || []);
    } catch (error) {
      console.error('Failed to fetch project members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    try {
      await api.delete(`/projects/${selectedProjectForMember.id}/members/${userId}`);
      toast({
        title: "Member Removed",
        description: `${userName} has been removed from the project.`,
      });
      fetchProjectMembers(selectedProjectForMember.id);
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const STATUS_STYLES = {
    PLANNING: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', border: '#F59E0B60' },
    ACTIVE: { bg: 'rgba(72,161,17,0.1)', text: '#48A111', border: '#48A11160' },
    ON_HOLD: { bg: 'rgba(0,163,255,0.1)', text: '#00A3FF', border: '#00A3FF60' },
    COMPLETED: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6', border: '#8B5CF660' },
    CANCELLED: { bg: 'rgba(244,63,94,0.1)', text: '#F43F5E', border: '#F43F5E60' },
  };

  const PROJECT_COLORS = [
    '#8B5CF6', // Vibrant Purple
    '#0EA5E9', // Electric Blue
    '#10B981', // Neon Green
    '#F59E0B', // Amber
    '#F43F5E', // Rose
    '#F97316', // Orange
    '#D946EF', // Magenta/Pink
  ];

  const filteredProjects = projects.filter(project => {
    // Search, status, and category filtering now done on backend
    const matchesManager = managerFilter ? project.manager?.id === managerFilter : true;
    const matchesClient = clientFilter ? project.client?.id === clientFilter : true;

    return matchesManager && matchesClient;
  });

  const managerOptions = [
    { label: 'All Managers', value: '' },
    ...users
      .filter(u => u.role === 'MANAGER')
      .map(u => ({ label: u.name, value: u.id }))
  ];

  const clientOptions = [
    { label: 'All Clients', value: '' },
    ...users
      .filter(u => u.role === 'CLIENT')
      .filter(u => filteredClientIds ? filteredClientIds.has(u.id) : true)
      .map(u => ({ label: u.name, value: u.id }))
  ];

  const handleManagerFilterChange = async (value) => {
    setManagerFilter(value);
    setClientFilter('');
    setPage(1);

    if (!value) {
      setFilteredClientIds(null);
      return;
    }

    try {
      // Fetch all projects for this manager (no page param = flat array)
      const response = await api.get('/projects', { params: { managerId: value } });
      const projects = Array.isArray(response.data) ? response.data : response.data.data || [];
      const clientIds = new Set(
        projects.filter(p => p.clientId).map(p => p.clientId)
      );
      setFilteredClientIds(clientIds);
    } catch (error) {
      console.error('Failed to fetch manager projects:', error);
      setFilteredClientIds(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4">
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-4">
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details and settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mobile-reduce-spacing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mobile-reduce-grid">

                {/* Project Name - Full Width */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name" className="text-foreground/90 font-semibold mobile-reduce-label">Project Name <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Project Name"
                      required
                      className="!pl-10 mobile-reduce-input"
                    />
                  </div>
                </div>

                {formData.name?.toLowerCase() !== 'general' && (
                  <>
                    {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-foreground/90 font-semibold mobile-reduce-label">Status <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                    <SearchableSelect
                      value={formData.status}
                      onChange={(value) => setFormData({ ...formData, status: value })}
                      options={[
                        { label: 'Planning', value: 'PLANNING' },
                        { label: 'Active', value: 'ACTIVE' },
                        { label: 'On Hold', value: 'ON_HOLD' },
                        { label: 'Completed', value: 'COMPLETED' },
                        { label: 'Cancelled', value: 'CANCELLED' }
                      ]}
                      placeholder="Select status"
                      className="!pl-10 mobile-reduce-input"
                    />
                  </div>
                </div>

                {/* Manager */}
                <div className="space-y-2">
                  <Label htmlFor="managerId" className="text-foreground/90 font-semibold mobile-reduce-label">Manager</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                    <SearchableSelect
                      value={formData.managerId}
                      onChange={(value) => setFormData({ ...formData, managerId: value })}
                      options={users.filter(u => u.role === 'MANAGER').map(user => ({ label: user.name, value: user.id }))}
                      placeholder="Select Manager"
                      className="!pl-10 mobile-reduce-input"
                      disabled={formData.name?.toLowerCase() === 'general'}
                    />
                  </div>
                </div>

                {/* Client field - always show now that Type is gone */}
                <div className="space-y-2">
                  <Label htmlFor="clientId" className="text-foreground/90 font-semibold mobile-reduce-label">Client</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70 z-10" />
                    <SearchableSelect
                      value={formData.clientId}
                      onChange={(value) => setFormData({ ...formData, clientId: value })}
                      options={users.filter(u => u.role === 'CLIENT').map(user => ({ label: user.name, value: user.id }))}
                      placeholder="Select Client"
                      className="!pl-10 mobile-reduce-input"
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-foreground/90 font-semibold mobile-reduce-label">Start Date</Label>
                  <div className="relative">
                    <DatePicker
                      date={formData.startDate}
                      setDate={(date) => setFormData({ ...formData, startDate: date })}
                      placeholder="Select start date"
                      className="mobile-reduce-input"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-foreground/90 font-semibold mobile-reduce-label">End Date</Label>
                  <div className="relative">
                    <DatePicker
                      date={formData.endDate}
                      setDate={(date) => setFormData({ ...formData, endDate: date })}
                      placeholder="Select end date"
                      className="mobile-reduce-input"
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label htmlFor="totalBudget" className="text-foreground/90 font-semibold mobile-reduce-label">Budget (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-foreground/70">₹</span>
                    <Input
                      id="totalBudget"
                      type="number"
                      value={formData.totalBudget}
                      onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                      placeholder="0.00"
                      className="!pl-8 mobile-reduce-input"
                    />
                  </div>
                </div>
                  </>
                )}

                {/* Description - Full Width */}
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description" className="text-foreground/90 font-semibold mobile-reduce-label">Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Project description..."
                  />
                </div>
              </div>

              {/* Member Task Creation Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="allowMemberTaskCreation" className="text-sm font-semibold cursor-pointer">Allow Members to Create Tasks</Label>
                    <p className="text-xs text-muted-foreground">Members of this project can create tasks</p>
                  </div>
                </div>
                <Switch
                  id="allowMemberTaskCreation"
                  checked={formData.allowMemberTaskCreation}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowMemberTaskCreation: checked })}
                />
              </div>

              {/* Email Notification Toggle */}
              {user?.activeFeatures?.emailsupport !== false && (
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="sendEmail" className="text-sm font-semibold cursor-pointer">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Notify manager and client about this project</p>
                    </div>
                  </div>
                  <Switch
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) => {
                        setFormData({ ...formData, sendEmail: checked });
                        if (checked) {
                            localStorage.removeItem('preferNoEmail');
                        } else {
                            localStorage.setItem('preferNoEmail', 'true');
                        }
                    }}
                  />
                </div>
              )}

               <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t mt-1 px-4 sm:px-0">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto h-10 font-bold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-10 font-bold rounded-xl px-8">Update Project</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
          <div className="bg-secondary/40 p-2 rounded-2xl mb-6 mt-4 shadow-inner backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-row items-center gap-2 sm:min-w-[40px] w-full lg:w-auto">
                <Button
                  variant="outline"
                  className={`h-11 w-11 p-0 shrink-0 sm:hidden rounded-xl border-border/40 ${showFiltersMobile ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground'}`}
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                {/* Mobile Action Button */}
                {canCreate && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="w-11 h-11 p-0 shrink-0 sm:hidden rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1 justify-end">
                <div className={`flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto mt-0 ${showFiltersMobile ? 'flex' : 'hidden sm:flex'}`}>
                  <SearchableSelect
                    options={managerOptions}
                    value={managerFilter}
                    onChange={handleManagerFilterChange}
                    placeholder="All Managers"
                    searchPlaceholder="Search manager..."
                    className="w-full sm:w-[155px] h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all"
                  />
                  {user?.role !== 'CLIENT' && (
                    <SearchableSelect
                      options={clientOptions}
                      value={clientFilter}
                      onChange={setClientFilter}
                      placeholder="All Clients"
                      searchPlaceholder="Search client..."
                      className="w-full sm:w-[155px] h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all"
                      style={{ borderColor: 'var(--input-border)' }}
                    />
                  )}
                  <SearchableSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { label: 'All Status', value: 'ALL' },
                      { label: 'Planning', value: 'PLANNING' },
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'On Hold', value: 'ON_HOLD' },
                      { label: 'Completed', value: 'COMPLETED' },
                      { label: 'Cancelled', value: 'CANCELLED' }
                    ]}
                    placeholder="Status"
                    className="w-full sm:w-[155px] h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all font-semibold"
                  />

                  {/* Advanced Filters */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="h-11 rounded-xl border-border/40 hover:bg-accent/20 font-semibold text-foreground/80 whitespace-nowrap">
                        <Filter className="w-4 h-4 mr-2" />
                        Advanced Filters
                        {(selectedManagerIds.length > 0 || selectedProjectIds.length > 0 || startDateFrom || startDateTo || tasksMin || tasksMax) && (
                          <Badge className="ml-2 bg-primary text-primary-foreground h-5 px-1.5 flex items-center justify-center rounded-full text-[10px]">
                            On
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader className="mb-6">
                        <SheetTitle>Advanced Filters</SheetTitle>
                        <SheetDescription>Apply multiple filters to narrow down the projects list.</SheetDescription>
                      </SheetHeader>
                      <div className="space-y-6">
                         {/* Projects */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Specific Projects</Label>
                            <MultiSearchableSelect 
                               options={allProjects.map(p => ({ label: p.name, value: p.id }))} 
                               value={selectedProjectIds} 
                               onChange={setSelectedProjectIds} 
                               placeholder="Select projects..." 
                            />
                         </div>
                         
                         {/* Managers */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Specific Managers</Label>
                            <MultiSearchableSelect 
                               options={managerOptions} 
                               value={selectedManagerIds} 
                               onChange={setSelectedManagerIds} 
                               placeholder="Select managers..." 
                            />
                         </div>
                         
                         {/* Start Date Range */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Project Start Date Between</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <DatePicker date={startDateFrom} setDate={setStartDateFrom} placeholder="From Date" />
                                <DatePicker date={startDateTo} setDate={setStartDateTo} placeholder="To Date" />
                            </div>
                         </div>
                         
                         {/* Tasks Range */}
                         <div className="space-y-2">
                            <Label className="font-semibold text-foreground/90">Number of Tasks Between</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input type="number" value={tasksMin} onChange={(e) => setTasksMin(e.target.value)} placeholder="Min Tasks" />
                                <Input type="number" value={tasksMax} onChange={(e) => setTasksMax(e.target.value)} placeholder="Max Tasks" />
                            </div>
                         </div>

                         {/* Clear button */}
                         <Button variant="outline" className="w-full mt-4 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                             setSelectedProjectIds([]);
                             setSelectedManagerIds([]);
                             setStartDateFrom(null);
                             setStartDateTo(null);
                             setTasksMin('');
                             setTasksMax('');
                         }}>
                           Clear Advanced Filters
                         </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop Action Buttons */}
                {canCreate && (
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      className="h-11 px-5 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary font-medium transition-all flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden xl:inline">Import Excel</span>
                    </Button>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button className="min-w-[145px] px-4 h-11 rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                          <Plus className="w-4 h-4 mr-2 shrink-0" />
                          <span>New Project</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] p-0 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
                          <DialogHeader className="mb-4">
                            <DialogTitle>Create New Project</DialogTitle>
                            <DialogDescription>
                              Add a new project to your workspace. Click save when you're done.
                            </DialogDescription>
                          </DialogHeader>
                          <CreateProjectForm
                            onSuccess={handleCreateSuccess}
                            onCancel={() => setShowCreateDialog(false)}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          </div>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base font-medium text-foreground">No projects found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderLeft: '4px solid transparent' }}>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>Project Name {renderSortIcon('name')}</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('client')}>Client {renderSortIcon('client')}</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('manager')}>Manager {renderSortIcon('manager')}</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('timeline')}>Timeline {renderSortIcon('timeline')}</TableHead>
                      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && <TableHead className="cursor-pointer select-none" onClick={() => handleSort('budget')}>Budget {renderSortIcon('budget')}</TableHead>}
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('tasks')}>Tasks {renderSortIcon('tasks')}</TableHead>
                      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && <TableHead className="text-center">Member Task Access</TableHead>}
                      {(canEdit || canDelete || canManageMembers) && <TableHead className="text-center w-[140px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {filteredProjects.map((project, idx) => {
                          const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                          const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNING;
                          return (
                            <TableRow
                              key={project.id}
                              className="cursor-pointer transition-all relative group/row hover:z-50 hover:bg-accent/10"
                              style={{ borderLeft: `4px solid ${rowColor} `, background: `${rowColor} 0d` }}
                              onClick={() => {
                                setSelectedOverviewProject(project);
                                setShowOverviewDialog(true);
                              }}
                            >
                              <TableCell className="relative text-left pl-6">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground">{project.name}</p>
                                </div>
                                
                                {/* Styled Custom Tooltip */}
                                <div className={cn(
                                  "absolute left-6 opacity-0 group-hover/row:opacity-100 group-hover/row:translate-y-0 translate-y-1 pointer-events-none transition-all duration-300 z-[100] invisible group-hover/row:visible",
                                  idx === 0 ? "top-full mt-2" : "bottom-full mb-2"
                                )}>
                                  <div 
                                    className="text-xs rounded-xl shadow-2xl border border-white/10 p-3 w-max break-words whitespace-normal text-left font-bold leading-relaxed tracking-wide"
                                    style={{ backgroundColor: rowColor, color: getContrastColor(rowColor) }}
                                  >
                                    Click to view project details
                                  </div>
                                  <div 
                                    className={cn(
                                      "absolute w-3 h-3 border-white/10 rotate-45",
                                      idx === 0 ? "-top-1.5 left-6 border-t border-l" : "-bottom-1.5 left-6 border-b border-r"
                                    )}
                                    style={{ backgroundColor: rowColor }}
                                  ></div>
                                </div>
                              </TableCell>
                          <TableCell>
                            {project.client ? (
                              <div className="text-sm">
                                <p className="font-medium" style={{ color: rowColor }}>{project.client.name}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {project.manager && project.name.toLowerCase() !== 'general' ? (
                              <div className="text-sm">
                                <p className="font-medium">{project.manager.name}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {project.name.toLowerCase() === 'general' ? (
                              <div className="text-center text-muted-foreground text-xs">-</div>
                            ) : (
                              <div className="text-xs font-bold text-foreground/90 text-center">
                                <p>{project.startDate ? formatDate(project.startDate) : 'N/A'}</p>
                                <p className="text-[11px] text-foreground/70 font-medium mt-0.5">to {project.endDate ? formatDate(project.endDate) : 'Ongoing'}</p>
                              </div>
                            )}
                          </TableCell>
                          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                            <TableCell>
                              {project.totalBudget && project.name.toLowerCase() !== 'general' ? (
                                <span className="text-sm font-bold" style={{ color: rowColor }}>
                                  {formatCurrency(Number(project.totalBudget))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {project.name.toLowerCase() === 'general' ? (
                              <div className="text-muted-foreground text-xs">-</div>
                            ) : (
                              <span
                                className="text-xs font-bold px-2 py-1 rounded-full"
                                style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border} ` }}
                              >
                                {project.status.replace('_', ' ')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${rowColor} 25`, color: rowColor }}
                            >
                              {project._count.tasks}
                            </span>
                          </TableCell>
                          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                            <TableCell className="text-center">
                              {project.allowMemberTaskCreation ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-[#48A111]" />
                                  <span className="bg-[#48A111]/10 text-[#48A111] border border-[#48A111]/20 text-[9px] font-black tracking-wider uppercase py-0.5 rounded-md px-1.5 select-none">
                                    Permitted
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <ShieldX className="w-4 h-4 text-destructive" />
                                  <span className="bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-black tracking-wider uppercase py-0.5 rounded-md px-1.5 select-none">
                                    Restricted
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          )}
                          {(canEdit || canDelete || canManageMembers) && (
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {canManageMembers && project.name.toLowerCase() !== 'general' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Manage Members"
                                    onClick={() => {
                                      setSelectedProjectForMember(project);
                                      setMemberToAddId('');
                                      setShowAddMemberDialog(true);
                                      fetchProjectMembers(project.id);
                                    }}
                                  >
                                    <UserPlus className="w-4 h-4" />
                                  </Button>
                                )}
                                {canEdit && !(user?.role === 'MANAGER' && project.name.toLowerCase() === 'general') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(project)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDelete && !(user?.role === 'MANAGER' && project.name.toLowerCase() === 'general') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(project.id, project.name)}
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="sm:hidden space-y-3">
                {filteredProjects.map((project, idx) => {
                  const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                  const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNING;
                  return (
                    <div
                      key={project.id}
                      className="p-4 rounded-xl border cursor-pointer active:scale-[0.98] transition-all"
                      style={{ borderLeft: `4px solid ${rowColor}`, background: `${rowColor}0d` }}
                      onClick={() => { setSelectedOverviewProject(project); setShowOverviewDialog(true); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{project.name}</p>
                        </div>
                        {project.name.toLowerCase() !== 'general' && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
                          >
                            {project.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {project.manager && project.name.toLowerCase() !== 'general' && <span>👤 {project.manager.name}</span>}
                        {project.client && <span style={{ color: rowColor }}>🏢 {project.client.name}</span>}
                        <span style={{ color: rowColor }}>📋 {project._count.tasks} tasks</span>
                        {project.totalBudget && project.name.toLowerCase() !== 'general' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                          <span className="font-bold" style={{ color: rowColor }}>{formatCurrency(Number(project.totalBudget))}</span>
                        )}
                      </div>
                      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {project.allowMemberTaskCreation ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-[#48A111]" />
                              <span className="text-[9px] font-black tracking-wider uppercase text-[#48A111]">Permitted</span>
                            </>
                          ) : (
                            <>
                              <ShieldX className="w-3.5 h-3.5 text-destructive" />
                              <span className="text-[9px] font-black tracking-wider uppercase text-destructive">Restricted</span>
                            </>
                          )}
                        </div>
                      )}
                      {(canEdit || canDelete || canManageMembers) && (
                        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                          {canManageMembers && project.name.toLowerCase() !== 'general' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => {
                                setSelectedProjectForMember(project);
                                setMemberToAddId('');
                                setShowAddMemberDialog(true);
                                fetchProjectMembers(project.id);
                              }}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          )}
                          {canEdit && !(user?.role === 'MANAGER' && project.name.toLowerCase() === 'general') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(project)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && !(user?.role === 'MANAGER' && project.name.toLowerCase() === 'general') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => handleDelete(project.id, project.name)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Project?"
        description={`Are you sure you want to delete "${projectToDelete?.name}"? This will also remove all related tasks and data.`}
        confirmText="Yes, Delete"
      />

      <Dialog open={showOverviewDialog} onOpenChange={setShowOverviewDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
              <div className="pr-12 relative">
                <DialogTitle className="text-xl sm:text-2xl font-bold">Project Quick Overview</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  Real-time snapshot of mission progress and team workload.
                </DialogDescription>
                <Button
                  onClick={() => navigate(`/projects/${selectedOverviewProject?.id}`)}
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 sm:-right-2 top-10 sm:top-6 text-muted-foreground hover:text-primary transition-all rounded-full h-8 w-8"
                  title="View Full Details"
                >
                  <Eye className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="py-4">
              {selectedOverviewProject && (
                <ProjectOverview projectId={selectedOverviewProject.id} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ImportProjectsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchProjects}
      />

      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="w-[95vw] sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 sm:p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-black Montserrat">
              <Users className="w-5 h-5 text-primary" />
              Manage Members
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm Montserrat font-medium">
              View or add members to <strong>{selectedProjectForMember?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-5 sm:p-6 pt-4 space-y-5">
            {/* Current Members Section */}
            <div>
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat mb-3">Current Members</h4>
              {loadingMembers ? (
                <div className="flex justify-center py-4"><RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : projectMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No members assigned yet.</p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {projectMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-xl border border-border bg-card/30 group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary Montserrat">
                          {m.user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold Montserrat truncate">{m.user.name}</p>
                          <p className="text-[10px] text-muted-foreground Montserrat truncate">{m.user.email}</p>
                        </div>
                      </div>
                      {m.user.id !== selectedProjectForMember?.managerId && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Member Section */}
            <div className="pt-5 border-t border-border/50">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest Montserrat mb-3">Add New Member</h4>
              <div className="flex flex-col gap-3">
                <SearchableSelect
                  value={memberToAddId}
                  onChange={setMemberToAddId}
                  options={users
                    .filter(u => (u.role === 'MEMBER' || u.role === 'MANAGER') && !projectMembers.some(pm => pm.user.id === u.id))
                    .map(u => ({
                      label: `${u.name} (${u.role})`,
                      value: u.id
                    }))}
                  placeholder="Select a member..."
                />
                <Button onClick={handleAddMember} disabled={addingMember || !memberToAddId} className="w-full rounded-xl py-6 font-black Montserrat shadow-lg shadow-primary/20">
                  {addingMember ? 'Adding...' : 'Add to Project'}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="px-5 sm:px-6 pb-6">
            <Button variant="ghost" onClick={() => setShowAddMemberDialog(false)} className="rounded-xl w-full text-xs font-bold Montserrat text-muted-foreground hover:bg-secondary">
              Close Panel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsList;