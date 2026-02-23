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
import { formatDate, priorityColors } from '@/lib/utils';
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
  Filter
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuthStore } from '@/store/authStore';
import CreateTaskForm from '@/components/CreateTaskForm';

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

  // handleProjectChange no longer needed in parent


  const handleTaskCreated = () => {
    setShowCreateDialog(false);
    fetchTasks();
  };

  const handleTaskClick = (task) => {
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
          <h2 className="text-3xl font-bold tracking-tight">All Tasks</h2>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleTaskClick(task)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {task.description.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{task.project.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {task.assignees && task.assignees.length > 0 ? (
                          task.assignees.map(({ user }) => (
                            <div key={user.id} className="flex items-center gap-1" title={user.name}>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                        {task.assignees?.length > 0 && (
                          <span className="text-sm text-muted-foreground ml-1">
                            {task.assignees.map(a => a.user.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusUpdate(task.id, value)}
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                        disabled={user?.role === 'CLIENT' || user?.role === 'MEMBER'}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="IN_REVIEW">In Review</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="BLOCKED">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {task.storyPoints || 0}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={task.completionPercentage}
                          onChange={(e) => handleProgressUpdate(task.id, Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()} // Prevent row click
                          disabled={user?.role === 'CLIENT' || user?.role === 'MEMBER'}
                          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};

export default Tasks;
