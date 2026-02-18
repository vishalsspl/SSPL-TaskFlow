import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/Modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, statusColors, priorityColors } from '@/lib/utils';
import {
  Plus,
  X,
  CheckSquare,
  Layers,
  User,
  Activity,
  AlertCircle,
  Calendar,
  Tag,
  AlignLeft,
  Briefcase
} from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [phases, setPhases] = useState([]);
  const [formData, setFormData] = useState({
    projectId: '',
    phaseId: '',
    title: '',
    description: '',
    assignedTo: '',
    status: 'TODO',
    priority: 'MEDIUM',
    completionPercentage: 0,
    dueDate: '',
    tags: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [filter, projectFilter]);

  const fetchTasks = async () => {
    try {
      const params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      if (projectFilter !== 'all') {
        params.projectId = projectFilter;
      }
      const response = await api.get('/tasks', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      // Filter out CLIENT role users - only show team members for task assignment
      const teamMembers = response.data.filter(user => user.role !== 'CLIENT');
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchPhases = async (projectId) => {
    if (!projectId) {
      setPhases([]);
      return;
    }
    try {
      const response = await api.get(`/projects/${projectId}`);
      setPhases(response.data.phases || []);
    } catch (error) {
      console.error('Failed to fetch phases:', error);
    }
  };

  const handleProjectChange = (projectId) => {
    setFormData({ ...formData, projectId, phaseId: '' });
    fetchPhases(projectId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        completionPercentage: Number(formData.completionPercentage),
      };

      await api.post('/tasks', payload);

      setShowCreateModal(false);
      setFormData({
        projectId: '',
        phaseId: '',
        title: '',
        description: '',
        assignedTo: '',
        status: 'TODO',
        priority: 'MEDIUM',
        completionPercentage: 0,
        dueDate: '',
        tags: '',
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task: ' + (error.response?.data?.error || error.message));
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  const handleProgressUpdate = async (taskId, newPercentage) => {
    try {
      await api.patch(`/tasks/${taskId}/progress`, { completionPercentage: newPercentage });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Tasks</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage tasks across all projects
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90 shadow-md">
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
        </div>

        {/* Create Task Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Task"
          size="xl"
          className="max-w-4xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-4 space-y-2">
                <Label htmlFor="title" className="text-gray-700 font-medium">Task Title <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <CheckSquare className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Design Homepage"
                    required
                    className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Row 2: Drops */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="project" className="text-gray-700 font-medium">Project <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    id="project"
                    value={formData.projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="phase" className="text-gray-700 font-medium">Phase</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    id="phase"
                    value={formData.phaseId}
                    onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                    disabled={!formData.projectId}
                  >
                    <option value="">Select Phase (Optional)</option>
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3 - 4 columns */}
              <div className="space-y-2">
                <Label htmlFor="assignee" className="text-gray-700 font-medium">Assign To</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    id="assignee"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-700 font-medium">Status</Label>
                <div className="relative">
                  <Activity className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-gray-700 font-medium">Priority</Label>
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-gray-700 font-medium">Due Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-2">
                <Label htmlFor="tags" className="text-gray-700 font-medium">Tags</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Comma separated tags (e.g. design, urgent)"
                    className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-2">
                <Label htmlFor="description" className="text-gray-700 font-medium">Description (Optional)</Label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:ring-2 focus:ring-primary/20"
                    placeholder="Task details..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="hover:bg-gray-50">
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 shadow-md">Create Task</Button>
            </div>
          </form>
        </Modal>

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[15%]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{task.project.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {task.assignee ? (
                            <>
                              {task.assignee.avatar && (
                                <img
                                  src={task.assignee.avatar}
                                  alt={task.assignee.name}
                                  className="w-6 h-6 rounded-full mr-2"
                                />
                              )}
                              <span>{task.assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-offset-1 cursor-pointer ${task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'IN_REVIEW' ? 'bg-purple-100 text-purple-800' :
                                task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                            }`}
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="IN_REVIEW">IN REVIEW</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(task.dueDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={task.completionPercentage}
                            onChange={(e) => handleProgressUpdate(task.id, Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <span className="text-xs font-medium w-8 text-right">
                            {task.completionPercentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tasks;
