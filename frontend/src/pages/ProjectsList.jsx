import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
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
import { Plus, FolderKanban, Eye, Edit2, Trash2, Search, Filter, Layers } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect } from '@/components/ui/searchable-select';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';

const ProjectsList = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [managerFilter, setManagerFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
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
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      totalBudget: project.totalBudget || '',
      status: project.status,
      category: project.category || 'INTERNAL',
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
    try {
      const submitData = {
        ...formData,
        clientId: formData.clientId || undefined,
        managerId: formData.managerId || undefined,
        totalBudget: formData.totalBudget && formData.totalBudget !== '' ? formData.totalBudget : undefined,
      };

      await api.put(`/ projects / ${editingProject.id} `, submitData);
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
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesManager = managerFilter ? project.manager?.id === managerFilter : true;
    const matchesClient = clientFilter ? project.client?.id === clientFilter : true;
    const matchesStatus = statusFilter === 'ALL' ? true : project.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' ? true : project.category === categoryFilter;

    return matchesSearch && matchesManager && matchesClient && matchesStatus && matchesCategory;
  });

  const managerOptions = [
    { label: 'All Managers', value: '' },
    ...users
      .filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
      .map(u => ({ label: u.name, value: u.id }))
  ];

  const clientOptions = [
    { label: 'All Clients', value: '' },
    ...users
      .filter(u => u.role === 'CLIENT')
      .map(u => ({ label: u.name, value: u.id }))
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage and track all your projects
          </p>
        </div>
        {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to your workspace. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <CreateProjectForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Project description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Project Type *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value, clientId: value === 'INTERNAL' ? '' : formData.clientId })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Internal Project</SelectItem>
                      <SelectItem value="CLIENT">Client Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.category === 'CLIENT' && (
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role === 'CLIENT').map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerId">Manager</Label>
                <Select
                  value={formData.managerId}
                  onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER').map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    onFocus={(e) => e.target.showPicker()}
                    onClick={(e) => e.target.showPicker()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    onFocus={(e) => e.target.showPicker()}
                    onClick={(e) => e.target.showPicker()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalBudget">Budget</Label>
                  <Input
                    id="totalBudget"
                    type="number"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="w-full sm:w-[250px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <SearchableSelect
              options={managerOptions}
              value={managerFilter}
              onChange={setManagerFilter}
              placeholder="All Managers"
              searchPlaceholder="Search manager..."
              className="w-full sm:w-[200px]"
            />
            <SearchableSelect
              options={clientOptions}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="w-full sm:w-[200px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Filter Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <SelectValue placeholder="Project Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No projects found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Budget</TableHead>
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
                        onClick={() => navigate(`/ projects / ${project.id} `)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-semibold text-white">{project.name}</p>
                            {project.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {project.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                            <div className="flex gap-1 mt-1">
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: `${rowColor} 25`, color: rowColor, border: `1px solid ${rowColor} ` }}
                              >
                                {project.category === 'CLIENT' ? 'Client' : 'Internal'}
                              </span>
                            </div>
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
                        <TableCell>
                          {project.totalBudget ? (
                            <span className="text-sm font-bold" style={{ color: rowColor }}>
                              {formatCurrency(Number(project.totalBudget))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
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
          )}
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
    </div>
  );
};

export default ProjectsList;
