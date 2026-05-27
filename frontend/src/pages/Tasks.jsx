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
import { Edit2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImportTasksDialog from '@/components/ImportTasksDialog';

const PROJECT_COLORS = [
  '#48A111', // SSPL Green
  '#00A3FF', // Sky Blue
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#D946EF', // Fuchsia
  '#10B981', // Emerald
];

const getProjectColor = (projectId, projects = []) => {
  const index = projects.findIndex(p => p.id === projectId);
  if (index === -1) return '#111113'; // Default dark
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
};

const getContrastColor = (hexColor) => {
  if (!hexColor || hexColor === '#111113') return '#FFFFFF';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const getTaskProgress = (task) => {
  if (task.status === 'COMPLETED') return 100;
  if (task.completionPercentage > 0) return task.completionPercentage;
  if (task.status === 'IN_REVIEW') return 75;
  if (task.status === 'IN_PROGRESS') return 50;
  return 0;
};

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
    if (user?.role === 'CLIENT') return;
    if (user?.role === 'MEMBER' && !task.project?.allowMemberTaskCreation) return;
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
    { value: 'URGENT', label: 'Urgent' },
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
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to a project.
              </DialogDescription>
            </DialogHeader>
            <CreateTaskForm
              projects={projects.filter(p => user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER')}
              users={users}
              onSuccess={handleTaskCreated}
              onCancel={() => setShowCreateDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-[700px] max-h-[95vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-4 sm:p-6 flex-1 w-full relative">
            <DialogHeader className="mb-2 sm:mb-4">
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details, assignments, or story points.
              </DialogDescription>
            </DialogHeader>
            <CreateTaskForm
              projects={projects.filter(p => user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER')}
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
          <div className="bg-secondary/20 backdrop-blur-md p-2 rounded-2xl mb-6 mt-4 shadow-inner border border-white/5 shadow-xl">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-row items-center gap-2 w-full xl:w-auto">
                <Button
                  variant="outline"
                  className={`h-10 w-10 p-0 md:hidden rounded-xl border-border/40 ${showFiltersMobile ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground'}`}
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                {/* Mobile Action Button */}
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MEMBER') && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="w-10 h-10 p-0 md:hidden rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto flex-1 justify-end">
                <div className={`flex-col md:flex-row flex-wrap items-center gap-2 w-full md:w-auto ${showFiltersMobile ? 'flex' : 'hidden md:flex'}`}>
                  <SearchableSelect
                    options={[{ value: 'all', label: 'All Projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                    value={projectFilter}
                    onChange={(val) => setProjectFilter(val || 'all')}
                    placeholder="Project"
                    className="w-full md:w-[140px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    options={managerOptions}
                    value={managerFilter}
                    onChange={setManagerFilter}
                    placeholder="Manager"
                    className="w-full md:w-[140px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    options={priorityOptions}
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    placeholder="Priority"
                    className="w-full md:w-[130px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                  <SearchableSelect
                    options={typeOptions}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    placeholder="Type"
                    className="w-full md:w-[130px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
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
                    className="w-full md:w-[130px] h-10 rounded-xl bg-background/50 border-border/40 hover:bg-background transition-all"
                  />
                </div>

                {/* Desktop Action Buttons */}
                {(() => {
                  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || 
                    (user?.role === 'MEMBER' && projects.some(p => p.allowMemberTaskCreation));
                  return canCreate ? (
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary font-medium transition-all flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="hidden xl:inline">Import Excel</span>
                    </Button>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="min-w-[130px] px-5 h-10 rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] font-bold Montserrat text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span>New Task</span>
                    </Button>
                  </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%] text-center">TASK</TableHead>
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
                      filteredTasks.map((task, index) => (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer hover:bg-accent transition-colors group border-b border-border hover:z-50 relative"
                          onClick={() => handleTaskClick(task)}
                        >
                          <TableCell className="relative">
                            <div className="flex items-center justify-start text-left pl-10 pr-6 w-full min-h-[2rem]">
                              <div
                                className="absolute left-4 w-1.5 h-1.5 rounded-full shadow-[0_0_8px] shrink-0"
                                style={{
                                  backgroundColor: task.status === 'TODO' ? '#F59E0B' :
                                    task.status === 'IN_PROGRESS' ? '#00A3FF' :
                                      task.status === 'IN_REVIEW' ? '#D946EF' :
                                        task.status === 'COMPLETED' ? '#48A111' : '#EF4444'
                                }}
                              />
                              <p className="font-bold Montserrat leading-tight text-foreground group-hover:text-primary transition-colors">{task.title}</p>
  
                              {/* Styled Custom Tooltip */}
                              {task.description && (
                                <div className={cn(
                                  "absolute left-6 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 pointer-events-none transition-all duration-300 z-[100] invisible group-hover:visible",
                                  index === 0 ? "top-full mt-2" : "bottom-full mb-2"
                                )}>
                                  <div 
                                    className="text-xs rounded-xl shadow-2xl p-3 w-64 break-words whitespace-normal text-left font-bold leading-relaxed tracking-wide border border-white/10"
                                    style={{ 
                                      backgroundColor: getProjectColor(task.project?.id, projects),
                                      color: getContrastColor(getProjectColor(task.project?.id, projects))
                                    }}
                                  >
                                    {task.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}
                                  </div>
                                  <div 
                                    className={cn(
                                      "absolute w-3 h-3 border-white/10 rotate-45",
                                      index === 0 ? "-top-1.5 left-6 border-t border-l" : "-bottom-1.5 left-6 border-b border-r"
                                    )}
                                    style={{ backgroundColor: getProjectColor(task.project?.id, projects) }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        <TableCell className="text-xs font-medium Montserrat text-gray-400">{task.project.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.assignees && task.assignees.length > 0 ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                {task.assignees.slice(0, 3).map(({ user }) => (
                                  <div key={user.id} className="flex items-center gap-2 bg-secondary/20 pr-3 rounded-full border border-border/50">
                                    <Avatar className="h-7 w-7 border border-[#0A0A0A] ring-1 ring-white/10">
                                      <AvatarImage src={user.avatar} />
                                      <AvatarFallback className="text-[10px] bg-white/5 text-gray-400">{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[11px] font-bold text-foreground whitespace-nowrap">{user.name}</span>
                                  </div>
                                ))}
                                {task.assignees.length > 3 && (
                                  <div className="h-7 px-2 rounded-full bg-white/5 border border-[#0A0A0A] flex items-center justify-center text-[10px] text-gray-400 Montserrat font-bold">
                                    +{task.assignees.length - 3} more
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
                                  width: `${getTaskProgress(task)}%`,
                                  backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF',
                                  boxShadow: `0 0 8px ${task.status === 'COMPLETED' ? '#48A11160' : '#00A3FF60'}`
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-black Montserrat text-gray-500 block text-right">
                              {getTaskProgress(task)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {(() => {
                              const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || (user?.role === 'MEMBER' && task.project?.allowMemberTaskCreation);
                              if (user?.role === 'CLIENT') return null;
                              
                              if (!canEdit) {
                                return (
                                  <div className="flex items-center justify-center h-8 w-8 text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 rounded-md" title="Restricted - No permission to edit">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                );
                              }

                              return (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskClick(task);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(task);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              );
                            })()}
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
                    <div className="flex flex-col gap-3 relative">
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
                          <p className="font-bold text-sm text-foreground leading-tight pr-2">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(() => {
                            const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || (user?.role === 'MEMBER' && task.project?.allowMemberTaskCreation);
                            if (user?.role === 'CLIENT') return null;
                            
                            if (!canEdit) {
                              return (
                                <div className="flex items-center justify-center h-8 w-8 text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 rounded-md" title="Restricted - No permission to edit">
                                  <Lock className="w-4 h-4" />
                                </div>
                              );
                            }

                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(task);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>📁</span>
                          <span className="truncate max-w-[130px] font-medium">{task.project.name}</span>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5">
                            <span>📅</span>
                            <span className="font-medium">{formatDate(task.dueDate)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm border border-black/5 ${statusColors[task.status] || ''}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{getTaskProgress(task)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{
                            width: `${getTaskProgress(task)}%`,
                            backgroundColor: task.status === 'COMPLETED' ? '#48A111' : '#00A3FF'
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