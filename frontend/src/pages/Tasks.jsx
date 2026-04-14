import { useState, useEffect, useCallback, useRef } from 'react';
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
import { formatDate, priorityColors, statusColors, taskTypeColors } from '@/lib/utils';
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
  Trash2,
  Bug,
  Zap,
  BookOpen,
  GitBranch,
  FileSpreadsheet,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import CreateTaskForm from '@/components/forms/CreateTaskForm';
import TablePagination from '@/components/ui/table-pagination';
import { useToast } from "@/hooks/use-toast";
import { useTimerStore } from '@/store/timerStore';
import { Clock } from 'lucide-react';
import ImportTasksDialog from '@/components/ImportTasksDialog';

const Tasks = () => {
  const { user } = useAuthStore();
  const { setHeader, searchTerm: globalSearch, setSearchTerm: setGlobalSearch } = useHeaderStore();
  const { toast } = useToast();
  const startTimer = useTimerStore(state => state.startTimer);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [phases, setPhases] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Mobile filters toggle
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

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
    setHeader("Tasks", "View and manage tasks across all projects", true, "Search tasks...");
    // Clear search when leaving tasks page? 
    // Maybe better to keep it if they return, but for now we just want to show it.
    return () => {
      // We could clear search here if we wanted: setGlobalSearch('');
    };
  }, [setHeader]);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [filter, projectFilter, priorityFilter, typeFilter, page, pageSize, debouncedSearch]);

  const fetchTasks = async () => {
    try {
      const params = { page, limit: pageSize };
      if (filter !== 'all') {
        params.status = filter;
      }
      if (projectFilter !== 'all') {
        params.projectId = projectFilter;
      }
      if (priorityFilter) {
        params.priority = priorityFilter;
      }
      if (typeFilter) {
        params.type = typeFilter;
      }
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      
      // Fix: Filter by assignedTo on backend for Members to ensure correct pagination
      if (user?.role === 'MEMBER') {
        params.assignedTo = user.id;
      }

      const response = await api.get('/tasks', { params });
      setTasks(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.total);
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
      const response = await api.get('/users', { params: { teamOnly: 'true' } });
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
    if (user?.role === 'CLIENT' || user?.role === 'MEMBER') return;
    setSelectedTask(task);
    setShowEditDialog(true);
  };

  const handleDelete = (task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      toast({
        title: "Task Deleted",
        description: `Task "${taskToDelete.title}" has been removed.`,
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

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'TASK', label: 'Task' },
    { value: 'BUG', label: 'Bug' },
    { value: 'STORY', label: 'Story' },
    { value: 'EPIC', label: 'Epic' },
    { value: 'SUBTASK', label: 'Subtask' },
  ];

  const filteredTasks = tasks.filter(task => {
    // Search and priority filtering now done on backend
    const manager = projectManagerMap.get(task.project?.id);
    const matchesManager = !managerFilter || manager?.id === managerFilter;

    // Frontend filtering for Members is no longer needed as it's handled on the backend
    return matchesManager;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 p-0 pt-0 gap-4">

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
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
          </div>
        </DialogContent>
      </Dialog>

      <Card className="flex-1 flex flex-col min-h-0 border-none sm:border shadow-none sm:shadow-sm">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-2 sm:pt-4 px-1 sm:px-4">
          <div className="bg-secondary/20 backdrop-blur-md p-4 rounded-2xl mb-6 mt-4 mx-2 border border-white/5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center gap-3 flex-1 w-full">
                <div className={`flex flex-wrap items-center gap-2 w-full ${showFiltersMobile ? 'flex' : 'hidden md:flex'}`}>
                  <SearchableSelect
                    options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                    value={projectFilter}
                    onChange={(val) => setProjectFilter(val || 'all')}
                    placeholder="Project"
                    className="w-[130px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    options={managerOptions}
                    value={managerFilter}
                    onChange={setManagerFilter}
                    placeholder="Manager"
                    className="w-[130px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    options={priorityOptions}
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    placeholder="Priority"
                    className="w-[120px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    options={typeOptions}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    placeholder="Type"
                    className="w-[120px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { label: 'All Status', value: 'all' },
                      { label: 'To Do', value: 'TODO' },
                      { label: 'In Progress', value: 'IN_PROGRESS' },
                      { label: 'In Review', value: 'IN_REVIEW' },
                      { label: 'Completed', value: 'COMPLETED' }
                    ]}
                    placeholder="Status"
                    className="w-[120px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                <Button
                  variant="outline"
                  className={`h-10 w-10 p-0 md:hidden rounded-xl border-border/40 ${showFiltersMobile ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground'}`}
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                
                {user?.role !== 'CLIENT' && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      className="h-10 px-5 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary font-medium transition-all flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden lg:inline">Import Excel</span>
                    </Button>
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="h-10 px-5 rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] font-bold Montserrat text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span>New Task</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="whitespace-nowrap">Task Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-[15%]">Progress</TableHead>
                    <TableHead className="text-right pr-6">{user?.role !== 'CLIENT' ? 'Actions' : ''}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-accent transition-colors group border-b border-border"
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
                              <p className="font-bold Montserrat leading-tight text-foreground group-hover:text-primary transition-colors">{task.title}</p>
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
                          <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase flex items-center gap-1 w-fit`}>
                            {task.type === 'BUG' && <Bug className="w-2.5 h-2.5" />}
                            {task.type === 'STORY' && <BookOpen className="w-2.5 h-2.5" />}
                            {task.type === 'EPIC' && <Zap className="w-2.5 h-2.5" />}
                            {task.type === 'SUBTASK' && <GitBranch className="w-2.5 h-2.5" />}
                            {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-2.5 h-2.5" />}
                            {task.type || 'TASK'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${priorityColors[task.priority]} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase`}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-black Montserrat text-foreground">
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
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {user?.role !== 'CLIENT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startTimer(task.id, task.project.id, task.title);
                                }}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}
                            {user?.role !== 'CLIENT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(task);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="sm:hidden space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No tasks found</div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-border bg-card cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{
                            backgroundColor: task.status === 'TODO' ? '#F59E0B' :
                              task.status === 'IN_PROGRESS' ? '#00A3FF' :
                                task.status === 'IN_REVIEW' ? '#D946EF' :
                                  task.status === 'COMPLETED' ? '#48A111' : '#EF4444'
                          }}
                        />
                        <p className="font-bold text-sm text-foreground leading-tight truncate">{task.title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {user?.role !== 'CLIENT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              startTimer(task.id, task.project.id, task.title);
                            }}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                        {user?.role !== 'CLIENT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(task);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Badge className={`${priorityColors[task.priority]} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shrink-0`}>
                          {task.priority}
                        </Badge>
                        <Badge className={`${taskTypeColors[task.type || 'TASK']} border-0 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase shrink-0 flex items-center gap-1`}>
                          {task.type === 'BUG' && <Bug className="w-2 h-2" />}
                          {task.type === 'STORY' && <BookOpen className="w-2 h-2" />}
                          {task.type === 'EPIC' && <Zap className="w-2 h-2" />}
                          {task.type === 'SUBTASK' && <GitBranch className="w-2 h-2" />}
                          {(task.type === 'TASK' || !task.type) && <CheckSquare className="w-2 h-2" />}
                          {task.type || 'TASK'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span>📁 {task.project.name}</span>
                      {task.dueDate && <span>📅 {formatDate(task.dueDate)}</span>}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusColors[task.status] || ''}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{task.completionPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${task.completionPercentage}%`,
                            backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF',
                          }}
                        />
                      </div>
                    </div>
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

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete task "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
      <ImportTasksDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={fetchTasks}
      />
    </div>
  );
};

export default Tasks;