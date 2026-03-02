import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, priorityColors, statusColors } from '@/lib/utils';
import {
  Plus,
  CheckSquare,
  Layers,
  User,
  Activity,
  AlertCircle,
  Calendar,
  Tag,
  AlignLeft,
  Briefcase,
  Search,
  Filter,
  Trash2
} from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuthStore } from '@/store/authStore';
import CreateTaskForm from '@/components/CreateTaskForm';
import Pagination from '@/components/Pagination';

const Tasks = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [phases, setPhases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [filter, projectFilter, pagination.page]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filter !== 'all') {
        params.status = filter;
      }
      if (projectFilter !== 'all') {
        params.projectId = projectFilter;
      }
      const response = await api.get('/tasks', { params });
      setTasks(response.data.data);
      setPagination(prev => ({
        ...prev,
        ...response.data.meta
      }));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects', { params: { limit: 100 } });
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { teamOnly: 'true', limit: 100 } });
      // Filter out CLIENT role users - only show team members for task assignment
      const teamMembers = response.data.data.filter(user => user.role !== 'CLIENT');
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // handleProjectChange no longer needed in parent


  const handleTaskCreated = () => {
    setShowCreateDialog(false);
    fetchTasks();
  };

  const handleTaskClick = (task) => {
    if (user?.role === 'CLIENT' || user?.role === 'MEMBER') return;
    setSelectedTask(task);
    setShowEditDialog(true);
  };

  const handleTaskUpdated = () => {
    setShowEditDialog(false);
    setSelectedTask(null);
    fetchTasks();
  };

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

  const handleDelete = (e, task) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      toast({
        title: "Task Deleted",
        description: "The task has been removed successfully.",
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Delete Failed",
        description: error.response?.data?.error || "Failed to delete task.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  // Build a lookup: projectId → manager info (from the projects list we already fetch)
  const projectManagerMap = new Map(
    projects.filter(p => p.manager).map(p => [p.id, p.manager])
  );

  // Derive unique managers from projects
  const managerOptions = [
    { value: '', label: 'All Managers' },
    ...Array.from(
      new Map(
        projects
          .filter(p => p.manager)
          .map(p => [p.manager.id, { value: p.manager.id, label: p.manager.name }])
      ).values()
    ),
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' },
  ];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    const manager = projectManagerMap.get(task.project?.id);
    const matchesManager = !managerFilter || manager?.id === managerFilter;

    // Filter for Members: only show assigned tasks
    const isMember = user?.role === 'MEMBER';
    const isAssignedToMe = task.assignees?.some(a => a.userId === user?.id);
    if (isMember && !isAssignedToMe) return false;

    return matchesSearch && matchesPriority && matchesManager;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <p className="text-muted-foreground">
            View and manage tasks across all projects
          </p>
        </div>
        {user?.role !== 'CLIENT' && user?.role !== 'MEMBER' && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Button>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to a project.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={projects}
            users={users}
            onSuccess={handleTaskCreated}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details, assignments, or story points.
            </DialogDescription>
          </DialogHeader>
          <CreateTaskForm
            projects={projects}
            users={users}
            task={selectedTask}
            onSuccess={handleTaskUpdated}
            onCancel={() => {
              setShowEditDialog(false);
              setSelectedTask(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks List</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks..."
                className="pl-8 w-full sm:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <SearchableSelect
              options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
              value={projectFilter}
              onChange={(val) => setProjectFilter(val || 'all')}
              placeholder="All Projects"
              searchPlaceholder="Search project..."
              className="w-full sm:w-[200px]"
            />
            <SearchableSelect
              options={managerOptions}
              value={managerFilter}
              onChange={setManagerFilter}
              placeholder="All Managers"
              searchPlaceholder="Search manager..."
              className="w-full sm:w-[200px]"
            />
            <SearchableSelect
              options={priorityOptions}
              value={priorityFilter}
              onChange={setPriorityFilter}
              placeholder="All Priorities"
              searchPlaceholder="Search priority..."
              className="w-full sm:w-[160px]"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Activity className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[15%]">Progress</TableHead>
                <TableHead className="w-[10%] text-right text-gray-400 font-black uppercase tracking-widest Montserrat">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-white/5 transition-colors group border-b border-white/5"
                    onClick={() => handleTaskClick(task)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px]"
                          style={{
                            backgroundColor: task.status === 'TODO' ? '#F59E0B' :
                              task.status === 'IN_PROGRESS' ? '#00A3FF' :
                                task.status === 'IN_REVIEW' ? '#D946EF' :
                                  task.status === 'COMPLETED' ? '#48A111' : '#EF4444'
                          }}
                        />
                        <div>
                          <p className="font-bold Montserrat leading-tight text-white group-hover:text-primary transition-colors">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 Montserrat">
                              {task.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium Montserrat text-gray-400">{task.project.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="flex -space-x-2">
                            {task.assignees.slice(0, 3).map(({ user }) => (
                              <Avatar key={user.id} className="h-7 w-7 border-2 border-[#0A0A0A] ring-1 ring-white/10">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-[10px] bg-white/5 text-gray-400">{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                            {task.assignees.length > 3 && (
                              <div className="h-7 w-7 rounded-full bg-white/5 border-2 border-[#0A0A0A] flex items-center justify-center text-[10px] text-gray-400 Montserrat font-bold">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest Montserrat">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${statusColors[task.status] || ''}`}>
                        {task.status.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${priorityColors[task.priority]} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-black Montserrat text-white">
                      {task.storyPoints || 0}
                    </TableCell>
                    <TableCell className="text-[11px] font-bold Montserrat text-gray-500">{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${task.completionPercentage}%`,
                              backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF',
                              boxShadow: `0 0 8px ${task.status === 'COMPLETED' ? '#48A11160' : '#00A3FF60'}`
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-black Montserrat text-gray-500 block text-right">
                          {task.completionPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => handleDelete(e, task)}
                        title="Delete Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination
            meta={pagination}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Task?"
        description={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
      />
    </div>
  );
};

export default Tasks;
