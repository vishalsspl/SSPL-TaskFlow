import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateProjectForm from '@/components/forms/CreateProjectForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, FolderKanban, Eye, Edit2, Trash2, Search, Filter, Layers, FileText, Users, Briefcase, Target, Calendar, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
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

const ProjectsList = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
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
  }, [statusFilter, page, pageSize, debouncedSearch]);

  useEffect(() => {
    setHeader("All Projects", "Manage and monitor all your organization's projects", true, "Search projects...");
    fetchUsers();
  }, [setHeader]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    try {
      const params = { page, limit: pageSize };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
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
        startDate: formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : null,
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

              <div className="flex justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t mt-1">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="hover:bg-gray-50 h-8 sm:h-10 text-xs sm:text-sm">
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-md h-8 sm:h-10 text-xs sm:text-sm px-6">Update Project</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-2 sm:px-4">
          <div className="bg-secondary/40 p-2 rounded-2xl mb-6 mt-4 shadow-inner backdrop-blur-sm" style={{ border: '1px solid var(--table-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2 flex-1 sm:min-w-[200px] w-full sm:w-auto">
                <Button
                  variant="outline"
                  className={`h-11 w-11 p-0 shrink-0 sm:hidden rounded-xl border-border/40 ${showFiltersMobile ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground'}`}
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                {/* Mobile Action Button */}
                {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="w-11 h-11 p-0 shrink-0 sm:hidden rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className={`flex-col sm:flex-row flex-wrap items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 ${showFiltersMobile ? 'flex' : 'hidden sm:flex'}`}>
                  <SearchableSelect
                    options={managerOptions}
                    value={managerFilter}
                    onChange={handleManagerFilterChange}
                    placeholder="All Managers"
                    searchPlaceholder="Search manager..."
                    className="w-full sm:w-[145px] h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all"
                  />
                  {user?.role !== 'CLIENT' && (
                    <SearchableSelect
                      options={clientOptions}
                      value={clientFilter}
                      onChange={setClientFilter}
                      placeholder="All Clients"
                      searchPlaceholder="Search client..."
                      className="w-full sm:w-[145px] h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all"
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
                    className="w-full sm:w-[145px] h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all font-semibold"
                  />

                </div>

                {/* Desktop Action Buttons */}
                {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      className="h-11 px-5 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary font-medium transition-all flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Import Excel</span>
                    </Button>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-[145px] px-4 h-11 rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
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
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Timeline</TableHead>
                      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && <TableHead>Budget</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project, idx) => {
                      const rowColor = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                      const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNING;
                      return (
                        <TableRow
                          key={project.id}
                          className="cursor-pointer transition-all hover:scale-[1.002]"
                          style={{ borderLeft: `4px solid ${rowColor} `, background: `${rowColor} 0d` }}
                          onClick={() => {
                            setSelectedOverviewProject(project);
                            setShowOverviewDialog(true);
                          }}
                        >
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {project.description.replace(/<[^>]*>/g, '')}
                                </p>
                              )}
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
                            {project.manager ? (
                              <div className="text-sm">
                                <p className="font-medium">{project.manager.name}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              <p>{formatDate(project.startDate)}</p>
                              {project.endDate && <p>to {formatDate(project.endDate)}</p>}
                            </div>
                          </TableCell>
                          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                            <TableCell>
                              {project.totalBudget ? (
                                <span className="text-sm font-bold" style={{ color: rowColor }}>
                                  {formatCurrency(Number(project.totalBudget))}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <span
                              className="text-xs font-bold px-2 py-1 rounded-full"
                              style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border} ` }}
                            >
                              {project.status.replace('_', ' ')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${rowColor} 25`, color: rowColor }}
                            >
                              {project._count.tasks}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(project)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(project.id, project.name)}
                                  className="text-destructive hover:text-destructive/90"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
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
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {project.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
                        >
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {project.manager && <span>👤 {project.manager.name}</span>}
                        {project.client && <span style={{ color: rowColor }}>🏢 {project.client.name}</span>}
                        <span style={{ color: rowColor }}>📋 {project._count.tasks} tasks</span>
                        {project.totalBudget && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                          <span className="font-bold" style={{ color: rowColor }}>{formatCurrency(Number(project.totalBudget))}</span>
                        )}
                      </div>
                      {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
                        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleEdit(project)}>
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={() => handleDelete(project.id, project.name)}>
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
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
    </div>
  );
};

export default ProjectsList;