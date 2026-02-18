import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Plus, FolderKanban, Eye, Edit2, Trash2, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const ProjectsList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
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
  });

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
    });
    setShowEditForm(true);
  };

  const handleDelete = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to delete project "${projectName}"? This will also delete all related tasks and phases.`)) {
      return;
    }

    try {
      await api.delete(`/projects/${projectId}`);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project: ' + (error.response?.data?.error || error.message));
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
      
      await api.put(`/projects/${editingProject.id}`, submitData);
      setShowEditForm(false);
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
      });
      fetchProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancel = () => {
    setShowEditForm(false);
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
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      PLANNING: 'bg-gray-100 text-gray-700',
      ACTIVE: 'bg-green-100 text-green-700',
      ON_HOLD: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status] || colors.PLANNING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track all your projects
            </p>
          </div>
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Edit Form */}
        {showEditForm && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Project</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientId">Client</Label>
                    <select
                      id="clientId"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Client</option>
                      {users.filter(u => u.role === 'CLIENT').map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="managerId">Manager</Label>
                    <select
                      id="managerId"
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Manager</option>
                      {users.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER').map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>

                  <div>
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

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Project</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects Table */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first project
              </p>
              <Button className="mt-4" onClick={() => navigate('/projects/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tasks/Phases</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{project.name}</p>
                          {project.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">{project.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.client ? (
                          <div className="text-sm">
                            <p className="font-medium">{project.client.name}</p>
                            <p className="text-gray-500 text-xs">{project.client.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No client</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.manager ? (
                          <div className="text-sm">
                            <p className="font-medium">{project.manager.name}</p>
                            <p className="text-gray-500 text-xs">{project.manager.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No manager</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          <p>{formatDate(project.startDate)}</p>
                          <p className="text-xs text-gray-500">to {formatDate(project.endDate)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.totalBudget ? (
                          <span className="text-sm font-medium">
                            {formatCurrency(Number(project.totalBudget))}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {project._count.tasks} tasks / {project._count.phases} phases
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(project)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(project.id, project.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProjectsList;
